/**
 * TWL (Translation Word List) processing and merging logic
 */
import { parseTsv, hasHeader, compareReferences } from '../utils/tsvUtils.js';
import JSZip from 'jszip';

export const fetchTwArchiveZip = async (dcsHost = 'https://git.door43.org') => {
  const url = `${dcsHost}/unfoldingWord/en_tw/archive/master.zip`;
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
export const mergeExistingTwls = async (generatedContent, existingContent, dcsHost = 'https://git.door43.org') => {
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
  const generatedReferenceIndex = generatedHeaders?.findIndex((h) => h === 'Reference') || 0;
  const generatedOrigWordsIndex = generatedHeaders?.findIndex((h) => h === 'OrigWords') || 3;
  const generatedOccurrenceIndex = generatedHeaders?.findIndex((h) => h === 'Occurrence') || 4;
  const generatedTWLinkIndex = generatedHeaders?.findIndex((h) => h === 'TWLink') || 5;
  const generatedDisambiguationIndex = generatedHeaders?.findIndex((h) => h === 'Disambiguation') || 8;

  console.log('Generated headers:', generatedHeaders);
  console.log('Generated indices:', { origWords: generatedOrigWordsIndex, occurrence: generatedOccurrenceIndex, twLink: generatedTWLinkIndex, disambiguation: generatedDisambiguationIndex });

  // Find column indices for existing content (may be different if structure differs)
  const existingReferenceIndex = existing?.headers?.findIndex((h) => h === 'Reference') || 0;
  const existingOrigWordsIndex = existing?.headers?.findIndex((h) => h === 'OrigWords') || 3;
  const existingOccurrenceIndex = existing?.headers?.findIndex((h) => h === 'Occurrence') || 4;
  const existingTWLinkIndex = existing?.headers?.findIndex((h) => h === 'TWLink') || 5;
  const existingDisambiguationIndex = existing?.headers?.findIndex((h) => h === 'Disambiguation') || 8;

  console.log('Existing headers:', existing.headers);
  console.log('Existing indices:', { origWords: existingOrigWordsIndex, occurrence: existingOccurrenceIndex, twLink: existingTWLinkIndex, disambiguation: existingDisambiguationIndex });

  // Helper function to normalize Hebrew text
  const normalizeHebrew = (text) => {
    if (!text) return text;
    return text.normalize('NFC');
  };

  // Helper function to create a unique key for row matching
  const createRowKey = (row, referenceIndex, origWordsIndex, occurrenceIndex) => {
    const reference = row[referenceIndex] || '';
    const origWords = normalizeHebrew(row[origWordsIndex] || '');
    const occurrence = row[occurrenceIndex] || '';
    return `${reference}-${origWords}-${occurrence}`;
  };

  // Create a map of existing rows keyed by their unique identifier
  // Each key maps to an array of rows since multiple rows can have the same Reference-OrigWords-Occurrence
  const existingRowsMap = new Map();
  existingRows.forEach((row, index) => {
    const key = createRowKey(row, existingReferenceIndex, existingOrigWordsIndex, existingOccurrenceIndex);
    if (!existingRowsMap.has(key)) {
      existingRowsMap.set(key, []);
    }
    existingRowsMap.get(key).push({ row, originalIndex: index });
  });

  console.log('Created existing rows map with keys:', Array.from(existingRowsMap.keys()));
  console.log('Existing rows per key:', Array.from(existingRowsMap.entries()).map(([key, rows]) => `${key}: ${rows.length} rows`));

  // Helper function to extract TWLink ending (e.g., "kt/god" from "rc://*/tw/dict/bible/kt/god")
  const getTWLinkEnding = (twLink) => {
    if (!twLink) return '';
    const parts = twLink.split('/');
    return parts.length >= 2 ? parts.slice(-2).join('/') : twLink;
  };

  // Helper function to parse disambiguation options
  const parseDisambiguationOptions = (disambiguation) => {
    if (!disambiguation || !disambiguation.trim()) return [];
    // Remove parentheses and split by comma
    return disambiguation.trim()
      .replace(/^\(/, '')
      .replace(/\)$/, '')
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);
  };

  // Process generated rows first - match with existing and mark appropriately
  const processedRows = [];

  generatedRows.forEach((generatedRow, index) => {
    const key = createRowKey(generatedRow, generatedReferenceIndex, generatedOrigWordsIndex, generatedOccurrenceIndex);

    if (existingRowsMap.has(key)) {
      const existingRowsArray = existingRowsMap.get(key);
      const generatedTWLink = generatedRow[generatedTWLinkIndex];
      const generatedTWLinkEnding = getTWLinkEnding(generatedTWLink);
      const generatedDisambiguation = generatedRow[generatedDisambiguationIndex] || '';
      const disambiguationOptions = parseDisambiguationOptions(generatedDisambiguation);

      console.log(`Processing generated row with key: ${key}`);
      console.log(`Generated TWLink: ${generatedTWLink} (ending: ${generatedTWLinkEnding})`);
      console.log(`Generated disambiguation: ${generatedDisambiguation}`);
      console.log(`Disambiguation options: ${disambiguationOptions.join(', ')}`);

      // Look for a matching existing row
      let matchedExistingIndex = -1;
      let matchedExisting = null;

      for (let i = 0; i < existingRowsArray.length; i++) {
        const existingData = existingRowsArray[i];
        const existingRow = existingData.row;
        const existingTWLink = existingRow[existingTWLinkIndex];
        const existingTWLinkEnding = getTWLinkEnding(existingTWLink);

        console.log(`  Checking existing TWLink: ${existingTWLink} (ending: ${existingTWLinkEnding})`);

        // Check for exact TWLink match
        if (generatedTWLink === existingTWLink) {
          console.log(`  Exact TWLink match found!`);
          matchedExistingIndex = i;
          matchedExisting = existingData;
          break;
        }

        // Check if existing TWLink ending matches any disambiguation option
        if (disambiguationOptions.includes(existingTWLinkEnding)) {
          console.log(`  Disambiguation match found: ${existingTWLinkEnding}`);
          matchedExistingIndex = i;
          matchedExisting = existingData;
          break;
        }
      }

      if (matchedExisting) {
        // Match found - update generated row with existing data
        const existingRow = matchedExisting.row;

        console.log(`Match found for key: ${key}`);

        // Create updated row with existing data in first 6 columns
        const updatedRow = [...generatedRow];

        // Replace first 6 columns with existing row data
        for (let i = 0; i < 6 && i < existingRow.length; i++) {
          updatedRow[i] = existingRow[i];
        }

        // Handle TWLink disambiguation if different
        const existingTWLink = existingRow[existingTWLinkIndex];

        if (generatedTWLink !== existingTWLink && generatedDisambiguationIndex >= 0) {
          const existingArticle = getTWLinkEnding(existingTWLink);
          const generatedArticle = getTWLinkEnding(generatedTWLink);

          let disambiguations = [generatedArticle];
          if (generatedRow[generatedDisambiguationIndex] && generatedRow[generatedDisambiguationIndex].trim()) {
            disambiguations = parseDisambiguationOptions(generatedRow[generatedDisambiguationIndex]);
          }
          if (!disambiguations.includes(existingArticle)) {
            disambiguations.unshift(existingArticle);
          }
          updatedRow[generatedDisambiguationIndex] = `(${disambiguations.join(', ')})`;
        }

        // Add "MERGED" to Merge Status column
        if (existingRows.length > 0) {
          updatedRow.push('MERGED');
        }

        processedRows.push(updatedRow);

        // Remove the matched existing row from the array
        existingRowsArray.splice(matchedExistingIndex, 1);

        // If the array is now empty, remove the key entirely
        if (existingRowsArray.length === 0) {
          existingRowsMap.delete(key);
        }
      } else {
        // No match found - mark as NEW
        const newRow = existingRows.length > 0 ? [...generatedRow, 'NEW'] : generatedRow;
        processedRows.push(newRow);

        console.log(`No match found for key: ${key} - marked as NEW`);
      }
    } else {
      // No existing rows with this key - mark as NEW
      const newRow = existingRows.length > 0 ? [...generatedRow, 'NEW'] : generatedRow;
      processedRows.push(newRow);

      console.log(`No existing rows for key: ${key} - marked as NEW`);
    }
  });

  // Now process remaining existing rows that weren't matched
  const remainingExistingRows = [];
  for (const [key, existingRowsArray] of existingRowsMap) {
    // Flatten the array of remaining existing rows
    for (const existingData of existingRowsArray) {
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
