/**
 * API functions for managing unlinked words on the server
 */
import { getUserIdentifier } from '../utils/userUtils.js';

/**
 * Add an unlinked word to the server
 */
export const addUnlinkedWordToServer = async (book, reference, origWords, twLink, glQuote) => {
  try {
    const response = await fetch('/.netlify/functions/add-unlinked-word', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        book,
        reference,
        origWords,
        twLink,
        glQuote,
        userIdentifier: getUserIdentifier(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error adding unlinked word to server:', error);
    throw error;
  }
};

/**
 * Mark an unlinked word as removed on the server
 */
export const removeUnlinkedWordFromServer = async (origWords, twLink) => {
  try {
    const response = await fetch('/.netlify/functions/remove-unlinked-word', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origWords,
        twLink,
        userIdentifier: getUserIdentifier(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error removing unlinked word from server:', error);
    throw error;
  }
};

/**
 * Get all unlinked words for ALL users from the server (global data sharing)
 */
export const getUnlinkedWordsFromServer = async (includeRemoved = false) => {
  try {
    const params = new URLSearchParams({
      // Don't filter by userIdentifier - get ALL unlinked words from ALL users
      includeRemoved: includeRemoved.toString(),
    });

    const response = await fetch(`/.netlify/functions/get-unlinked-words?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.items || [];
  } catch (error) {
    console.error('Error getting unlinked words from server:', error);
    throw error;
  }
};

/**
 * Sync local unlinked words with server
 */
export const syncUnlinkedWordsWithServer = async (localUnlinkedWords) => {
  try {
    // Get server words
    const serverWords = await getUnlinkedWordsFromServer();

    // Upload any local words that aren't on server
    for (const localWord of localUnlinkedWords) {
      const existsOnServer = serverWords.some(
        serverWord =>
          serverWord.origWords === localWord.origWords &&
          serverWord.twLink === localWord.twLink
      );

      if (!existsOnServer) {
        await addUnlinkedWordToServer(
          localWord.book,
          localWord.reference,
          localWord.origWords,
          localWord.twLink,
          localWord.glQuote
        );
      }
    }

    // Return updated server words
    return await getUnlinkedWordsFromServer();
  } catch (error) {
    console.error('Error syncing with server:', error);
    throw error;
  }
};
