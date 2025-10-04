/**
 * Netlify Function to delete an unlinked word from DynamoDB
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.TWL_AWS_REGION,
  credentials: {
    accessKeyId: process.env.TWL_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.TWL_AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { origWords, twLink, userIdentifier } = JSON.parse(event.body);

    // Validate required fields
    if (!origWords || !twLink) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'origWords and twLink are required' }),
      };
    }

    // Normalize Hebrew text for consistent lookup
    const normalizeHebrewText = (text) => {
      if (!text) return '';

      // Remove Hebrew cantillation marks (Unicode range 0591-05BD)
      // and other Hebrew diacritical marks (05BF-05C7)
      // Also remove maqqef (־) and other punctuation that might interfere with matching
      return text
        .replace(/[\u0591-\u05BD\u05BF-\u05C7\u05BE\u05C0\u05C3\u05C6]/g, '')
        .replace(/[\u2000-\u200F\u2028-\u202F]/g, ' ') // Replace various Unicode spaces with regular space
        .replace(/\s+/g, ' ')
        .trim();
    };

    const normalizedOrigWords = normalizeHebrewText(origWords);
    const normalizedTWLink = twLink.trim();

    // Check if the item exists
    const getParams = {
      TableName: process.env.TWL_DYNAMODB_TABLE_NAME,
      Key: {
        origWords: normalizedOrigWords,
        twLink: normalizedTWLink,
      },
    };

    const existingItem = await docClient.send(new GetCommand(getParams));

    if (!existingItem.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Unlinked word not found' }),
      };
    }

    // Actually delete the item from the database
    const deleteParams = {
      TableName: process.env.TWL_DYNAMODB_TABLE_NAME,
      Key: {
        origWords: normalizedOrigWords,
        twLink: normalizedTWLink,
      },
    };

    await docClient.send(new DeleteCommand(deleteParams));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Unlinked word deleted successfully',
        deletedKey: {
          origWords: normalizedOrigWords,
          twLink: normalizedTWLink,
        },
      }),
    };
  } catch (error) {
    console.error('Error removing unlinked word:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
