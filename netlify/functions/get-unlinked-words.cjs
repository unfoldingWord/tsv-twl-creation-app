/**
 * Netlify Function to get all unlinked words for a user from DynamoDB
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

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

exports.handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { userIdentifier } = event.queryStringParameters || {};

    console.log('🔗 [UNLINK-WORDS] Fetching unlinked words, userIdentifier:', userIdentifier || 'all');
    console.log('🔗 [UNLINK-WORDS] Table:', process.env.TWL_DYNAMODB_TABLE_NAME);

    // Build scan parameters
    const scanParams = {
      TableName: process.env.TWL_DYNAMODB_TABLE_NAME,
    };

    // Add filters based on parameters
    if (userIdentifier) {
      scanParams.FilterExpression = 'userIdentifier = :userIdentifier';
      scanParams.ExpressionAttributeValues = {
        ':userIdentifier': userIdentifier,
      };
    }

    const result = await docClient.send(new ScanCommand(scanParams));

    console.log('🔗 [UNLINK-WORDS] Raw DynamoDB result count:', result.Items?.length || 0);

    // Transform items for client use
    const items = result.Items.map(item => ({
      id: `${item.origWords}|${item.twLink}`, // Create client-side ID
      book: item.book,
      reference: item.reference,
      origWords: item.originalOrigWords || item.origWords,
      twLink: item.originalTWLink || item.twLink,
      glQuote: item.glQuote,
      dateAdded: item.dateAdded,
      userIdentifier: item.userIdentifier, // Include userIdentifier field
    }));

    console.log('🔗 [UNLINK-WORDS] Returning', items.length, 'unlinked words');
    if (items.length > 0) {
      console.log('🔗 [UNLINK-WORDS] Sample item:', JSON.stringify(items[0], null, 2));
      // Filter to show only biblicaltimeday-related items for debugging
      const filteredBiblicalTimeday = items.filter(it => 
        (it.twLink && it.twLink.includes('biblicaltimeday')) ||
        (it.origWords && it.origWords.includes('biblicaltimeday'))
      );
      if (filteredBiblicalTimeday.length > 0) {
        console.log('🔗 [UNLINK-WORDS] Items with "biblicaltimeday":', filteredBiblicalTimeday.map(it => `${it.origWords}|${it.twLink}`));
      } else {
        console.log('🔗 [UNLINK-WORDS] No items found containing "biblicaltimeday"');
      }
    } else {
      console.log('🔗 [UNLINK-WORDS] No unlinked words found');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        items: items,
        count: items.length,
      }),
    };
  } catch (error) {
    console.error('Error getting unlinked words:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
