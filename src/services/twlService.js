/**
 * TWL (Translation Word List) processing and merging logic
 */
import { parseTsv, hasHeader, compareReferences } from '../utils/tsvUtils.js';

/**
 * Merge existing TWL content with newly generated TWL content
 * Uses a pointer-based algorithm to maintain proper order
 */
export const mergeExistingTwls = (generatedContent, existingContent) => {
  if (!existingContent.trim()) {
    return generatedContent; // No existing content to merge
  }

  // Parse generated content (always has header)
  console.log(generatedContent);
  const generated = parseTsv(generatedContent, true);
  const generatedHeaders = generated.headers;
  const generatedRows = generated.rows;

  // Parse existing content (check if it has header)
  const existingHasHeader = hasHeader(existingContent);
  const existing = parseTsv(existingContent, existingHasHeader);
  const existingRows = existing.rows;

  // Add "Already Exists" column to headers if there are existing rows
  const finalHeaders = existingRows.length > 0 ? [...generatedHeaders, 'Already Exists'] : generatedHeaders;

  // Find column indices
  const origWordsIndex = generatedHeaders.findIndex((h) => h === 'OrigWords');
  const occurrenceIndex = generatedHeaders.findIndex((h) => h === 'Occurrence');

  // Initialize pointers
  let existingPointer = 0;
  let generatedPointer = 0;
  const mergedRows = [];

  // Helper function to create extended existing row
  const createExtendedExistingRow = (existingRow) => {
    const extendedRow = [...existingRow];
    while (extendedRow.length < generatedHeaders.length) {
      extendedRow.push('');
    }
    // Add "x" to "Already Exists" column if there are existing rows
    if (existingRows.length > 0) {
      extendedRow.push('x');
    }
    return extendedRow;
  };

  // Helper function to check if existing row matches generated row
  const isExactMatch = (existingRow, generatedRow) => {
    const existingRef = existingRow[0] || '';
    const existingOrigWords = origWordsIndex >= 0 ? (existingRow[origWordsIndex] || '') : '';
    const existingOccurrence = occurrenceIndex >= 0 ? (existingRow[occurrenceIndex] || '') : '';

    const generatedRef = generatedRow[0] || '';
    const generatedOrigWords = origWordsIndex >= 0 ? (generatedRow[origWordsIndex] || '') : '';
    const generatedOccurrence = occurrenceIndex >= 0 ? (generatedRow[occurrenceIndex] || '') : '';

    return existingRef === generatedRef &&
      existingOrigWords === generatedOrigWords &&
      existingOccurrence === generatedOccurrence;
  };

  // Helper function to update generated row with existing data
  const updateGeneratedRow = (generatedRow, existingRow) => {
    const updatedRow = [...generatedRow];
    // Replace first 6 columns with existing row data
    for (let i = 0; i < Math.min(6, existingRow.length); i++) {
      updatedRow[i] = existingRow[i];
    }
    // Add "x" to "Already Exists" column if there are existing rows
    if (existingRows.length > 0) {
      updatedRow.push('x');
    }
    return updatedRow;
  };

  // Main merging loop - process existing rows in order
  while (existingPointer < existingRows.length) {
    const existingRow = existingRows[existingPointer];
    const existingRef = existingRow[0] || '';

    // First, add all generated rows with references less than the current existing row
    while (generatedPointer < generatedRows.length) {
      const generatedRow = generatedRows[generatedPointer];
      const generatedRef = generatedRow[0] || '';

      if (compareReferences(generatedRef, existingRef) < 0) {
        // Generated reference is less than existing reference, add it
        const extendedGeneratedRow = existingRows.length > 0 ? [...generatedRow, ''] : generatedRow;
        mergedRows.push(extendedGeneratedRow);
        generatedPointer++;
      } else {
        // Generated reference is >= existing reference, break to handle existing row
        break;
      }
    }

    // Now look for a matching generated row with the same reference
    let matchFound = false;
    let tempGeneratedPointer = generatedPointer;

    // Search through generated rows with the same reference as the existing row
    while (tempGeneratedPointer < generatedRows.length) {
      const generatedRow = generatedRows[tempGeneratedPointer];
      const generatedRef = generatedRow[0] || '';

      if (compareReferences(generatedRef, existingRef) === 0) {
        // Same reference, check for exact match
        if (isExactMatch(existingRow, generatedRow)) {
          // Exact match found! Add all generated rows up to this point
          while (generatedPointer < tempGeneratedPointer) {
            const extendedGeneratedRow = existingRows.length > 0 ? [...generatedRows[generatedPointer], ''] : generatedRows[generatedPointer];
            mergedRows.push(extendedGeneratedRow);
            generatedPointer++;
          }
          // Add the updated generated row with existing data
          mergedRows.push(updateGeneratedRow(generatedRow, existingRow));
          generatedPointer++; // Skip the matched generated row
          matchFound = true;
          break;
        }
        tempGeneratedPointer++;
      } else if (compareReferences(generatedRef, existingRef) > 0) {
        // No more rows with this reference
        break;
      } else {
        tempGeneratedPointer++;
      }
    }

    if (!matchFound) {
      // No exact match found, insert the existing row as-is
      mergedRows.push(createExtendedExistingRow(existingRow));
    }

    existingPointer++;
  }

  // Add any remaining generated rows
  while (generatedPointer < generatedRows.length) {
    const extendedGeneratedRow = existingRows.length > 0 ? [...generatedRows[generatedPointer], ''] : generatedRows[generatedPointer];
    mergedRows.push(extendedGeneratedRow);
    generatedPointer++;
  }

  // Rebuild the TSV content
  const result = [finalHeaders.join('\t'), ...mergedRows.map((row) => row.join('\t'))].join('\n');
  return result;
};
