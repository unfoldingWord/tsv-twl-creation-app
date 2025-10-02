/**
 * Netlify Function to add a deleted row marker to DynamoDB
 * Keys: book (PK), sortKey (SK) = `${reference}|${normalizedOrigWords}|${occurrence}`
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

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

// Normalize Hebrew text similar to unlink feature
const normalizeHebrewText = (text) => {
  if (!text) return '';
  return text
    .replace(/[\u0591-\u05BD\u05BF-\u05C7\u05BE\u05C0\u05C3\u05C6]/g, '')
    .replace(/[\u2000-\u200F\u2028-\u202F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

exports.handler = async (event) => {
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
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { book, reference, origWords, occurrence, userIdentifier } = JSON.parse(event.body || '{}');

    if (!book || !reference || !origWords || occurrence === undefined) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'book, reference, origWords, and occurrence are required' }) };
    }

    const normalizedOrigWords = normalizeHebrewText(origWords);
    const sortKey = `${reference}|${normalizedOrigWords}|${String(occurrence).trim()}`;

    const now = new Date().toISOString();
    const item = {
      book: book.trim().toLowerCase(),
      sortKey,
      reference,
      origWords, // original for display
      normalizedOrigWords,
      occurrence: String(occurrence).trim(),
      userIdentifier: userIdentifier || 'anonymous',
      dateAdded: now,
      lastModified: now,
    };

    await docClient.send(new PutCommand({
      TableName: process.env.TWL_DYNAMODB_DELETED_TABLE_NAME,
      Item: item,
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Deleted row marker added', item }) };
  } catch (error) {
    console.error('Error adding deleted row:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

