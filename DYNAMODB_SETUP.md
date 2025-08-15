# DynamoDB + Netlify Functions Setup Guide

This guide will help you set up server-side storage for unlinked words using AWS DynamoDB and Netlify Functions.

## Prerequisites

- AWS Account with access to DynamoDB and IAM
- Netlify account with your app deployed
- Basic familiarity with AWS Console

## Step 1: Create DynamoDB Table

1. **Go to AWS Console** → DynamoDB → Tables → "Create table"

2. **Table Configuration:**

   - **Table name**: `twl-unlinked-words`
   - **Partition key**: `origWords` (String)
   - **Sort key**: `twLink` (String)
   - **Table settings**: Use default settings (On-demand billing recommended)

3. **Create the table** and wait for it to be active

## Step 2: Create IAM User for Netlify

1. **Go to AWS Console** → IAM → Users → "Add users"
2. **User name**: `netlify-twl-app`
3. **Access type**: Programmatic access
4. **Permissions**: Create inline policy with this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:Scan"],
      "Resource": "arn:aws:dynamodb:*:*:table/twl-unlinked-words"
    }
  ]
}
```

5. **Save the Access Key ID and Secret Access Key** - you'll need these for Netlify

## Step 3: Configure Netlify Environment Variables

1. **Go to Netlify Dashboard** → Your site → Site settings → Environment variables
2. **Add these variables:**
   - `TWL_AWS_ACCESS_KEY_ID` = (your IAM user access key)
   - `TWL_AWS_SECRET_ACCESS_KEY` = (your IAM user secret key)
   - `TWL_AWS_REGION` = (your DynamoDB region, e.g., `us-east-1`)
   - `TWL_DYNAMODB_TABLE_NAME` = `twl-unlinked-words`

## Step 4: Deploy to Netlify

1. **Commit and push your changes:**

   ```bash
   git add .
   git commit -m "Add DynamoDB integration with Netlify functions"
   git push
   ```

2. **Netlify will automatically deploy** your functions and the updated app

## Step 5: Test the Integration

1. **Open your deployed app**
2. **Generate a TWL for any book**
3. **Click the unlink button** on any row
4. **Check the browser console** for server response logs
5. **Open the Unlinked Words Manager** to see if the word was saved
6. **Remove a word** from the manager to test the "mark as removed" functionality

## API Endpoints

Your app will now have these endpoints available:

- `/.netlify/functions/add-unlinked-word` - Add an unlinked word to DynamoDB
- `/.netlify/functions/remove-unlinked-word` - Mark an unlinked word as removed
- `/.netlify/functions/get-unlinked-words` - Get all unlinked words for a user

## Troubleshooting

### Common Issues:

1. **403 Forbidden errors**: Check your IAM permissions and AWS credentials
2. **CORS errors**: Verify the CORS headers in the function responses
3. **Function not found**: Ensure the `netlify/functions` directory is properly configured
4. **DynamoDB errors**: Verify the table name and region are correct

### Debug Steps:

1. **Check Netlify function logs**: Go to Netlify → Functions → View logs
2. **Verify environment variables**: Go to Netlify → Site settings → Environment variables
3. **Test functions directly**: Use the Netlify function URL in a browser or Postman
4. **Check AWS CloudWatch**: For DynamoDB operation logs

## Security Notes

- User identification is currently based on localStorage (basic)
- Consider implementing proper authentication for production use
- The current setup allows any user to access any data
- You may want to add rate limiting to prevent abuse

## Data Schema

### DynamoDB Table Structure:

```json
{
  "origWords": "מִ⁠בֵּית לֶחֶם", // Partition key (normalized)
  "twLink": "rc://*/tw/dict/bible/names/bethlehem", // Sort key
  "originalOrigWords": "מִ⁠בֵּ֧ית לֶ֣חֶם", // Original with cantillation
  "book": "Ruth (rut)",
  "reference": "1:1",
  "glQuote": "Bethlehem",
  "userIdentifier": "user-1234567890-abc123",
  "dateAdded": "2025-08-15T20:30:00.000Z",
  "lastModified": "2025-08-15T20:30:00.000Z",
  "removed": false,
  "removedBy": "user-1234567890-abc123"
}
```

## Next Steps

1. **Implement user authentication** for better security
2. **Add sync functionality** to merge local and server data
3. **Add backup/export features** for server data
4. **Implement data sharing** between users/teams
5. **Add analytics** to track common unlinked words
