/**
 * Utilities for managing unlinked words in local storage
 */

import { getCurrentTimestamp, generateUniqueId } from './userUtils.js';

const UNLINKED_WORDS_KEY = 'twl-unlinked-words';

/**
 * Normalize Hebrew text for comparison by removing cantillation marks and extra spaces
 */
export const normalizeHebrewText = (text) => {
  if (!text) return '';

  // Remove Hebrew cantillation marks (Unicode range 0591-05BD)
  // and other Hebrew diacritical marks (05BF-05C7)
  // Also remove maqqef (־) and other punctuation that might interfere with matching
  return text
    .replace(/[\u0591-\u05BD\u05BF-\u05C7\u05BE\u05C0\u05C3\u05C6]/g, '')
    .replace(/[\u2000-\u200F\u2028-\u202F]/g, ' ') // Replace various Unicode spaces with regular space
    .replace(/\s+/g, ' ')
    .trim();
};

export const tokenizeQuote = (quote, isOrigLang = true) => {
  const cleanQuote = cleanQuoteString(quote);
  const quotesArray = cleanQuote
    .split(/\s?&\s?/)
    .flatMap((partialQuote) => tokenizer(partialQuote, isOrigLang).concat("&"))
    .slice(0, -1);
  return quotesArray;
};

export const normalize = (str = "", isOrigLang = false) => {
  const tokens = tokenizeQuote(str, isOrigLang).join(" ").trim();
  return tokens;
};

