const { Buffer } = require('buffer');

exports.handler = async (event, context) => {

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { content, name, email, message, book, userID, dcsHost: clientDcsHost } = JSON.parse(event.body);

    // Validation
    const errors = {};
    if (!name || name.trim().length < 3) errors.name = 'Name is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) errors.email = 'Valid email required.';
    if (!userID || !/^user-\d+$/.test(userID)) errors.userID = 'Invalid userID.';
    if (!book || typeof book !== 'string' || !book.trim() || book.length != 3) errors.book = 'Book ID is required.';
    if (!content || typeof content !== 'string' || !content.trim()) errors.content = 'Content is required.';
    if (Object.keys(errors).length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, errors })
      };
    }

    const repoOwner = 'unfoldingWord';
    const repoName = 'en_twl';
    const branch = `twl-creation-${userID}-${book.toUpperCase()}`;
    const filePath = `twl_${book.toUpperCase()}.tsv`;
    const commitMsg = message || `Created a new ${filePath} with the TWL Creation app`;
    const dcsToken = process.env.DCS_TOKEN;
    const dcsHost = clientDcsHost || process.env.DCS_HOST || 'https://git.door43.org';
    const baseUrl = `${dcsHost}/api/v1`;
    const headers = {
      'Authorization': `token ${dcsToken}`,
      'accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'TWL-Creation-App'
    };

    // 1. Check if branch exists
    let branchExists = false;
    let branchRes = await fetch(`${baseUrl}/repos/${repoOwner}/${repoName}/branches/${branch}`, { headers });
    if (branchRes.status === 404) {
      // 2. Create branch from master
      const createBranchRes = await fetch(`${baseUrl}/repos/${repoOwner}/${repoName}/branches`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          new_branch_name: branch,
          old_branch_name: 'master'
        })
      });
      if (createBranchRes.status !== 201) {
        const errText = await createBranchRes.text();
        return {
          statusCode: 500,
          body: JSON.stringify({ success: false, error: `Failed to create branch: ${errText}` })
        };
      }
    } else if (branchRes.ok) {
      branchExists = true;
    } else {
      const errText = await branchRes.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: `Failed to check branch: ${errText}` })
      };
    }

    // 3. Get file SHA (file must exist)
    const fileMetaRes = await fetch(`${baseUrl}/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`, { headers });
    if (!fileMetaRes.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: `File ${filePath} does not exist in branch ${branch}` })
      };
    }
    const fileMeta = await fileMetaRes.json();
    const sha = fileMeta.sha;

    // 4. PUT new content
    const contentBase64 = Buffer.from(content, 'utf8').toString('base64');
    const putPayload = {
      author: { email, name },
      branch,
      committer: { email, name },
      content: contentBase64,
      message: commitMsg,
      sha
    };
    const putRes = await fetch(`${baseUrl}/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(putPayload)
    });
    if (!putRes.ok) {
      const errText = await putRes.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: `Failed to update file: ${errText}` })
      };
    }

    // 5. Create PR if not exists
    let prUrl = '';
    let prNumber = 0;
    let prCreated = false;
    let prRes = await fetch(`${baseUrl}/repos/${repoOwner}/${repoName}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base: 'master',
        head: branch,
        assignee: 'richmahn',
        title: `Created a new ${filePath} with the TWL Creation app`,
        body: message || ''
      })
    });
    console.log("STATUS:", prRes.status)
    if (prRes.status === 201) {
      const prData = await prRes.json();
      console.log("prData", prData);
      prUrl = prData.url || '';
      prCreated = true;
      prNumber = prData.number;
    } else if (prRes.status === 409) {
      // PR already exists, extract issue_id from message
      const prData = await prRes.json();
      console.log("PR ALREADY EXISTS", prData);
      const msg = prData.message || '';
      const match = msg.match(/issue_id: (\d+)/);
      if (match) {
        const issueId = match[1];
        prUrl = `${dcsHost}/unfoldingWord/en_twl/pulls/${issueId}`;
      } else {
        prUrl = `${dcsHost}/unfoldingWord/en_twl/pulls`;
      }
      prCreated = false;
    } else {
      const errText = await prRes.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: `Failed to create PR: ${errText}` })
      };
    }

    // 6. Respond to client
    const body = JSON.stringify({
      success: true,
      branch,
      filePath,
      prUrl,
      prNumber,
      prCreated,
      message: prCreated
        ? `Successfully committed and created PR for ${filePath} in branch ${branch}.`
        : `Successfully committed to branch ${branch}. PR already exists for this branch.`,
    });
    console.log("Response body:", body);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body,
    };

  } catch (error) {
    console.error('Error in commit-to-dcs function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ success: false, error: error.message || 'An unexpected error occurred' })
    };
  }
};
