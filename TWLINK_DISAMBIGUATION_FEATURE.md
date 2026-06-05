# TWLink Disambiguation Creation Feature

## Summary

When merging imported TWLs with generated TWLs, if the rows match (same Reference, OrigWords, and Occurrence) but have different TWLinks, and the generated row has NO disambiguation, the system now automatically creates a disambiguation list containing both TWLink paths.

## Changes Made

### Modified File: `src/services/twlService.js`

#### 1. Added Helper Function: `extractTWLinkPath`

```javascript
// Helper function to extract last two parts of TWLink path
// e.g., "rc://*/tw/dict/bible/other/ruler" -> "other/ruler"
const extractTWLinkPath = (twLink) => {
  if (!twLink) return '';
  const parts = twLink.split('/');
  if (parts.length >= 2) {
    return parts.slice(-2).join('/');
  }
  return twLink;
};
```

This function extracts the last two parts of a TWLink URL path, which represents the category and term (e.g., `other/ruler`, `kt/god`).

#### 2. Enhanced Merge Logic

Added special handling in the merge process (lines ~135-145):

```javascript
// Special handling: if TWLinks differ and generated has NO disambiguation, create one
if (impTWLink !== genTWLink && disambiguationIndex >= 0) {
  const genDisambigValue = generatedRow[disambiguationIndex] || '';
  // Check if generated row has no disambiguation (empty or whitespace only)
  if (!genDisambigValue.trim()) {
    const impPath = extractTWLinkPath(impTWLink);
    const genPath = extractTWLinkPath(genTWLink);
    // Create disambiguation list with both paths
    const newDisambiguation = `(${impPath}, ${genPath})`;
    finalRows[finalRowIndex][disambiguationIndex] = newDisambiguation;
    console.log(`  TWLinks differ (${impTWLink} vs ${genTWLink}) and no disambiguation - created: ${newDisambiguation}`);
  }
}
```

## Behavior

### Case 1: Different TWLinks, NO Existing Disambiguation
**Before:** Row would merge with imported TWLink, but no disambiguation would be created.

**After:** Row merges with imported TWLink AND creates a disambiguation list:
- Imported TWLink: `rc://*/tw/dict/bible/other/ruler`
- Generated TWLink: `rc://*/tw/dict/bible/other/noble`
- **Result:** Disambiguation column becomes: `(other/ruler, other/noble)`

### Case 2: Different TWLinks, HAS Existing Disambiguation
**Behavior:** The existing disambiguation from the generated row is preserved (not overwritten).

### Case 3: Same TWLinks
**Behavior:** No disambiguation is created (as expected).

## Test Results

All three test scenarios pass:

### Test 1: `test-twlink-disambiguation.js`
✅ Creates disambiguation when TWLinks differ and no disambiguation exists

**Example output:**
```
Row 1: Reference=1:1, Status=MERGED
  TWLink: rc://*/tw/dict/bible/other/ruler
  Disambiguation: (other/ruler, other/noble)
  ✅ PASS: Disambiguation correctly created with both TWLink paths
```

### Test 2: `test-preserve-disambiguation.js`
✅ Preserves existing disambiguation when TWLinks differ

**Example output:**
```
Row 1: Reference=1:1, Status=MERGED
  TWLink: rc://*/tw/dict/bible/other/ruler
  Disambiguation: (other/noble, other/royal)
  ✅ PASS: Generated disambiguation preserved (not overwritten)
```

### Test 3: `test-same-twlink.js`
✅ Does not create disambiguation when TWLinks are the same

**Example output:**
```
Row 1: Reference=1:1, Status=MERGED
  TWLink: rc://*/tw/dict/bible/other/ruler
  Disambiguation: (empty)
  ✅ PASS: No disambiguation created (TWLinks match)
```

## User Experience

When users merge imported TWLs with generated content:

1. **Imported row takes precedence** - the imported TWLink is kept
2. **Disambiguation options are provided** - both the imported and generated TWLink paths are listed
3. **Users can choose** - they can click on either disambiguation option to select the appropriate TWLink
4. **No manual work needed** - the system automatically detects TWLink differences and creates the disambiguation list

## Format

The disambiguation format follows the existing pattern:
- Format: `(path1, path2)`
- Example: `(other/ruler, other/noble)`
- Example: `(kt/god, kt/falsegod)`

This format is already supported by the existing disambiguation parsing and rendering logic in the application.
