/**
 * Utilities for applying deleted row markers to TSV content
 */

import { normalizeHebrewText } from './unlinkedWords.js';

/**
 * Apply server-provided deleted rows to TSV content for a given book.
 * Each deleted item matches by reference, normalized OrigWords, and Occurrence.
 * MERGED rows are excluded from automatic deletion - only NEW and OLD rows can be auto-deleted.
 */
export const filterDeletedRowsWithData = (tsvContent, deletedItems) => {
  if (!tsvContent || typeof tsvContent !== 'string' || !Array.isArray(deletedItems) || deletedItems.length === 0) {
    return tsvContent;
  }

  const lines = tsvContent.split('\n');
  if (lines.length === 0) return tsvContent;

  const headers = lines[0].split('\t');
  const referenceIndex = headers.findIndex((h) => h === 'Reference');
  const origWordsIndex = headers.findIndex((h) => h === 'OrigWords');
  const occurrenceIndex = headers.findIndex((h) => h === 'Occurrence');
  const mergeStatusIndex = headers.findIndex((h) => h === 'Merge Status');

  if (referenceIndex === -1 || origWordsIndex === -1 || occurrenceIndex === -1) {
    return tsvContent;
  }

  // Build a Set of composite keys for quick lookup
  const keySet = new Set(
    deletedItems.map((it) => `${it.reference}|${(it.normalizedOrigWords || normalizeHebrewText(it.origWords))}|${String(it.occurrence).trim()}`)
  );

  const updated = [lines[0]];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length <= Math.max(referenceIndex, origWordsIndex, occurrenceIndex)) {
      updated.push(lines[i]);
      continue;
    }

    const reference = cols[referenceIndex] || '';
    const displayRef = reference.startsWith('DELETED ') ? reference.substring(8) : reference;
    const origWords = cols[origWordsIndex] || '';
    const occurrence = String(cols[occurrenceIndex] || '').trim();
    const mergeStatus = mergeStatusIndex >= 0 ? (cols[mergeStatusIndex] || '') : '';
    const key = `${displayRef}|${normalizeHebrewText(origWords)}|${occurrence}`;

    // Only apply automatic deletion if:
    // 1. The row matches a deleted item in DynamoDB
    // 2. The row is not already deleted
    // 3. The row is NOT a MERGED row (preserve imported content)
    if (keySet.has(key) && !reference.startsWith('DELETED ') && mergeStatus !== 'MERGED' && mergeStatus !== 'OLD') {
      const updatedRow = [...cols];
      updatedRow[referenceIndex] = `DELETED ${displayRef}`;
      updated.push(updatedRow.join('\t'));
      console.log(`Auto-deleted ${mergeStatus || 'unmerged'} row: ${displayRef} | ${origWords} | ${occurrence}`);
    } else {
      if (keySet.has(key) && (mergeStatus === 'MERGED' || mergeStatus === 'OLD')) {
        console.log(`Skipped auto-deletion of ${mergeStatus} row: ${displayRef} | ${origWords} | ${occurrence}`);
      }
      updated.push(lines[i]);
    }
  }

  return updated.join('\n');
};

