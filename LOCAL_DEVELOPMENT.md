# Local Development with DynamoDB

This guide explains how to test the DynamoDB integration locally.

## Prerequisites

1. **AWS credentials** set up (same as production)
2. **DynamoDB table** created in AWS (same table as production)
3. **Netlify CLI** installed globally

## Setup Steps

### 1. Install Netlify CLI (if not already installed)

```bash
npm install -g netlify-cli
```

### 2. Configure Local Environment Variables

Create/update `.env` file in the project root with your AWS credentials:

```env
TWL_AWS_ACCESS_KEY_ID=your_access_key_here
TWL_AWS_SECRET_ACCESS_KEY=your_secret_key_here
TWL_AWS_REGION=us-east-1
TWL_DYNAMODB_TABLE_NAME=twl-unlinked-words
```

⚠️ **Important**: Replace the placeholder values with your actual AWS credentials from the IAM user you created.

### 3. Available Development Commands

#### Option A: Full Netlify Development (Recommended)

```bash
pnpm run dev:netlify
```

This runs both the Vite dev server AND the Netlify functions locally.

#### Option B: Separate Processes

In one terminal:

```bash
pnpm dev
```

In another terminal:

```bash
pnpm run functions:serve
```

#### Option C: Standard Vite Only (Functions won't work)

```bash
pnpm dev
```

## Testing the Integration

### 1. Start Local Development

```bash
pnpm run dev:netlify
```

This will start:

- **Vite dev server** (usually on http://localhost:5173)
- **Netlify functions** (usually on http://localhost:8888/.netlify/functions/)

### 2. Test the Functions

#### Test Add Function:

```bash
curl -X POST http://localhost:8888/.netlify/functions/add-unlinked-word \
  -H "Content-Type: application/json" \
  -d '{
    "book": "Test Book",
    "reference": "1:1",
    "origWords": "test",
    "twLink": "rc://*/tw/dict/bible/test",
    "glQuote": "test word",
    "userIdentifier": "test-user"
  }'
```

#### Test Get Function:

```bash
curl "http://localhost:8888/.netlify/functions/get-unlinked-words?userIdentifier=test-user"
```

### 3. Test in the App

1. **Open the app** (usually http://localhost:5173)
2. **Generate a TWL** for any book
3. **Click unlink button** on any row
4. **Check browser console** for server response logs
5. **Open Unlinked Words Manager** to verify data

## Troubleshooting

### Common Issues:

1. **AWS Credentials Error**:

   - Verify your `.env` file has correct credentials
   - Ensure the IAM user has DynamoDB permissions

2. **Table Not Found**:

   - Verify `DYNAMODB_TABLE_NAME` matches your AWS table name
   - Ensure the table exists and is in the correct region

3. **CORS Errors**:

   - Make sure you're using `pnpm run dev:netlify` for full local development
   - Check that functions have proper CORS headers

4. **Function Not Found**:
   - Verify functions are in `netlify/functions/` directory
   - Check that Netlify CLI is properly configured

### Debug Steps:

1. **Check function logs**: Look at the terminal output when running `pnpm run dev:netlify`
2. **Test functions directly**: Use curl commands above
3. **Verify environment variables**: Check that `.env` values are loaded
4. **Check AWS console**: Verify data is being written to DynamoDB

## Production vs Local

### Key Differences:

- **Local**: Uses same DynamoDB table as production
- **Local**: Functions run on localhost:8888
- **Local**: Environment variables from `.env` file
- **Production**: Functions run on Netlify edge
- **Production**: Environment variables from Netlify dashboard

### Safety Notes:

- **Same data**: Local development uses the same DynamoDB table as production
- **User isolation**: Different users won't see each other's data
- **Test data**: Consider creating test entries that can be easily identified/removed

## Next Steps

1. **Test all functionality** locally before deploying
2. **Verify AWS charges**: Monitor DynamoDB usage in AWS console
3. **Consider separate tables**: For heavy local testing, consider a separate dev table
4. **Authentication**: Plan for proper user authentication in production
