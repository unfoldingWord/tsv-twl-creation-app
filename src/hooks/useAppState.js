/**
 * Custom hook for managing main application state
 */
import { useState, useEffect } from 'react';
import { loadData, saveData } from '../utils/storage.js';
import { fetchBranches } from '../services/apiService.js';

export const useAppState = () => {
  // Load saved data
  const savedBook = loadData('selectedBook', true);
  const savedBranch = loadData('selectedBranch') || 'master';

  // Core state
  // Set DCS host based on URL parameter
  const getInitialDcsHost = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('server')) {
      const server = params.get('server').toLowerCase();
      if (server === 'qa') {
        return 'qa.door43.org';
      } else if (server === 'dev' || server === 'develop') {
        return 'develop.door43.org';
      } else if (server !== 'prod' && server !== 'production' && server !== 'git') {
        return server;
      } else {
        return 'git.door43.org';
      }
    }
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('--')) {
      return 'qa.door43.org';
    }
    return 'git.door43.org';
  };
  const [dcsHost, setDcsHost] = useState(getInitialDcsHost());
  const [selectedBook, setSelectedBook] = useState(savedBook);
  const [selectedBranch, setSelectedBranch] = useState(savedBranch);
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState('');

  // Content state
  const [usfmContent, setUsfmContent] = useState('');
  const [twlContent, setTwlContent] = useState('');
  const [existingTwlContent, setExistingTwlContent] = useState('');
  const [existingTwlContentWithGlQuotes, setExistingTwlContentWithGLQuotes] = useState('');

  // Load saved TWL content on mount if it matches the current book
  useEffect(() => {
    console.log('useAppState: Checking for saved TWL content...');
    console.log('selectedBook:', selectedBook);

    try {
      const savedTwl = loadData('generatedTwlContent');
      const savedTwlBook = loadData('generatedTwlBook');

      console.log('savedTwl exists:', !!savedTwl);
      console.log('savedTwlBook:', savedTwlBook);
      console.log('Current book value:', selectedBook?.value);

      // Only load if it's for the same book as currently selected
      if (savedTwl && savedTwlBook && selectedBook && savedTwlBook === selectedBook.value) {
        console.log('Loading saved TWL content for book:', selectedBook.value);
        setTwlContent(savedTwl);
      } else {
        console.log('Not loading TWL content - conditions not met');
      }
    } catch (error) {
      console.warn('Error loading saved TWL content:', error);
    }
  }, [selectedBook]); // Run when selectedBook changes

  // Debug: Log initial state on mount
  useEffect(() => {
    console.log('useAppState: Component mounted');
    console.log('Initial savedBook:', savedBook);
    console.log('Initial selectedBook:', selectedBook);
    console.log('localStorage check:', {
      generatedTwlContent: !!loadData('generatedTwlContent'),
      generatedTwlBook: loadData('generatedTwlBook'),
      selectedBook: loadData('selectedBook', true)
    });
  }, []); // Run only on mount

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'raw'
  const [existingTwlValid, setExistingTwlValid] = useState(true);

  // Fetch branches on component mount
  useEffect(() => {
    const loadBranches = async () => {
      setBranchesLoading(true);
      setBranchesError('');

      try {
        const branchNames = await fetchBranches(dcsHost);
        setBranches(branchNames);
      } catch (err) {
        setBranchesError(`Error loading branches: ${err.message}`);
      } finally {
        setBranchesLoading(false);
      }
    };

    loadBranches();
  }, []);

  // Save TWL content manually when specific actions occur
  // Note: We don't use useEffect here to avoid saving on every change
  // Instead, we save explicitly from App.jsx when user actions modify content

  /**
   * Manually save TWL content to localStorage
   * Used when specific user actions modify the content
   */
  const saveTwlContent = (contentToSave = null) => {
    const contentToUse = contentToSave || twlContent;
    console.log('saveTwlContent called');
    console.log('contentToSave param:', !!contentToSave);
    console.log('twlContent exists:', !!twlContent);
    console.log('contentToUse exists:', !!contentToUse);
    console.log('selectedBook:', selectedBook);

    if (contentToUse && selectedBook) {
      saveData('generatedTwlContent', contentToUse);
      saveData('generatedTwlBook', selectedBook.value);
      console.log('Manually saved TWL content for book:', selectedBook.value);
      console.log('Saved content length:', contentToUse.length);
    } else {
      console.log('Not saving - missing content or selectedBook');
    }
  };

  // Handle branch selection with persistence
  const handleBranchSelect = (event, value) => {
    const branchName = value?.value || 'master';
    console.log('Setting branch to:', branchName);
    setSelectedBranch(branchName);
    saveData('selectedBranch', branchName);
  };

  // Handle book selection with persistence and content clearing
  const handleBookSelect = (event, value) => {
    if (!value) {
      setSelectedBook(null);
      saveData('selectedBook', '');
      // Clear all content when book is deselected
      setUsfmContent('');
      setTwlContent('');
      setExistingTwlContent('');
      setExistingTwlContentWithGLQuotes('');
      setExistingTwlValid(true);
      setError('');
      // Clear saved TWL content
      saveData('generatedTwlContent', '');
      saveData('generatedTwlBook', '');
      return;
    }

    // Check if book actually changed
    const bookChanged = !selectedBook || selectedBook.value !== value.value;

    console.log('Setting book to:', value);
    setSelectedBook(value);
    saveData('selectedBook', value);

    // Clear all content when book changes (but not on initial load)
    if (bookChanged && selectedBook !== null) {
      console.log('Book changed, clearing content');
      setUsfmContent('');
      setTwlContent('');
      setExistingTwlContent('');
      setExistingTwlValid(true);
      setError('');
      // Clear saved TWL content
      saveData('generatedTwlContent', '');
      saveData('generatedTwlBook', '');
    }
  };

  return {
    // State values
    dcsHost,
    selectedBook,
    selectedBranch,
    branches,
    branchesLoading,
    branchesError,
    usfmContent,
    twlContent,
    existingTwlContent,
    existingTwlContentWithGlQuotes,
    loading,
    error,
    viewMode,
    existingTwlValid,

    // State setters
    setUsfmContent,
    setTwlContent,
    setExistingTwlContent,
    setExistingTwlContentWithGLQuotes,
    setLoading,
    setError,
    setViewMode,
    setExistingTwlValid,

    // Handlers
    handleBranchSelect,
    handleBookSelect,

    // Utilities
    saveTwlContent
  };
};
