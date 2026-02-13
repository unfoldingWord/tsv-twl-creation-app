/**
 * Utilities for ordering TWL rows based on their position in ULT Bible verses
 */

import { toJSON } from 'usfm-js';
import { fetchUSFMContent } from '../services/apiService.js';
import { normalizeHebrewText } from './unlinkedWords.js';
import { parseTsv } from './tsvUtils.js';

/**
 * Fetch ULT USFM content for a book
 */
export const fetchUltUsfm = async (bookCode, dcsHost = 'https://git.door43.org') => {
  return fetchUSFMContent((bookCode || '').toLowerCase(), 'ult', dcsHost);
};

/**
 * Parse USFM to extract verse text
 * Returns a map of "chapter:verse" -> verse text
 */
export const parseUsfmVerses = (usfmContent) => {
  const verseMap = new Map();

  const collectText = (input, parts = []) => {
    if (!input) return parts;

    if (Array.isArray(input)) {
      input.forEach((item) => collectText(item, parts));
      return parts;
    }

    if (typeof input === 'object') {
      if (typeof input.text === 'string' && input.text.trim()) {
        parts.push(input.text.trim());
      }

      if (Array.isArray(input.verseObjects)) {
        collectText(input.verseObjects, parts);
      }

      if (Array.isArray(input.children)) {
        collectText(input.children, parts);
      }
    }

    return parts;
  };

  const normalizeVerseText = (text) => {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .trim();
  };

  const addVerseEntry = (chapterNum, verseKey, verseText) => {
    const rangeMatch = verseKey.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end) {
        for (let verse = start; verse <= end; verse++) {
          verseMap.set(`${chapterNum}:${verse}`, verseText);
        }
      }
      return;
    }

    const singleMatch = verseKey.match(/^(\d+)/);
    if (singleMatch) {
      verseMap.set(`${chapterNum}:${singleMatch[1]}`, verseText);
    }
  };

  try {
    const usfmJson = toJSON(usfmContent);
    const chapters = usfmJson?.chapters || {};

    Object.entries(chapters).forEach(([chapterKey, chapterData]) => {
      if (!chapterData || chapterKey === 'front') return;

      Object.entries(chapterData).forEach(([verseKey, verseData]) => {
        if (verseKey === 'front' || !verseData) return;
        const text = normalizeVerseText(collectText(verseData).join(' '));
        if (!text) return;
        addVerseEntry(chapterKey, verseKey, text);
      });
    });
  } catch (error) {
    console.warn('📖 [VERSE-ORDER] Failed to parse USFM with usfm-js:', error);
  }

  return verseMap;
};

/**
 * Find the position of a GLQuote in verse text based on occurrence
 */
