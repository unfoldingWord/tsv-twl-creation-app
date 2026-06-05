# Cleanup Script Instructions

The cleanup script `cleanup-soft-deleted-rows.cjs` is ready to run and will:

1. **Delete all soft-deleted rows** (where `removed: true`) completely from the DynamoDB table
2. **Remove the `removed` attribute** from all remaining items in the table

## How to Run

1. **Set your environment variables** (same as used by your Netlify functions):
   ```bash
   export TWL_AWS_REGION="your-region"
   export TWL_AWS_ACCESS_KEY_ID="your-access-key"
   export TWL_AWS_SECRET_ACCESS_KEY="your-secret-key"
   export TWL_DYNAMODB_TABLE_NAME="your-table-name"
   ```

   Or create a `.env` file with these values and source it:
   ```bash
   source .env
   ```

2. **Run the cleanup script**:
   ```bash
   node cleanup-soft-deleted-rows.cjs
   ```

## What the Script Does

- Scans all items in your DynamoDB table
- For items with `removed: true`: Deletes them completely
- For items with a `removed` attribute (even if false): Removes that attribute
- Provides a summary of actions taken

## Expected Output

```
Starting cleanup of soft-deleted rows...
Found X total items in the table
Deleted soft-deleted item: מואב | rc://*/tw/dict/bible/names/moab
Removed 'removed' attribute from: יהוה | rc://*/tw/dict/bible/kt/yahweh

Cleanup completed successfully!
- Deleted X soft-deleted rows
- Removed 'removed' attribute from X items
- X items were already clean
```

After running this script, your table will only contain active unlinked words and the "removed" status logic will be completely eliminated.