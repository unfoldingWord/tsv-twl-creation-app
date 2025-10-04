/**
 * Custom hook for managing unlinked words with server-first loading
 */
import { useState, useEffect } from 'react';
import { getUnlinkedWords, addUnlinkedWord as addToLocal, removeUnlinkedWord as removeFromLocal, normalizeHebrewText } from '../utils/unlinkedWords.js';
import { getUnlinkedWordsFromServer, addUnlinkedWordToServer, removeUnlinkedWordFromServer, syncUnlinkedWordsWithServer } from '../services/unlinkedWordsApi.js';
import { getUserIdentifier, getCurrentTimestamp } from '../utils/userUtils.js';

export const useUnlinkedWords = () => {
  const [unlinkedWords, setUnlinkedWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load unlinked words on component mount
  useEffect(() => {
    loadUnlinkedWords();
  }, []);

  const loadUnlinkedWords = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load from server - this gets ALL users' data
      const serverWords = await getUnlinkedWordsFromServer();

      // Save server data to local storage (override what's there)
      localStorage.setItem('twl-unlinked-words', JSON.stringify(serverWords));

      setUnlinkedWords(serverWords);
    } catch (serverError) {
      console.warn('Failed to load from server, falling back to local storage:', serverError);

      // Fall back to local storage
      try {
        const localWords = getUnlinkedWords();
        setUnlinkedWords(localWords);
        setError('Using offline data - server unavailable');
      } catch (localError) {
        console.error('Failed to load from local storage:', localError);
        setError('Failed to load unlinked words');
        setUnlinkedWords([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const addUnlinkedWord = async (book, reference, origWords, twLink, glQuote) => {
    // Use normalized comparison for checking duplicates
    const normalizedOrigWords = normalizeHebrewText(origWords);
    const normalizedTWLink = twLink.trim();

    // Check if word already exists using normalized comparison
    const existingWordIndex = unlinkedWords.findIndex(word =>
      normalizeHebrewText(word.origWords) === normalizedOrigWords &&
      word.twLink.trim() === normalizedTWLink
    );

    if (existingWordIndex !== -1) {
      // Word already exists - return indication that it's a duplicate
      return { existing: true, word: unlinkedWords[existingWordIndex] };
    }

    // Add new word
    const newWord = {
      id: Date.now().toString(),
      book,
      reference,
      origWords,
      twLink,
      glQuote,
      userIdentifier: getUserIdentifier(),
      dateAdded: getCurrentTimestamp(),
    };

    setUnlinkedWords(prev => [...prev, newWord]);

    // Add to local storage
    const localWords = getUnlinkedWords();
    localWords.push(newWord);
    localStorage.setItem('twl-unlinked-words', JSON.stringify(localWords));

    try {
      // Save to server and return the response
      const serverResponse = await addUnlinkedWordToServer(book, reference, origWords, twLink, glQuote);
      return serverResponse;
    } catch (serverError) {
      console.warn('Failed to add to server, but local state already updated:', serverError);
      throw serverError;
    }
  };

  const removeUnlinkedWord = async (origWords, twLink) => {
    try {
      // Remove from server first
      await removeUnlinkedWordFromServer(origWords, twLink);

      // If server removal succeeds, remove from local state and storage
      const normalizedOrigWords = normalizeHebrewText(origWords);
      const normalizedTWLink = twLink.trim();

      // Remove from local state
      setUnlinkedWords(prev => prev.filter(word =>
        !(normalizeHebrewText(word.origWords) === normalizedOrigWords &&
          word.twLink.trim() === normalizedTWLink)
      ));

      // Remove from local storage
      const localWords = getUnlinkedWords();
      const filteredWords = localWords.filter(word =>
        !(normalizeHebrewText(word.origWords) === normalizedOrigWords &&
          word.twLink.trim() === normalizedTWLink)
      );
      localStorage.setItem('twl-unlinked-words', JSON.stringify(filteredWords));

    } catch (serverError) {
      console.error('Failed to remove from server:', serverError);
      throw serverError; // Re-throw so the UI can handle the error
    }
  };

  const refreshFromServer = async () => {
    await loadUnlinkedWords();
  };

  const refreshFromLocalStorage = () => {
    try {
      const localWords = getUnlinkedWords();
      setUnlinkedWords(localWords);
    } catch (error) {
      console.error('Failed to refresh from local storage:', error);
    }
  };

  return {
    unlinkedWords,
    loading,
    error,
    addUnlinkedWord,
    removeUnlinkedWord,
    refreshFromServer,
    refreshFromLocalStorage,
  };
};
