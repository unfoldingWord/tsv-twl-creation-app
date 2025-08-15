/**
 * Utilities for managing unlinked words in local storage
 */

const UNLINKED_WORDS_KEY = 'twl-unlinked-words';

/**
 * Normalize Hebrew text for comparison by removing cantillation marks and extra spaces
 */
const normalizeHebrewText = (text) => {
  if (!text) return '';

  // Remove Hebrew cantillation marks (Unicode range 0591-05BD)
  // and other Hebrew diacritical marks (05BF-05C7)
  return text
    .replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
      id: Date.now(), // Simple unique ID
      book,
      reference,
      origWords,
      twLink,
      glQuote,
      dateAdded: new Date().toISOString()
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
    item => normalizeHebrewText(item.origWords) === normalizedOrigWords &&
      item.twLink.trim() === normalizedTWLink
  );
};

/**
 * Filter out unlinked words from TSV content
 */
export const filterUnlinkedWords = (tsvContent) => {
  if (!tsvContent || typeof tsvContent !== 'string') {
    return tsvContent;
  }

  const unlinkedWords = getUnlinkedWords();
  if (unlinkedWords.length === 0) {
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
        id: Date.now() + Math.random(), // Ensure unique ID
        book: item.book || 'Imported',
        reference: item.reference || '',
        origWords: item.origWords,
        twLink: item.twLink,
        glQuote: item.glQuote || '',
        dateAdded: item.dateAdded || new Date().toISOString()
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
