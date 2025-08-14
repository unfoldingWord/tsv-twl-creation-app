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
  const [selectedBook, setSelectedBook] = useState(savedBook);
  const [selectedBranch, setSelectedBranch] = useState(savedBranch);
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState('');

  // Content state
  const [usfmContent, setUsfmContent] = useState('');
  const [twlContent, setTwlContent] = useState('');
  const [existingTwlContent, setExistingTwlContent] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOnlySixColumns, setShowOnlySixColumns] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'raw'
  const [showExistingTwlTextArea, setShowExistingTwlTextArea] = useState(false);
  const [existingTwlValid, setExistingTwlValid] = useState(true);

  // Fetch branches on component mount
  useEffect(() => {
    const loadBranches = async () => {
      setBranchesLoading(true);
      setBranchesError('');

      try {
        const branchNames = await fetchBranches();
        setBranches(branchNames);
      } catch (err) {
        setBranchesError(`Error loading branches: ${err.message}`);
      } finally {
        setBranchesLoading(false);
      }
    };

    loadBranches();
  }, []);

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
      setShowExistingTwlTextArea(false);
      setExistingTwlValid(true);
      setError('');
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
      setShowExistingTwlTextArea(false);
      setExistingTwlValid(true);
      setError('');
    }
  };

  return {
    // State values
    selectedBook,
    selectedBranch,
    branches,
    branchesLoading,
    branchesError,
    usfmContent,
    twlContent,
    existingTwlContent,
    loading,
    error,
    showOnlySixColumns,
    viewMode,
    showExistingTwlTextArea,
    existingTwlValid,

    // State setters
    setUsfmContent,
    setTwlContent,
    setExistingTwlContent,
    setLoading,
    setError,
    setShowOnlySixColumns,
    setViewMode,
    setShowExistingTwlTextArea,
    setExistingTwlValid,

    // Handlers
    handleBranchSelect,
    handleBookSelect
  };
};
