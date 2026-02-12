/**
 * Netlify Function to get deleted row markers for a book from DynamoDB
 * Keys: book (PK), sortKey (SK) = `${reference}|${normalizedOrigWords}|${occurrence}`
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

exports.handler = async (event) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { book } = event.queryStringParameters || {};
    if (!book) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'book is required' }) };
    }

    console.log('🗑️  [DELETE-ROWS] Fetching deleted rows for book:', book);
    console.log('🗑️  [DELETE-ROWS] Table:', process.env.TWL_DYNAMODB_DELETED_TABLE_NAME);

    const result = await docClient.send(new QueryCommand({
      TableName: process.env.TWL_DYNAMODB_DELETED_TABLE_NAME,
      KeyConditionExpression: 'book = :b',
      ExpressionAttributeValues: {
        ':b': book.trim().toLowerCase(),
      },
    }));

    console.log('🗑️  [DELETE-ROWS] Raw DynamoDB result count:', result.Items?.length || 0);

    const items = (result.Items || []).map((it) => ({
      book: it.book,
      reference: it.reference,
      origWords: it.origWords,
      normalizedOrigWords: it.normalizedOrigWords,
      occurrence: it.occurrence,
      sortKey: it.sortKey,
      dateAdded: it.dateAdded,
    }));

    console.log('🗑️  [DELETE-ROWS] Returning', items.length, 'deleted rows');
    if (items.length > 0) {
      console.log('🗑️  [DELETE-ROWS] Sample item:', JSON.stringify(items[0], null, 2));
      // Filter to show only 1:3 references for debugging
      const filtered1_3 = items.filter(it => it.reference && it.reference.startsWith('1:3'));
      if (filtered1_3.length > 0) {
        console.log('🗑️  [DELETE-ROWS] Items for 1:3:', filtered1_3.map(it => `${it.reference}|${it.normalizedOrigWords}|${it.occurrence}`));
      } else {
        console.log('🗑️  [DELETE-ROWS] No items found with reference starting with 1:3');
      }
    } else {
      console.log('🗑️  [DELETE-ROWS] No deleted rows found for book:', book);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ items, count: items.length }) };
  } catch (error) {
    console.error('Error querying deleted rows:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

