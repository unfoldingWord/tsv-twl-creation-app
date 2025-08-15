/**
 * Netlify Function to mark an unlinked word as removed in DynamoDB
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

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
      return text
        .replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '')
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

    // Update the item to mark as removed
    const updateParams = {
      TableName: process.env.TWL_DYNAMODB_TABLE_NAME,
      Key: {
        origWords: normalizedOrigWords,
        twLink: normalizedTWLink,
      },
      UpdateExpression: 'SET removed = :removed, lastModified = :lastModified, removedBy = :removedBy',
      ExpressionAttributeValues: {
        ':removed': true,
        ':lastModified': new Date().toISOString(),
        ':removedBy': userIdentifier || 'anonymous',
      },
      ReturnValues: 'ALL_NEW',
    };

    const result = await docClient.send(new UpdateCommand(updateParams));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Unlinked word marked as removed successfully',
        item: result.Attributes,
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
