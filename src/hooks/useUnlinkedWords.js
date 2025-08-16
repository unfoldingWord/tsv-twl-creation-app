/**
 * Custom hook for managing unlinked words with server-first loading
 */
import { useState, useEffect } from 'react';
import { getUnlinkedWords, addUnlinkedWord as addToLocal, removeUnlinkedWord as removeFromLocal } from '../utils/unlinkedWords.js';
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
    // Check if word already exists (possibly as removed)
    const existingWordIndex = unlinkedWords.findIndex(word =>
      word.origWords === origWords && word.twLink === twLink
    );

    if (existingWordIndex !== -1) {
      // Word exists - if it's removed, just set removed = false
      if (unlinkedWords[existingWordIndex].removed) {
        const updatedWord = {
          ...unlinkedWords[existingWordIndex],
          removed: false,
          lastModified: getCurrentTimestamp()
        };

        setUnlinkedWords(prev =>
          prev.map((word, index) =>
            index === existingWordIndex ? updatedWord : word
          )
        );

        // Update local storage
        const localWords = getUnlinkedWords();
        const localIndex = localWords.findIndex(w => w.origWords === origWords && w.twLink === twLink);
        if (localIndex !== -1) {
          localWords[localIndex] = { ...localWords[localIndex], removed: false };
          localStorage.setItem('twl-unlinked-words', JSON.stringify(localWords));
        }
      }
      // If it already exists and is not removed, do nothing

    } else {
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
        removed: false
      };

      setUnlinkedWords(prev => [...prev, newWord]);

      // Add to local storage
      const localWords = getUnlinkedWords();
      localWords.push(newWord);
      localStorage.setItem('twl-unlinked-words', JSON.stringify(localWords));
    }

    try {
      // Save to server in background
      await addUnlinkedWordToServer(book, reference, origWords, twLink, glQuote);
    } catch (serverError) {
      console.warn('Failed to add to server, but local state already updated:', serverError);
    }
  };

  const removeUnlinkedWord = async (origWords, twLink) => {
    // Optimistically update local state immediately for instant UI response
    setUnlinkedWords(prev => prev.map(word =>
      (word.origWords === origWords && word.twLink === twLink)
        ? { ...word, removed: true, removedBy: getUserIdentifier(), lastModified: getCurrentTimestamp() }
        : word
    ));

    // Update local storage with removed status
    const localWords = getUnlinkedWords();
    const localIndex = localWords.findIndex(w => w.origWords === origWords && w.twLink === twLink);
    if (localIndex !== -1) {
      localWords[localIndex] = {
        ...localWords[localIndex],
        removed: true,
        removedBy: getUserIdentifier(),
        lastModified: getCurrentTimestamp()
      };
      localStorage.setItem('twl-unlinked-words', JSON.stringify(localWords));
    }

    try {
      // Save to server in background
      await removeUnlinkedWordFromServer(origWords, twLink);
    } catch (serverError) {
      console.warn('Failed to remove from server, but local state already updated:', serverError);
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
