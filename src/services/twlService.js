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

  console.log('Generated headers:', generatedHeaders);
  console.log('Generated indices:', { origWords: generatedOrigWordsIndex, occurrence: generatedOccurrenceIndex, twlink: generatedTWLinkIndex });

  // Find column indices for existing content (may be different if structure differs)
  const existingOrigWordsIndex = existing.headers ? existing.headers.findIndex((h) => h === 'OrigWords') : generatedOrigWordsIndex;
  const existingOccurrenceIndex = existing.headers ? existing.headers.findIndex((h) => h === 'Occurrence') : generatedOccurrenceIndex;
  const existingTWLinkIndex = existing.headers ? existing.headers.findIndex((h) => h === 'TWLink') : generatedTWLinkIndex;

  console.log('Existing headers:', existing.headers);
  console.log('Existing indices:', { origWords: existingOrigWordsIndex, occurrence: existingOccurrenceIndex, twlink: existingTWLinkIndex });

  // Initialize pointers
  let existingPointer = 0;
  let generatedPointer = 0;
  const mergedRows = [];
  const usedGeneratedRows = new Set(); // Track which generated rows have been matched

  // Helper function to create extended existing row
  const createExtendedExistingRow = (existingRow) => {
    const extendedRow = [...existingRow];
    while (extendedRow.length < generatedHeaders.length - 1) {
      extendedRow.push('');
    }

    // Add "N/A" for "Context" column
    extendedRow.push('N/A');
    // Add "OLD" to "Merge Status" column
    extendedRow.push('OLD');
    return extendedRow;
  };

  // Helper function to check if existing row matches generated row
  const isExactMatch = (generatedRow, existingRow) => {
    // Use appropriate column indices for each row type
    const genReference = generatedRow[0];
    const genOrigWords = generatedRow[generatedOrigWordsIndex];
    const genOccurrence = generatedRow[generatedOccurrenceIndex];
    const genTWLink = generatedRow[generatedTWLinkIndex];

    const exReference = existingRow[0]; // Reference is always first column
    const exOrigWords = existingRow[existingOrigWordsIndex];
    const exOccurrence = existingRow[existingOccurrenceIndex];
    const exTWLink = existingRow[existingTWLinkIndex];

    console.log('Comparing:', {
      genRef: genReference,
      exRef: exReference,
      genOrig: genOrigWords,
      exOrig: exOrigWords,
      genOcc: genOccurrence,
      exOcc: exOccurrence,
      genTWLink: genTWLink,
      exTWLink: exTWLink
    });

    return genReference === exReference &&
      genOrigWords === exOrigWords &&
      genOccurrence === exOccurrence &&
      genTWLink === exTWLink;
  };

  // Helper function to update generated row with existing data
  const updateGeneratedRow = (generatedRow, existingRow) => {
    const updatedRow = [...generatedRow];
    // Replace first 6 columns with existing row data
    const generatedTWLink = generatedRow[5];
    const existingTWLink = existingRow[5];

    for (let i = 0; i < 6; i++) {
      updatedRow[i] = existingRow[i];
    }
    if (generatedTWLink != existingTWLink) {
      let existingArticle = existingTWLink.split('/').slice(-2).join('/');
      let generatedArticle = generatedTWLink.split('/').slice(-2).join('/');

      let disambiguations = [generatedArticle];
      if (generatedRow[8].trim()) {
        disambiguations = generatedRow[8].trim().replace(/^\(/, '').replace(/\)$/, '').split(',').map(d => d.trim());
      }
      if (!disambiguations.includes(existingArticle)) {
        disambiguations.unshift(existingArticle);
      }
      updatedRow[8] = `(${disambiguations.join(', ')})`;
    }

    // Add "BOTH" to "Merge Status" column if this link is in 'B'oth Existing and Generated.
    if (existingRows.length > 0) {
      updatedRow.push('BOTH');
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

      // Skip already used rows
      if (usedGeneratedRows.has(generatedPointer)) {
        generatedPointer++;
        continue;
      }

      if (compareReferences(generatedRef, existingRef) < 0) {
        // Generated reference is less than existing reference, add it
        const extendedGeneratedRow = existingRows.length > 0 ? [...generatedRow, 'NEW'] : generatedRow;
        mergedRows.push(extendedGeneratedRow);
        usedGeneratedRows.add(generatedPointer);
        generatedPointer++;
      } else {
        // Generated reference is >= existing reference, break to handle existing row
        break;
      }
    }

    // Now look for a matching generated row with the same reference
    let matchFound = false;
    let matchIndex = -1;

    // Search through ALL remaining generated rows for an exact match
    for (let i = generatedPointer; i < generatedRows.length; i++) {
      // Skip already used rows
      if (usedGeneratedRows.has(i)) {
        continue;
      }

      const generatedRow = generatedRows[i];

      if (isExactMatch(existingRow, generatedRow)) {
        matchFound = true;
        matchIndex = i;
        break;
      }
    }

    if (matchFound) {
      // Add all generated rows up to the match as NEW (that haven't been used)
      while (generatedPointer < matchIndex) {
        if (!usedGeneratedRows.has(generatedPointer)) {
          const extendedGeneratedRow = existingRows.length > 0 ? [...generatedRows[generatedPointer], 'NEW'] : generatedRows[generatedPointer];
          mergedRows.push(extendedGeneratedRow);
          usedGeneratedRows.add(generatedPointer);
        }
        generatedPointer++;
      }

      // Add the matched row with BOTH status
      const matchedGeneratedRow = generatedRows[matchIndex];
      mergedRows.push(updateGeneratedRow(matchedGeneratedRow, existingRow));
      usedGeneratedRows.add(matchIndex);

      // Move pointer past the match if needed
      if (generatedPointer <= matchIndex) {
        generatedPointer = matchIndex + 1;
      }
    } else {
      // No exact match found, insert the existing row as-is
      mergedRows.push(createExtendedExistingRow(existingRow));
    }

    existingPointer++;
  }

  // Add any remaining generated rows that haven't been used
  for (let i = 0; i < generatedRows.length; i++) {
    if (!usedGeneratedRows.has(i)) {
      const extendedGeneratedRow = existingRows.length > 0 ? [...generatedRows[i], 'NEW'] : generatedRows[i];
      mergedRows.push(extendedGeneratedRow);
    }
  }

  // Rebuild the TSV content
  const result = [finalHeaders.join('\t'), ...mergedRows.map((row) => row.join('\t'))].join('\n');
  return result;
};