export const cleanQuoteString = (quote) => {
  return (
    quote
      // replace smart closing quotation mark with correct one
      .replace(/”/gi, '"')
      // remove space before smart opening quotation mark
      .replace(/“ /gi, '"')
      // replace smart opening quotation mark with correct one
      .replace(/“/gi, '"')
      // add space after
      .replace(/,"/gi, ', "')
      // remove space after opening quotation mark
      .replace(/, " /gi, ', "')
      // remove spaces before question marks
      .replace(/\s+([?])/gi, "$1")
      // remove double spaces
      .replace(/ {2}/gi, " ")
      // remove spaces before commas
      .replace(/ , /gi, ", ")
      // remove spaces before periods
      .replace(/ ."/gi, '."')
      // remove space before apostrophes
      .replace(/ ’./gi, "’.")
      .trim()
      .replace(/ *\.{3} */g, ` ${QUOTE_ELLIPSIS} `)
      .replace(/ *… */gi, ` ${QUOTE_ELLIPSIS} `)
      .replaceAll(/\\n|\\r/g, "")
  );
};

/**
 * Get all unlinked words from local storage
 */
export const getUnlinkedWords = () => {
  try {
    const stored = localStorage.getItem(UNLINKED_WORDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading unlinked words:', error);
    return [];
  }
};

/**
 * Save unlinked words to local storage
 */
export const saveUnlinkedWords = (unlinkedWords) => {
  try {
    localStorage.setItem(UNLINKED_WORDS_KEY, JSON.stringify(unlinkedWords));
  } catch (error) {
    console.error('Error saving unlinked words:', error);
  }
};

/**
 * Add a word to the unlinked words list
 */
export const addUnlinkedWord = (book, reference, origWords, twLink, glQuote) => {
  const unlinkedWords = getUnlinkedWords();

  // Normalize texts for comparison
  const normalizedOrigWords = normalizeHebrewText(origWords);
  const normalizedTWLink = twLink.trim();

  // Check if this combination already exists (using normalized comparison)
  const existingIndex = unlinkedWords.findIndex(
    item => normalizeHebrewText(item.origWords) === normalizedOrigWords &&
      item.twLink.trim() === normalizedTWLink
  );

  if (existingIndex === -1) {
    // Add new unlinked word
    unlinkedWords.push({
      id: generateUniqueId(), // Simple unique ID
      book,
      reference,
      origWords,
      twLink,
      glQuote,
      dateAdded: getCurrentTimestamp()
    });

    saveUnlinkedWords(unlinkedWords);
    console.log(`Added unlinked word: OrigWords="${origWords}" (normalized: "${normalizedOrigWords}"), TWLink="${twLink}"`);
  } else {
    console.log(`Unlinked word already exists: OrigWords="${origWords}" (normalized: "${normalizedOrigWords}"), TWLink="${twLink}"`);
  }

  return unlinkedWords;
};

/**
 * Remove a word from the unlinked words list by ID
 */
export const removeUnlinkedWord = (id) => {
  const unlinkedWords = getUnlinkedWords();
  const filteredWords = unlinkedWords.filter(item => item.id !== id);
  saveUnlinkedWords(filteredWords);
  return filteredWords;
};

/**
 * Remove a word from the unlinked words list by OrigWords and TWLink combination
 */
export const removeUnlinkedWordByContent = (origWords, twLink) => {
  const unlinkedWords = getUnlinkedWords();
  const filteredWords = unlinkedWords.filter(
    item => !(item.origWords === origWords && item.twLink === twLink)
  );
  saveUnlinkedWords(filteredWords);
  return filteredWords;
};

/**
 * Check if a word combination should be unlinked
 */
export const isWordUnlinked = (origWords, twLink) => {
  const unlinkedWords = getUnlinkedWords();
  const normalizedOrigWords = normalizeHebrewText(origWords);
  const normalizedTWLink = twLink.trim();

  return unlinkedWords.some(
    item => !item.removed && // Only consider non-removed items
      normalizedOrigWords.includes(normalizeHebrewText(item.origWords)) &&
      item.twLink.trim() === normalizedTWLink
  );
};

/**
 * Filter TSV content based on provided unlinked words data (respects 'removed' status)
 */
export const filterUnlinkedWordsWithData = (tsvContent, unlinkedWordsData) => {
  if (!tsvContent || typeof tsvContent !== 'string') {
    return tsvContent;
  }

  // Only use non-removed unlinked words for filtering
  const activeUnlinkedWords = unlinkedWordsData.filter(word => !word.removed);

  if (activeUnlinkedWords.length === 0) {
    return tsvContent;
  }

  const lines = tsvContent.split('\n');
  if (lines.length === 0) return tsvContent;

  const headers = lines[0].split('\t');
  const origWordsIndex = headers.findIndex(h => h === 'OrigWords');
  const twLinkIndex = headers.findIndex(h => h === 'TWLink');

  if (origWordsIndex === -1 || twLinkIndex === -1) {
    return tsvContent; // Can't filter without required columns
  }

  // Keep header and filter data rows
  const filteredLines = [lines[0]]; // Keep header

  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split('\t');
    if (columns.length > Math.max(origWordsIndex, twLinkIndex)) {
      const origWords = columns[origWordsIndex];
      const twLink = columns[twLinkIndex];

      // Check if this combination should be filtered out
      const shouldFilter = activeUnlinkedWords.some(unlinkedWord => {
        const normalizedOrigWords = normalizeHebrewText(origWords);
        const normalizedUnlinkedOrigWords = normalizeHebrewText(unlinkedWord.origWords);
        const normalizedTWLink = twLink.trim();
        const normalizedUnlinkedTWLink = unlinkedWord.twLink.trim();

        return normalizedOrigWords === normalizedUnlinkedOrigWords &&
          normalizedTWLink === normalizedUnlinkedTWLink;
      });

      if (!shouldFilter) {
        filteredLines.push(lines[i]);
      }
    } else {
      // Keep lines that don't have enough columns (probably empty lines)
      filteredLines.push(lines[i]);
    }
  }

  return filteredLines.join('\n');
};

/**
 * Filter TSV content based on local unlinked words data (legacy function)
 */
export const filterUnlinkedWords = (tsvContent) => {
  if (!tsvContent || typeof tsvContent !== 'string') {
    return tsvContent;
  }

  const unlinkedWords = getUnlinkedWords();

  // Only use non-removed unlinked words for filtering
  const activeUnlinkedWords = unlinkedWords.filter(word => !word.removed);

  if (activeUnlinkedWords.length === 0) {
    return tsvContent;
  }

  const lines = tsvContent.split('\n');
  if (lines.length === 0) return tsvContent;

  const headers = lines[0].split('\t');
  const origWordsIndex = headers.findIndex(h => h === 'OrigWords');
  const twLinkIndex = headers.findIndex(h => h === 'TWLink');

  if (origWordsIndex === -1 || twLinkIndex === -1) {
    return tsvContent; // Can't filter without required columns
  }

  // Keep header and filter data rows
  const filteredLines = [lines[0]]; // Keep header

  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split('\t');
    if (columns.length > Math.max(origWordsIndex, twLinkIndex)) {
      const origWords = columns[origWordsIndex];
      const twLink = columns[twLinkIndex];

      // Keep row if it's not in the unlinked words list
      if (!isWordUnlinked(origWords, twLink)) {
        filteredLines.push(lines[i]);
      }
    } else {
      // Keep malformed rows as-is
      filteredLines.push(lines[i]);
    }
  }

  return filteredLines.join('\n');
};

/**
 * Import unlinked words from JSON data, avoiding duplicates
 */
export const importUnlinkedWords = (importData) => {
  if (!Array.isArray(importData)) {
    throw new Error('Import data must be an array');
  }

  const currentUnlinkedWords = getUnlinkedWords();
  let addedCount = 0;
  let skippedCount = 0;

  importData.forEach(item => {
    // Validate required fields
    if (!item.origWords || !item.twLink) {
      console.warn('Skipping invalid import item:', item);
      skippedCount++;
      return;
    }

    // Check if this combination already exists (using normalized comparison)
    const normalizedOrigWords = normalizeHebrewText(item.origWords);
    const normalizedTWLink = item.twLink.trim();

    const exists = currentUnlinkedWords.some(
      existing => normalizeHebrewText(existing.origWords) === normalizedOrigWords &&
        existing.twLink.trim() === normalizedTWLink
    );

    if (!exists) {
      // Add new unlinked word
      currentUnlinkedWords.push({
        id: generateUniqueId(), // Ensure unique ID
        book: item.book || 'Imported',
        reference: item.reference || '',
        origWords: item.origWords,
        twLink: item.twLink,
        glQuote: item.glQuote || '',
        dateAdded: item.dateAdded || getCurrentTimestamp()
      });
      addedCount++;
    } else {
      console.log(`Skipping duplicate: ${item.origWords} -> ${item.twLink}`);
      skippedCount++;
    }
  });

  saveUnlinkedWords(currentUnlinkedWords);

  return {
    added: addedCount,
    skipped: skippedCount,
    total: importData.length
  };
};
