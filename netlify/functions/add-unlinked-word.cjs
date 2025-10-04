/**
 * Netlify Function to add an unlinked word to DynamoDB
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

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
  // Debug: Log environment variables (remove in production)
  console.log('Environment check:', {
    hasRegion: !!process.env.TWL_AWS_REGION,
    hasAccessKey: !!process.env.TWL_AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.TWL_AWS_SECRET_ACCESS_KEY,
    hasTableName: !!process.env.TWL_DYNAMODB_TABLE_NAME,
    region: process.env.TWL_AWS_REGION,
    tableName: process.env.TWL_DYNAMODB_TABLE_NAME
  });

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
    const { book, reference, origWords, twLink, glQuote, userIdentifier } = JSON.parse(event.body);

    // Validate required fields
    if (!origWords || !twLink) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'origWords and twLink are required' }),
      };
    }

    // Normalize Hebrew text for consistent storage
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

    // Check if this combination already exists
    const getParams = {
      TableName: process.env.TWL_DYNAMODB_TABLE_NAME,
      Key: {
        origWords: normalizedOrigWords,
        twLink: normalizedTWLink,
      },
    };

    const existingItem = await docClient.send(new GetCommand(getParams));

    // If item exists, return existing (no need to check 'removed' since we delete rows)
    if (existingItem.Item) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Word combination already exists',
          existing: true,
          item: existingItem.Item,
        }),
      };
    }

    // Create or update the item
    const timestamp = new Date().toISOString();

    // Remove DELETED prefix from reference if present
    const cleanReference = reference && reference.startsWith('DELETED ')
      ? reference.substring(8)
      : reference || '';

    const item = {
      origWords: normalizedOrigWords,
      twLink: normalizedTWLink,
      originalOrigWords: origWords, // Keep original for reference
      book: book || 'Unknown',
      reference: cleanReference,
      glQuote: glQuote || '',
      userIdentifier: userIdentifier || 'anonymous',
      dateAdded: timestamp,
      lastModified: timestamp,
    };

    const putParams = {
      TableName: process.env.TWL_DYNAMODB_TABLE_NAME,
      Item: item,
    };

    await docClient.send(new PutCommand(putParams));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Unlinked word added successfully',
        item: item,
        existing: false,
      }),
    };
  } catch (error) {
    console.error('Error adding unlinked word:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