export const findGLQuotePosition = (verseText, glQuote, occurrence) => {
  if (!verseText || !glQuote) return -1;

  const normalizeForSearch = (text, stripPunctuation = false) => {
    if (!text) return '';
    let normalized = text.toLowerCase();

    // USFM add-markers often become "{ with }" while GLQuote might be "with}" or "{with}".
    // Normalize all bracket-like markers to spaces so phrase matching still works.
    normalized = normalized
      .replace(/[{}[\]<>]/g, ' ')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");

    if (stripPunctuation) {
      normalized = normalized.replace(/[.,;:!?"']/g, ' ');
    }

    return normalized.replace(/\s+/g, ' ').trim();
  };

  const findOccurrencePosition = (haystack, needle, targetOccurrence) => {
    if (!haystack || !needle) return -1;
    let currentOccurrence = 0;
    let searchPos = 0;

    while (searchPos < haystack.length) {
      const foundPos = haystack.indexOf(needle, searchPos);
      if (foundPos === -1) return -1;
      currentOccurrence++;
      if (currentOccurrence === targetOccurrence) return foundPos;
      searchPos = foundPos + needle.length;
    }
    return -1;
  };

  const quoteParts = glQuote
    .trim()
    .toLowerCase()
    .split('&')
    .map((p) => p.trim())
    .filter((p) => p);

  // For multi-part quotes, use the first part
  const searchQuote = quoteParts[0];
  const normalizedOccurrence = Number.isFinite(occurrence) ? occurrence : parseInt(occurrence || '1', 10) || 1;

  const strictVerse = normalizeForSearch(verseText, false);
  const strictQuote = normalizeForSearch(searchQuote, false);
  const strictPosition = findOccurrencePosition(strictVerse, strictQuote, normalizedOccurrence);
  if (strictPosition !== -1) return strictPosition;

  const looseVerse = normalizeForSearch(verseText, true);
  const looseQuote = normalizeForSearch(searchQuote, true);
  const loosePosition = findOccurrencePosition(looseVerse, looseQuote, normalizedOccurrence);
  if (loosePosition !== -1) return loosePosition;

  return -1; // Not found for this occurrence
};

const normalizeHeader = (header) => (header || '').replace(/^\uFEFF/, '').trim();
const normalizeReference = (reference) => (reference || '').replace(/^DELETED\s+/, '').trim();
const normalizeTwLink = (twLink) => (twLink || '').replace(/^rc:\/\/\*\/tw\/dict\/bible\//, '').trim().toLowerCase();
const normalizeGlQuote = (glQuote) => (glQuote || '').trim().toLowerCase().replace(/\s+/g, ' ');
const normalizeOccurrence = (value, fallback = '1') => {
  const normalized = (value || '').toString().trim();
  return normalized || fallback;
};

const getMergeStatusPriority = (mergeStatus) => {
  const status = (mergeStatus || '').trim().toUpperCase();
  if (status === 'MERGED') return 3;
  if (status === 'NEW') return 2;
  if (status === 'OLD') return 1;
  return 0;
};

const getRowCompleteness = (row = []) => row.reduce((count, col) => (col && col.trim() ? count + 1 : count), 0);

const createDuplicateKey = ({
  reference,
  origWords,
  occurrence,
  twLink,
  glQuote,
  glOccurrence,
}) => {
  if (origWords) {
    return `source|${reference}|${origWords}|${occurrence}|${twLink}`;
  }
  return `quote|${reference}|${glQuote}|${glOccurrence}|${twLink}`;
};

/**
 * Order TWL rows within each verse based on their GLQuote position in ULT
 */
export const orderRowsByVersePosition = async (tsvContent, bookCode, dcsHost = 'https://git.door43.org') => {
  console.log('📖 [VERSE-ORDER] Starting verse-based reordering for book:', bookCode);
  if (!tsvContent || typeof tsvContent !== 'string') {
    return tsvContent;
  }

  // Parse TSV content first so deduplication can still run even if USFM fetch fails.
  const parsed = parseTsv(tsvContent, true);
  const headers = parsed.headers;
  const rows = parsed.rows;
  const normalizedHeaders = headers.map(normalizeHeader);

  const referenceIndex = normalizedHeaders.findIndex((h) => h === 'Reference');
  const glQuoteIndex = normalizedHeaders.findIndex((h) => h === 'GLQuote');
  const glOccurrenceIndex = normalizedHeaders.findIndex((h) => h === 'GLOccurrence');
  const origWordsIndex = normalizedHeaders.findIndex((h) => h === 'OrigWords');
  const twLinkIndex = normalizedHeaders.findIndex((h) => h === 'TWLink');
  const occurrenceIndex = normalizedHeaders.findIndex((h) => h === 'Occurrence');
  const mergeStatusIndex = normalizedHeaders.findIndex((h) => h === 'Merge Status');

  if (referenceIndex === -1 || glQuoteIndex === -1 || glOccurrenceIndex === -1) {
    console.warn('📖 [VERSE-ORDER] Missing required columns, skipping reordering');
    return tsvContent;
  }

  let verseMap = new Map();
  try {
    const usfmContent = await fetchUltUsfm(bookCode, dcsHost);
    verseMap = parseUsfmVerses(usfmContent);
    console.log('📖 [VERSE-ORDER] Parsed', verseMap.size, 'verses from ULT');
  } catch (error) {
    console.warn('📖 [VERSE-ORDER] Could not fetch/parse ULT, proceeding with dedupe-only mode:', error);
  }

  // Group rows by verse while preserving first-seen verse order.
  const verseGroups = new Map();
  rows.forEach((row, rowIndex) => {
    const reference = normalizeReference(row[referenceIndex] || '');
    if (!reference) return;

    if (!verseGroups.has(reference)) {
      verseGroups.set(reference, []);
    }
    verseGroups.get(reference).push({ row, rowIndex });
  });

  console.log('📖 [VERSE-ORDER] Grouped into', verseGroups.size, 'verses');

  let reorderedCount = 0;
  let duplicatesRemovedCount = 0;

  for (const [reference, verseRows] of verseGroups.entries()) {
    const duplicateMap = new Map();

    verseRows.forEach((entry, groupIndex) => {
      const row = entry.row;
      const mergeStatus = mergeStatusIndex >= 0 ? (row[mergeStatusIndex] || '').trim().toUpperCase() : '';
      const origWords = origWordsIndex >= 0 ? normalizeHebrewText(row[origWordsIndex] || '') : '';
      const occurrence = occurrenceIndex >= 0 ? normalizeOccurrence(row[occurrenceIndex], '1') : '1';
      const twLink = twLinkIndex >= 0 ? normalizeTwLink(row[twLinkIndex] || '') : '';
      const glQuote = normalizeGlQuote(row[glQuoteIndex] || '');
      const glOccurrence = normalizeOccurrence(row[glOccurrenceIndex], occurrence);

      const key = createDuplicateKey({
        reference,
        origWords,
        occurrence,
        twLink,
        glQuote,
        glOccurrence,
      });

      const item = {
        ...entry,
        groupIndex,
        mergeStatus,
        glQuote,
        glOccurrence,
        origWords,
        occurrence,
      };

      if (!duplicateMap.has(key)) {
        duplicateMap.set(key, []);
      }
      duplicateMap.get(key).push(item);
    });

    const dedupedRows = [];

    for (const [key, duplicateGroup] of duplicateMap.entries()) {
      if (duplicateGroup.length === 1) {
        dedupedRows.push(duplicateGroup[0]);
        continue;
      }

      const sortedByPreference = [...duplicateGroup].sort((a, b) => {
        const mergePriorityDiff = getMergeStatusPriority(b.mergeStatus) - getMergeStatusPriority(a.mergeStatus);
        if (mergePriorityDiff !== 0) return mergePriorityDiff;

        const completenessDiff = getRowCompleteness(b.row) - getRowCompleteness(a.row);
        if (completenessDiff !== 0) return completenessDiff;

        return a.groupIndex - b.groupIndex;
      });

      const preferred = sortedByPreference[0];
      dedupedRows.push(preferred);
      duplicatesRemovedCount += duplicateGroup.length - 1;

      console.log(`📖 [VERSE-ORDER] Found ${duplicateGroup.length} duplicates for ${reference}: key="${key}"`);
      console.log(
        `📖 [VERSE-ORDER]   Keeping ${preferred.mergeStatus || '(none)'} row "${preferred.glQuote}" and removing ${duplicateGroup.length - 1}`
      );
    }

    dedupedRows.sort((a, b) => a.groupIndex - b.groupIndex);
    const verseText = verseMap.get(reference);

    if (!verseText) {
      if (verseMap.size > 0) {
        console.warn(`📖 [VERSE-ORDER] No ULT text found for ${reference}; keeping deduped original order`);
      }
      verseGroups.set(reference, dedupedRows);
      continue;
    }

    const rowsWithPosition = dedupedRows.map((entry) => {
      const occurrence = parseInt(entry.glOccurrence || '1', 10) || 1;
      const position = findGLQuotePosition(verseText, entry.glQuote, occurrence);
      return {
        ...entry,
        position,
      };
    });

    const originalOrder = rowsWithPosition.map((item) => item.groupIndex).join(',');

    rowsWithPosition.sort((a, b) => {
      if (a.position === -1 && b.position === -1) return a.groupIndex - b.groupIndex;
      if (a.position === -1) return 1;
      if (b.position === -1) return -1;
      if (a.position !== b.position) return a.position - b.position;
      return a.groupIndex - b.groupIndex;
    });

    const reordered = rowsWithPosition.map((item) => item.groupIndex).join(',');
    if (originalOrder !== reordered) {
      reorderedCount++;
      console.log(`📖 [VERSE-ORDER] Reordered ${reference}: ${rowsWithPosition.length} rows`);
    }

    verseGroups.set(reference, rowsWithPosition);
  }

  console.log(`📖 [VERSE-ORDER] Reordered ${reorderedCount} verses`);
  console.log(`📖 [VERSE-ORDER] Removed ${duplicatesRemovedCount} duplicate rows`);

  const orderedRows = [];
  for (const verseRows of verseGroups.values()) {
    verseRows.forEach((entry) => orderedRows.push(entry.row));
  }

  return [headers.join('\t'), ...orderedRows.map((row) => row.join('\t'))].join('\n');
};
