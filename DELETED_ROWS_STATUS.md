# Deleted Rows Functionality Status & Testing Guide

## ✅ Completed Setup

The DynamoDB table for deleted rows functionality has been successfully created and is ready for use.

### Created Resources:

1. **DynamoDB Table**: `twl-deleted-rows`
   - Partition Key: `book` (String)
   - Sort Key: `sortKey` (String) - format: `${reference}|${normalizedOrigWords}|${occurrence}`
   - Billing Mode: Pay-per-request
   - Region: us-east-1
   - Status: ACTIVE ✅

2. **Netlify Functions** (already implemented):
   - `add-deleted-row.cjs` - Adds deleted row markers
   - `get-deleted-rows.cjs` - Retrieves deleted rows for a book
   - `remove-deleted-row.cjs` - Removes deleted row markers (undelete)

3. **Client-side Services** (already implemented):
   - `src/services/deletedRowsApi.js` - API calls to Netlify functions
   - `src/utils/deletedRows.js` - Utilities for filtering TSV content

4. **Setup Scripts**:
   - `setup-deleted-rows-table.sh` - Creates the DynamoDB table
   - `cleanup-deleted-rows-table.sh` - Deletes the table (use with caution)

## 🔧 Required Environment Variables

Make sure these are set in your Netlify dashboard:

```
TWL_AWS_ACCESS_KEY_ID=<your-access-key>
TWL_AWS_SECRET_ACCESS_KEY=<your-secret-key>
TWL_AWS_REGION=us-east-1
TWL_DYNAMODB_DELETED_TABLE_NAME=twl-deleted-rows
```

## 🧪 Testing the Functionality

### 1. Manual Testing via API

You can test the functions directly using curl or a tool like Postman:

```bash
# Add a deleted row marker
curl -X POST https://your-netlify-site.netlify.app/.netlify/functions/add-deleted-row \
  -H "Content-Type: application/json" \
  -d '{
    "book": "gen",
    "reference": "1:1",
    "origWords": "בְּרֵאשִׁ֖ית",
    "occurrence": "1",
    "userIdentifier": "test-user"
  }'

# Get deleted rows for a book
curl "https://your-netlify-site.netlify.app/.netlify/functions/get-deleted-rows?book=gen"

# Remove a deleted row marker (undelete)
curl -X POST https://your-netlify-site.netlify.app/.netlify/functions/remove-deleted-row \
  -H "Content-Type: application/json" \
  -d '{
    "book": "gen",
    "reference": "1:1",
    "origWords": "בְּרֵאשִׁ֖ית",
    "occurrence": "1"
  }'
```

### 2. Application Integration Testing

The functionality should integrate with your existing TWL app:

1. **Generate a TWL** for any book (preferably with existing content to create MERGED rows)
2. **Try to delete different row types**:
   - **MERGED rows**: Delete button should be disabled and grayed out
   - **NEW/OLD rows**: Should delete normally (call `addDeletedRowToServer()`)
3. **Regenerate the same book** - deleted rows should be filtered out
4. **Restore a deleted row** - should call `removeDeletedRowFromServer()`

### 3. Row Protection Rules

- ✅ **Can Delete**: NEW rows (newly generated content)
- ✅ **Can Delete**: OLD rows (existing content that wasn't merged)  
- 🚫 **Cannot Delete**: MERGED rows (existing TSV content that was successfully merged)
- ✅ **Can Restore**: Any DELETED row regardless of original merge status

## 📋 Data Schema

### DynamoDB Item Structure:
```json
{
  "book": "gen",                    // Partition key (lowercase)
  "sortKey": "1:1|בראשית|1",        // Sort key: reference|normalizedOrigWords|occurrence
  "reference": "1:1",               // Original reference
  "origWords": "בְּרֵאשִׁ֖ית",        // Original Hebrew with cantillation
  "normalizedOrigWords": "בראשית",   // Normalized (no cantillation)
  "occurrence": "1",                // Occurrence number as string
  "userIdentifier": "user-123",     // User who deleted the row
  "dateAdded": "2025-09-26T...",    // ISO timestamp
  "lastModified": "2025-09-26T..."  // ISO timestamp
}
```

## 🔧 Next Steps for Full Integration

To complete the deleted rows functionality, you may need to:

1. **Update the TWL Table Component** to:
   - Add delete buttons to rows
   - Call `addDeletedRowToServer()` when deleting
   - Call `removeDeletedRowFromServer()` when restoring

2. **Update the TWL Generation Process** to:
   - Call `getDeletedRowsFromServer()` for the current book
   - Use `filterDeletedRowsWithData()` to apply deleted row markers

3. **Add UI Elements** for:
   - Showing deleted rows with "DELETED" prefix
   - Restore buttons for deleted rows
   - Bulk operations (clear all deleted rows for a book)

## 🛠 Troubleshooting

### Common Issues:

1. **403 Forbidden**: Check AWS credentials and IAM permissions
2. **Table not found**: Verify `TWL_DYNAMODB_DELETED_TABLE_NAME` environment variable
3. **CORS errors**: Functions should handle CORS properly
4. **Hebrew text issues**: Normalization should match between client and server

### Debug Steps:

1. Check Netlify function logs in the dashboard
2. Verify environment variables are set
3. Test functions directly with curl
4. Check browser console for client-side errors

## 🔒 Security Considerations

- Current implementation uses localStorage-based user identification
- Consider implementing proper authentication for production
- The setup allows any user to access any data (by design for this use case)
- Consider adding rate limiting to prevent abuse

## 📊 Monitoring

You can monitor the table usage in AWS Console:
- Go to DynamoDB → Tables → `twl-deleted-rows`
- Check the "Metrics" tab for usage statistics
- Monitor costs in the "Monitoring" section