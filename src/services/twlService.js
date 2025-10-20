import JSZip from 'jszip';
import { parseTsv, hasHeader, compareReferences } from '../utils/tsvUtils.js';
import { normalizeHebrewText } from '../utils/unlinkedWords.js';

/**
 * Fetch TW archive from DCS
 */
export const fetchTwArchiveZip = async (dcsHost = 'https://git.door43.org') => {
  const url = `${dcsHost}/api/v1/repos/unfoldingWord/en_tw/archive/master.zip`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  return zip;
};

/**
 * Merge existing TWL content with newly generated TWL content
 * ALGORITHM: Use imported rows as anchor, process generated rows to either merge or insert as NEW
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

  // Create final headers: existing headers (first 6) + generated headers (from 6 onwards) + "Merge Status"
  const finalHeaders = [...existingRows.length > 0 ? generatedHeaders.slice(0, 6) : generatedHeaders, ...generatedHeaders.slice(6), 'Merge Status'];

  // Find column indices
  const referenceIndex = 0;
  const origWordsIndex = 3;
  const occurrenceIndex = 4;
  const twLinkIndex = 5;
  const disambiguationIndex = generatedHeaders.findIndex(h => h === 'Disambiguation');

  console.log('Starting merge process...');
  console.log(`Generated rows: ${generatedRows.length}, Imported rows: ${existingRows.length}`);

  // Start with imported rows as foundation - maintain their order
  const finalRows = [];
  const matchedImportedIndices = new Set();
  const referenceCursors = new Map(); // Track insertion position per reference

  // First, add all imported rows as OLD (will be updated to MERGED if matched)
  existingRows.forEach((importedRow, index) => {
    // Pad imported row to match final headers length
    const paddedRow = [...importedRow];
    while (paddedRow.length < finalHeaders.length - 1) {
      paddedRow.push('');
    }
    finalRows.push([...paddedRow, 'OLD']);
  });

  // Helper function to create a matching key
  const createMatchKey = (row, refIndex, origIndex, occIndex) => {
    let reference = row[refIndex] || '';
    if (reference.startsWith('DELETED ')) {
      reference = reference.substring(8);
    }
    const origWords = normalizeHebrewText(row[origIndex] || '');
    const occurrence = row[occIndex] || '';
    return `${reference}|${origWords}|${occurrence}`;
  };

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

  // Process each generated row - maintain their order
  generatedRows.forEach((generatedRow, genIndex) => {
    const genKey = createMatchKey(generatedRow, referenceIndex, origWordsIndex, occurrenceIndex);
    const genTWLink = generatedRow[twLinkIndex];
    const genDisambig = disambiguationIndex >= 0 ? (generatedRow[disambiguationIndex] || '') : '';
    const genRef = generatedRow[referenceIndex] || '';

    console.log(`\nProcessing generated row ${genIndex + 1}: ${genKey}, TWLink: ${genTWLink}`);

    // Look for matching imported row
    let matchedImportedIndex = -1;

    // Try to find a match in imported rows (Reference + OrigWords + Occurrence)
    for (let i = 0; i < existingRows.length; i++) {
      if (matchedImportedIndices.has(i)) continue;

      const importedRow = existingRows[i];
      const impKey = createMatchKey(importedRow, referenceIndex, origWordsIndex, occurrenceIndex);

      if (genKey === impKey) {
        matchedImportedIndex = i;
        console.log(`  Found match at imported index ${i}`);
        break;
      }
    }

    if (matchedImportedIndex !== -1) {
      // Match found - update the imported row in finalRows with generated data
      const importedRow = existingRows[matchedImportedIndex];
      const impTWLink = importedRow[twLinkIndex];

      console.log(`  Merging: keeping imported ID and TWLink=${impTWLink}, using generated GLQuote/GLOccurrence/Disambiguation`);

      // Find the imported row in finalRows and update it
      let finalRowIndex = -1;
      for (let j = 0; j < finalRows.length; j++) {
        if (finalRows[j][finalRows[j].length - 1] === 'OLD') {
          // Check if this is the same imported row by comparing key data and TWLink
          const finalRowKey = createMatchKey(finalRows[j], referenceIndex, origWordsIndex, occurrenceIndex);
          const importedRowKey = createMatchKey(importedRow, referenceIndex, origWordsIndex, occurrenceIndex);
          if (finalRowKey === importedRowKey && finalRows[j][twLinkIndex] === impTWLink) {
            finalRowIndex = j;
            break;
          }
        }
      }

      if (finalRowIndex !== -1) {
        // Keep imported data in first 6 columns (including ID and TWLink), use generated data for columns 6+
        for (let col = 6; col < generatedHeaders.length; col++) {
          if (col < generatedRow.length) {
            finalRows[finalRowIndex][col] = generatedRow[col];
          }
        }

        // Special handling: if TWLinks differ, handle disambiguation
        if (impTWLink !== genTWLink && disambiguationIndex >= 0) {
          const genDisambigValue = generatedRow[disambiguationIndex] || '';
          const impPath = extractTWLinkPath(impTWLink);
          const genPath = extractTWLinkPath(genTWLink);

          if (!genDisambigValue.trim()) {
            // Generated has NO disambiguation - create one with both paths
            const newDisambiguation = `(${impPath}, ${genPath})`;
            finalRows[finalRowIndex][disambiguationIndex] = newDisambiguation;
            console.log(`  TWLinks differ (${impTWLink} vs ${genTWLink}) and no disambiguation - created: ${newDisambiguation}`);
          } else {
            // Generated HAS disambiguation - add imported path to the beginning if not already present
            // Parse existing disambiguation: "(path1, path2)" -> ["path1", "path2"]
            const match = genDisambigValue.match(/^\(([^)]+)\)$/);
            if (match) {
              const existingPaths = match[1].split(',').map(p => p.trim());

              // Only add impPath if it's not already in the list
              if (!existingPaths.includes(impPath)) {
                const newPaths = [impPath, ...existingPaths];
                const newDisambiguation = `(${newPaths.join(', ')})`;
                finalRows[finalRowIndex][disambiguationIndex] = newDisambiguation;
                console.log(`  TWLinks differ (${impTWLink} vs ${genTWLink}) - added imported path to disambiguation: ${newDisambiguation}`);
              } else {
                console.log(`  TWLinks differ but imported path already in disambiguation: ${genDisambigValue}`);
              }
            }
          }
        }

        // Update status to MERGED
        finalRows[finalRowIndex][finalRows[finalRowIndex].length - 1] = 'MERGED';

        // Update cursor for this reference to point after this merged row
        referenceCursors.set(genRef, finalRowIndex + 1);
        console.log(`  Updated row ${finalRowIndex} to MERGED, cursor for ${genRef} set to ${finalRowIndex + 1}`);
      }

      matchedImportedIndices.add(matchedImportedIndex);

    } else {
      // No match found - insert as NEW
      console.log(`  No match found - will be added as NEW`);

      let insertIndex = finalRows.length; // Default to end

      // Check if we have a cursor for this reference (previous generated row was processed for this reference)
      if (referenceCursors.has(genRef)) {
        insertIndex = referenceCursors.get(genRef);
        console.log(`  Using existing cursor for ${genRef}: position ${insertIndex}`);
      } else {
        // First generated row for this reference - find where it should go before any imported rows of same/greater reference
        for (let i = 0; i < finalRows.length; i++) {
          const existingRef = finalRows[i][referenceIndex] || '';
          const cleanExistingRef = existingRef.startsWith('DELETED ') ? existingRef.substring(8) : existingRef;

          const comparison = compareReferences(genRef, cleanExistingRef);

          if (comparison <= 0) {
            insertIndex = i;
            break;
          }
        }
        console.log(`  First generated row for ${genRef}, inserting at position ${insertIndex}`);
      }

      // Pad generated row to match final headers length
      const paddedGeneratedRow = [...generatedRow];
      while (paddedGeneratedRow.length < finalHeaders.length - 1) {
        paddedGeneratedRow.push('');
      }

      // Insert the new row
      const newRow = [...paddedGeneratedRow, 'NEW'];
      finalRows.splice(insertIndex, 0, newRow);

      // Update cursor to after this insertion
      referenceCursors.set(genRef, insertIndex + 1);
      console.log(`  Inserted NEW row at position ${insertIndex}, updated cursor to ${insertIndex + 1}`);
    }
  });

  console.log(`\nFinal result: ${finalRows.length} total rows`);
  console.log(`Matched imported rows: ${matchedImportedIndices.size}`);
  console.log(`Total generated rows: ${generatedRows.length}`);

  // Rebuild the TSV content
  const result = [finalHeaders.join('\t'), ...finalRows.map(row => row.join('\t'))].join('\n');
  return result;
};