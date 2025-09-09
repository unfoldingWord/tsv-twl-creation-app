/**
 * TWL (Translation Word List) processing and merging logic
 */
import { parseTsv, hasHeader, compareReferences } from '../utils/tsvUtils.js';
import JSZip from 'jszip';

export const fetchTwArchiveZip = async (dcsHost = 'git.door43.org') => {
  const url = `https://${dcsHost}/unfoldingWord/en_tw/archive/master.zip`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch TW archive: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  return zip;
};

/**
 * Merge existing TWL content with newly generated TWL content
 * Uses a pointer-based algorithm to maintain proper order
 */
export const mergeExistingTwls = async (generatedContent, existingContent, dcsHost = 'git.door43.org') => {
  if (!existingContent.trim()) {
    return generatedContent; // No existing content to merge
  }

  // Parse generated content (always has header)
  const generated = parseTsv(generatedContent, true);
  const generatedHeaders = generated.headers;
  const generatedRows = generated.rows;

  // Parse existing content (check if it has header)
  const existingHasHeader = hasHeader(existingContent);
  const existing = parseTsv(existingContent, existingHasHeader);
  const existingRows = existing.rows;

  // Add "Merge Status" column to headers if there are existing rows
  const finalHeaders = existingRows.length > 0 ? [...generatedHeaders, 'Merge Status'] : generatedHeaders;

  // Find column indices for generated content
  const generatedOrigWordsIndex = generatedHeaders.findIndex((h) => h === 'OrigWords');
  const generatedOccurrenceIndex = generatedHeaders.findIndex((h) => h === 'Occurrence');
  const generatedTWLinkIndex = generatedHeaders.findIndex((h) => h === 'TWLink');
  const generatedGLQuoteIndex = generatedHeaders.findIndex((h) => h === 'GLQuote');

  console.log('Generated headers:', generatedHeaders);
  console.log('Generated indices:', { origWords: generatedOrigWordsIndex, occurrence: generatedOccurrenceIndex, glquote: generatedGLQuoteIndex });

  // Find column indices for existing content (may be different if structure differs)
  const existingOrigWordsIndex = existing.headers ? existing.headers.findIndex((h) => h === 'OrigWords') : generatedOrigWordsIndex;
  const existingOccurrenceIndex = existing.headers ? existing.headers.findIndex((h) => h === 'Occurrence') : generatedOccurrenceIndex;
  const existingTWLinkIndex = existing.headers ? existing.headers.findIndex((h) => h === 'TWLink') : generatedTWLinkIndex;
  const existingGLQuoteIndex = existing.headers ? existing.headers.findIndex((h) => h === 'GLQuote') : generatedGLQuoteIndex;

  console.log('Existing headers:', existing.headers);
  console.log('Existing indices:', { origWords: existingOrigWordsIndex, occurrence: existingOccurrenceIndex, glquote: existingGLQuoteIndex });

  // Helper function to normalize Hebrew text
  const normalizeHebrew = (text) => {
    if (!text) return text;
    return text.normalize('NFC');
  };

  // Helper function to create a unique key for row matching
  const createRowKey = (row, origWordsIndex, occurrenceIndex, glQuoteIndex) => {
    const reference = row[0] || '';
    const origWords = normalizeHebrew(row[origWordsIndex] || '');
    const occurrence = row[occurrenceIndex] || '';
    const glQuote = row[glQuoteIndex] || '';
    return `${reference}-${origWords}-${occurrence}-${glQuote}`;
  };

  // Create a map of existing rows keyed by their unique identifier
  const existingRowsMap = new Map();
  existingRows.forEach((row, index) => {
    const key = createRowKey(row, existingOrigWordsIndex, existingOccurrenceIndex, existingGLQuoteIndex);
    existingRowsMap.set(key, { row, originalIndex: index });
  });

  console.log('Created existing rows map with keys:', Array.from(existingRowsMap.keys()));

  // Process generated rows first - match with existing and mark appropriately
  const processedRows = [];

  generatedRows.forEach((generatedRow, index) => {
    const key = createRowKey(generatedRow, generatedOrigWordsIndex, generatedOccurrenceIndex, generatedGLQuoteIndex);

    if (existingRowsMap.has(key)) {
      // Match found - update generated row with existing data
      const existingData = existingRowsMap.get(key);
      const existingRow = existingData.row;

      console.log(`Match found for key: ${key}`);

      // Create updated row with existing data in first 6 columns
      const updatedRow = [...generatedRow];

      // Replace first 6 columns with existing row data
      for (let i = 0; i < 6 && i < existingRow.length; i++) {
        updatedRow[i] = existingRow[i];
      }

      // Handle TWLink disambiguation if different
      const generatedTWLink = generatedRow[generatedTWLinkIndex];
      const existingTWLink = existingRow[existingTWLinkIndex];

      if (generatedTWLink !== existingTWLink) {
        const existingArticle = existingTWLink.split('/').slice(-2).join('/');
        const generatedArticle = generatedTWLink.split('/').slice(-2).join('/');

        let disambiguations = [generatedArticle];
        if (generatedRow[8] && generatedRow[8].trim()) {
          disambiguations = generatedRow[8].trim().replace(/^\(/, '').replace(/\)$/, '').split(',').map(d => d.trim());
        }
        if (!disambiguations.includes(existingArticle)) {
          disambiguations.unshift(existingArticle);
        }
        updatedRow[8] = `(${disambiguations.join(', ')})`;
      }

      // Add "MERGED" to Merge Status column
      if (existingRows.length > 0) {
        updatedRow.push('MERGED');
      }

      processedRows.push(updatedRow);

      // Remove from map since it's been processed
      existingRowsMap.delete(key);
    } else {
      // No match found - mark as NEW
      const newRow = existingRows.length > 0 ? [...generatedRow, 'NEW'] : generatedRow;
      processedRows.push(newRow);

      console.log(`No match found for key: ${key} - marked as NEW`);
    }
  });

  // Now process remaining existing rows that weren't matched
  const remainingExistingRows = [];
  for (const [key, existingData] of existingRowsMap) {
    const existingRow = existingData.row;

    // Create extended existing row with "OLD" status
    const extendedRow = [...existingRow];
    while (extendedRow.length < generatedHeaders.length) {
      extendedRow.push('');
    }
    extendedRow.push('OLD');

    remainingExistingRows.push({
      row: extendedRow,
      reference: existingRow[0] || '',
      key: key
    });

    console.log(`Remaining existing row with key: ${key} - marked as OLD`);
  }

  // Sort remaining existing rows by reference for proper insertion
  remainingExistingRows.sort((a, b) => compareReferences(a.reference, b.reference));

  // Insert remaining existing rows in the correct positions
  const finalRows = [];
  let processedIndex = 0;
  let remainingIndex = 0;

  while (processedIndex < processedRows.length || remainingIndex < remainingExistingRows.length) {
    // If no more remaining rows, add all processed rows
    if (remainingIndex >= remainingExistingRows.length) {
      finalRows.push(...processedRows.slice(processedIndex));
      break;
    }

    // If no more processed rows, add all remaining rows
    if (processedIndex >= processedRows.length) {
      finalRows.push(...remainingExistingRows.slice(remainingIndex).map(item => item.row));
      break;
    }

    const processedRow = processedRows[processedIndex];
    const remainingRow = remainingExistingRows[remainingIndex];
    const processedRef = processedRow[0] || '';
    const remainingRef = remainingRow.reference;

    const refComparison = compareReferences(remainingRef, processedRef);

    if (refComparison < 0) {
      // Remaining row comes before processed row
      finalRows.push(remainingRow.row);
      remainingIndex++;
    } else if (refComparison === 0) {
      // Same reference - check merge status to determine order
      const processedMergeStatus = processedRow[processedRow.length - 1];

      if (processedMergeStatus === 'OLD') {
        // Processed OLD row comes first
        finalRows.push(processedRow);
        processedIndex++;
      } else {
        // Remaining OLD row comes before NEW/MERGED rows
        finalRows.push(remainingRow.row);
        remainingIndex++;
      }
    } else {
      // Processed row comes before remaining row
      finalRows.push(processedRow);
      processedIndex++;
    }
  }

  console.log(`Final merge result: ${finalRows.length} total rows`);

  // Rebuild the TSV content
  const result = [finalHeaders.join('\t'), ...finalRows.map((row) => row.join('\t'))].join('\n');
  return result;
};
