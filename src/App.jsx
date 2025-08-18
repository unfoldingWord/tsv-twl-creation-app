/**
 * TSV TWL Creation App - Main Application Component
 *
 * A React application for creating and managing Translation Word Lists (TWL)
 * from USFM content. Supports merging with existing TWL data and interactive
 * table editing.
 *
 * Features:
 * - Book and branch selection with persistence
 * - USFM content loading (paste/upload/fetch)
 * - TWL generation from USFM using external libraries
 * - Existing TWL merging with conflict resolution
 * - Interactive table view with row deletion and disambiguation options
 * - Export functionality for processed TWL data
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Card,
  CardContent,
  Autocomplete,
  TextField,
  CircularProgress,
  Alert,
  Box,
  FormControlLabel,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
} from '@mui/material';
import {
  ContentPaste as PasteIcon,
  Upload as UploadIcon,
  CloudDownload as DownloadIcon,
  Undo as UndoIcon,
  Save as SaveIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ManageAccounts as ManageIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Internal imports
import { BibleBookData } from '@common/books';
import { useAppState } from './hooks/useAppState.js';
import { useTableData } from './hooks/useTableData.js';
import TWLTable from './components/TWLTable.jsx';
import UnlinkedWordsManager from './components/UnlinkedWordsManager.jsx';
import { fetchUSFMContent, fetchTWLContent } from './services/apiService.js';
import { mergeExistingTwls } from './services/twlService.js';
import {
  isValidTsvStructure,
  isValidExtendedTsvStructure,
  isExtendedTsvFormat,
  processTsvContent,
  addGLQuoteColumns,
  ensureUniqueIds,
  normalizeTsvColumnCount,
} from './utils/tsvUtils.js';
import { convertReferenceToTnUrl } from './utils/urlConverters.js';
import { filterUnlinkedWords, removeUnlinkedWordByContent, getUnlinkedWords } from './utils/unlinkedWords.js';
import { getUserIdentifier } from './utils/userUtils.js';
import { useUnlinkedWords } from './hooks/useUnlinkedWords.js';

// External TWL processing libraries
import { generateTWLWithUsfm } from 'twl-generator';
import { convertGLQuotes2OLQuotes, addGLQuoteCols } from 'tsv-quote-converters';

// Material-UI theme configuration
const theme = createTheme({
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

/**
 * Main Application Component
 */
function App() {
  // Custom hooks for state management
  const {
    // State values
    selectedBook,
    selectedBranch,
    branches,
    branchesLoading,
    branchesError,
    usfmContent,
    twlContent,
    existingTwlContent,
    existingTwlContentWithGLQuotes,
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
    saveTwlContent,
  } = useAppState();

  // Unlinked words management with server-first loading
  const { addUnlinkedWord } = useUnlinkedWords();

  // Process TWL content based on column visibility setting
  const processedTsvContent = useMemo(() => processTsvContent(twlContent), [twlContent]);

  // Table data management (now just parsing, no independent state)
  const { tableData } = useTableData(processedTsvContent);

  // Backup/restore system for undo functionality
  const [backupTwlContent, setBackupTwlContent] = useState(null);
  const hasBackup = Boolean(backupTwlContent);

  // Track original content when entering raw text mode
  const [rawTextOriginalContent, setRawTextOriginalContent] = useState(null);

  // Clear backup when book changes
  useEffect(() => {
    setBackupTwlContent(null);
    setRawTextOriginalContent(null);
  }, [selectedBook?.value]); // Only trigger on book value change, not branch

  // Download menu state
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);
  const downloadMenuOpen = Boolean(downloadMenuAnchor);

  // Unlinked words dialog state
  const [unlinkedWordsDialogOpen, setUnlinkedWordsDialogOpen] = useState(false);

  // DCS commit modal state
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitForm, setCommitForm] = useState({
    name: '',
    email: '',
    message: '',
    errors: {},
    submitting: false,
    result: null,
  });

  // Handle download menu open/close
  const handleDownloadMenuClick = (event) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchor(null);
  };

  /**
   * Handle opening/closing unlinked words dialog
   */
  const handleUnlinkedWordsDialogOpen = () => {
    setUnlinkedWordsDialogOpen(true);
  };

  const handleUnlinkedWordsDialogClose = () => {
    setUnlinkedWordsDialogOpen(false);
  };

  /**
   * Handle opening/closing DCS commit modal
   */
  const handleCommitModalOpen = () => {
    // Load saved credentials from localStorage
    const savedName = localStorage.getItem('dcs-commit-name') || '';
    const savedEmail = localStorage.getItem('dcs-commit-email') || '';
    setCommitForm({
      name: savedName,
      email: savedEmail,
      message: '',
      errors: {},
      submitting: false,
      result: null,
    });
    setCommitModalOpen(true);
  };

  const handleCommitModalClose = () => {
    setCommitModalOpen(false);
    setCommitForm((prev) => ({
      ...prev,
      submitting: false,
      result: null,
      errors: {},
    }));
  };

  /**
   * Handle form input changes
   */
  const handleCommitFormChange = (field, value) => {
    setCommitForm((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Validate email format
   */
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Handle DCS commit submission
   */
  const handleCommitSubmit = async () => {
    const { name, email, message } = commitForm;

    // Clear previous errors
    setCommitForm((prev) => ({ ...prev, errors: {} }));

    // Validation
    const errors = {};
    if (!name || name.trim().length < 3) {
      errors.name = 'Name must be at least 3 characters long';
    }

    if (!email || !isValidEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!selectedBook?.value) {
      errors.general = 'Please select a book first';
    }

    if (!twlContent) {
      errors.general = 'No TWL content to commit';
    }

    if (Object.keys(errors).length > 0) {
      setCommitForm((prev) => ({ ...prev, errors }));
      return;
    }

    // Set submitting state
    setCommitForm((prev) => ({ ...prev, submitting: true, result: null }));

    try {
      // Save credentials to localStorage
      localStorage.setItem('dcs-commit-name', name.trim());
      localStorage.setItem('dcs-commit-email', email.trim());

      // Get 6-column TSV content
      const sixColumnContent = processTsvContent(twlContent, true);
      const userID = getUserIdentifier();

      const response = await fetch('/.netlify/functions/commit-to-dcs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          book: selectedBook.value,
          name: name.trim(),
          email: email.trim(),
          message: message.trim() || undefined,
          userID,
          content: sixColumnContent,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to commit to DCS');
      }

      // Set success result
      setCommitForm((prev) => ({
        ...prev,
        submitting: false,
        result: {
          success: true,
          message: result.message,
          pullRequestUrl: result.pullRequestUrl,
        },
      }));
    } catch (err) {
      // Set error result
      setCommitForm((prev) => ({
        ...prev,
        submitting: false,
        result: {
          success: false,
          message: `Failed to commit to DCS: ${err.message}`,
        },
      }));
    }
  };

  /**
   * Handle when unlinked words are changed - regenerate current TWL if present
   */
  const handleUnlinkedWordsChange = () => {
    if (twlContent) {
      // Create backup before filtering content
      createBackup();
      // Filter current content using local storage data
      const filteredContent = filterUnlinkedWords(twlContent);
      setTwlContent(filteredContent);
      // Save to localStorage after filtering
      saveTwlContent(filteredContent);
    }
  };

  /**
   * Create backup before making changes
   */
  const createBackup = () => {
    setBackupTwlContent(twlContent);
  };

  /**
   * Restore from backup (undo functionality)
   */
  const handleUndo = () => {
    if (backupTwlContent) {
      setTwlContent(backupTwlContent);
      setBackupTwlContent(null);
    }
  };

  /**
   * Handle row deletion from table
   */
  const handleDeleteRow = (rowIndex) => {
    if (!twlContent) return;

    // Create backup before making changes
    createBackup();

    // Parse current content
    const lines = twlContent.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return;

    // Remove the specified row (add 1 to skip header)
    const newLines = lines.filter((_, index) => index !== rowIndex + 1);
    let newContent = newLines.join('\n');

    // Normalize column count to ensure consistency
    newContent = normalizeTsvColumnCount(newContent);

    setTwlContent(newContent);
    // Save to localStorage after deletion
    saveTwlContent(newContent);
  };

  /**
   * Handle unlinking a word - removes all rows with matching OrigWords and TWLink
   */
  const handleUnlinkRow = async (rowIndex) => {
    if (!twlContent) return;

    // Create backup before making changes
    createBackup();

    // Parse current content
    const lines = twlContent.split('\n');
    if (lines.length === 0) return;

    const headers = lines[0].split('\t');
    const dataRowIndex = rowIndex + 1; // Add 1 to skip header row

    if (dataRowIndex >= lines.length) return;

    // Parse the target row to get the values we need
    const row = lines[dataRowIndex].split('\t');
    const referenceIndex = headers.findIndex((h) => h === 'Reference');
    const origWordsIndex = headers.findIndex((h) => h === 'OrigWords');
    const twLinkIndex = headers.findIndex((h) => h === 'TWLink');
    const glQuoteIndex = headers.findIndex((h) => h === 'GLQuote');

    if (origWordsIndex === -1 || twLinkIndex === -1) {
      console.error('Cannot unlink: Required columns not found');
      return;
    }

    const reference = referenceIndex !== -1 ? row[referenceIndex] || '' : '';
    const origWords = row[origWordsIndex] || '';
    const twLink = row[twLinkIndex] || '';
    const glQuote = glQuoteIndex !== -1 ? row[glQuoteIndex] || '' : '';

    console.log('Unlinking word:', { book: selectedBook?.label, reference, origWords, twLink });

    // Normalize the target text for comparison
    const normalizedOrigWords = normalizeHebrewText(origWords);
    const normalizedTWLink = twLink.trim();

    console.log('Normalized target:', { normalizedOrigWords, normalizedTWLink });

    // Add to unlinked words (both server and local)
    await addUnlinkedWord(selectedBook?.value || 'Unknown', reference, origWords, twLink, glQuote);

    // Remove all rows that match this OrigWords and TWLink combination (using normalized comparison)
    const filteredLines = [lines[0]]; // Keep header
    let removedCount = 0;

    console.log(`Scanning ${lines.length - 1} rows for matches...`);

    for (let i = 1; i < lines.length; i++) {
      const currentRow = lines[i].split('\t');
      const currentOrigWords = currentRow[origWordsIndex] || '';
      const currentTWLink = currentRow[twLinkIndex] || '';

      // Normalize current row text for comparison
      const currentNormalizedOrigWords = normalizeHebrewText(currentOrigWords);
      const currentNormalizedTWLink = currentTWLink.trim();

      // Check if this row matches
      const origWordsMatch = currentNormalizedOrigWords === normalizedOrigWords;
      const twLinkMatch = currentNormalizedTWLink === normalizedTWLink;
      const shouldRemove = origWordsMatch && twLinkMatch;

      if (shouldRemove) {
        removedCount++;
        console.log(`REMOVING row ${i}: OrigWords="${currentOrigWords}" (norm: "${currentNormalizedOrigWords}"), TWLink="${currentTWLink}"`);
      } else {
        filteredLines.push(lines[i]);
        // Log first few non-matches to understand what's different
        if (removedCount === 0 && i <= 5) {
          console.log(
            `KEEPING row ${i}: OrigWords="${currentOrigWords}" (norm: "${currentNormalizedOrigWords}"), TWLink="${currentTWLink}" | OrigMatch: ${origWordsMatch}, TWMatch: ${twLinkMatch}`
          );
        }
      }
    }

    console.log(`Removed ${removedCount} rows with normalized OrigWords="${normalizedOrigWords}" and TWLink="${normalizedTWLink}"`);

    let newContent = filteredLines.join('\n');
    // Normalize column count to ensure consistency
    newContent = normalizeTsvColumnCount(newContent);
    setTwlContent(newContent);
    // Save to localStorage after unlinking
    saveTwlContent(newContent);
  };

  /**
   * Handle disambiguation option switching
   */
  const handleDisambiguationClick = (rowIndex, cellIndex, newDisambiguation, newTWLink) => {
    if (!twlContent) return;

    // Create backup before making changes
    createBackup();

    const lines = twlContent.split('\n');
    if (lines.length === 0) return;

    const headers = lines[0].split('\t');
    const dataRowIndex = rowIndex + 1; // Add 1 to skip header row

    if (dataRowIndex >= lines.length) return;

    // Parse the target row
    const row = lines[dataRowIndex].split('\t');

    // Update the disambiguation field
    row[cellIndex] = newDisambiguation;

    // Find and update the TWLink column
    const twLinkIndex = headers.findIndex((h) => h === 'TWLink');
    if (twLinkIndex >= 0 && twLinkIndex < row.length) {
      row[twLinkIndex] = newTWLink;
    }

    // Update the content
    lines[dataRowIndex] = row.join('\t');
    let newContent = lines.join('\n');
    // Normalize column count to ensure consistency
    newContent = normalizeTsvColumnCount(newContent);
    setTwlContent(newContent);
    // Save to localStorage after disambiguation change
    saveTwlContent(newContent);
  };

  /**
   * Handle clearing disambiguation content
   */
  const handleClearDisambiguation = (rowIndex, cellIndex) => {
    if (!twlContent) return;

    // Create backup before making changes
    createBackup();

    const lines = twlContent.split('\n');
    if (lines.length === 0) return;

    const dataRowIndex = rowIndex + 1; // Add 1 to skip header row

    if (dataRowIndex >= lines.length) return;

    // Parse the target row
    const row = lines[dataRowIndex].split('\t');

    // Clear the disambiguation field
    row[cellIndex] = '';

    // Update the content
    lines[dataRowIndex] = row.join('\t');
    let newContent = lines.join('\n');
    // Normalize column count to ensure consistency
    newContent = normalizeTsvColumnCount(newContent);
    setTwlContent(newContent);
    // Save to localStorage after clearing disambiguation
    saveTwlContent(newContent);
  };

  /**
   * Handle raw text changes (no automatic backup)
   */
  const handleRawTextChange = (newContent) => {
    setTwlContent(newContent);
  };

  /**
   * Handle switching to Raw Text mode - create backup before editing starts
   */
  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      // If switching to raw text mode, create backup before editing starts
      if (newViewMode === 'raw' && viewMode === 'table' && twlContent && !hasBackup) {
        createBackup();
        // Also track the original content for change detection
        setRawTextOriginalContent(twlContent);
      }
      // If switching back to table from raw text, clear the tracking
      if (newViewMode === 'table' && viewMode === 'raw') {
        setRawTextOriginalContent(null);
      }
      setViewMode(newViewMode);
    }
  };

  /**
   * Handle Save button click - return to table view and save if content changed
   */
  const handleSave = () => {
    // Check if content changed during raw text editing
    if (rawTextOriginalContent !== null && twlContent !== rawTextOriginalContent) {
      // Content changed, save it
      saveTwlContent();
      console.log('Content changed in raw text mode, saved to localStorage');
    }
    setViewMode('table');
    setRawTextOriginalContent(null);
  };

  // Prepare book options for the autocomplete
  const bookOptions = Object.keys(BibleBookData).map((bookId) => ({
    value: bookId,
    label: `${BibleBookData[bookId].title} (${bookId})`,
  }));

  // Prepare branch options for the autocomplete
  const branchOptions = branches.map((branchName) => ({
    value: branchName,
    label: branchName,
  }));

  // Find the selected branch option for the autocomplete
  const selectedBranchOption = branchOptions.find((option) => option.value === selectedBranch) || null;

  /**
   * Handle pasting TWL content from clipboard
   */
  const handlePasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleExistingTwlChange(text);
    } catch (err) {
      setError('Failed to read clipboard content. Please paste manually.');
    }
  };

  /**
   * Handle TWL file upload
   */
  const handleUploadFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      handleExistingTwlChange(e.target.result);
    };
    reader.onerror = () => {
      setError('Failed to read the uploaded file.');
    };
    reader.readAsText(file);
  };

  /**
   * Handle the main action button - either generate TWL or load existing extended format
   */
  const handleMainAction = async () => {
    // Check if we have extended format TWL content that should be loaded directly
    if (existingTwlContent.trim() && isExtendedTsvFormat(existingTwlContent)) {
      await handleLoadExtendedTwl();
      setExistingTwlContent('');
    } else {
      await handleGenerateTwl();
    }
  };

  /**
   * Load existing extended format TWL (8-11 columns) directly into table view
   */
  const handleLoadExtendedTwl = async () => {
    if (!selectedBook) {
      setError('Please select a book first.');
      return;
    }

    if (!existingTwlContent.trim()) {
      setError('No TWL content to load.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let twlToLoad = existingTwlContent.trim();

      // Filter out unlinked words using local storage data
      twlToLoad = filterUnlinkedWords(twlToLoad);
      console.log('Loaded TWL (after filtering unlinked words):', twlToLoad);

      setTwlContent(twlToLoad);
      // Save to localStorage after loading (pass content directly)
      saveTwlContent(twlToLoad);
    } catch (err) {
      setError(`Failed to load TWL: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate TWL content from USFM using external libraries
   */
  const handleGenerateTwl = async () => {
    if (!selectedBook) {
      setError('Please select a book first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch USFM content first if not already available
      let usfmToUse = usfmContent;
      if (!usfmToUse.trim()) {
        usfmToUse = await fetchUSFMContent(selectedBook.value, selectedBranch);
        setUsfmContent(usfmToUse);
      }

      // Generate TWL using external library
      let generatedTwl = await generateTWLWithUsfm(selectedBook.value, usfmToUse);
      console.log('Generated TWL (initial):', generatedTwl);

      // Add GLQuote and GLOccurrence columns
      generatedTwl = addGLQuoteColumns(generatedTwl);
      console.log('Generated TWL (with GLQuote columns):', generatedTwl);

      const params = {
        bibleLinks: [`unfoldingWord/en_ult/master`],
        bookCode: selectedBook.value,
        tsvContent: generatedTwl,
        trySeparatorsAndOccurrences: true,
      };
      const convertResponse = await convertGLQuotes2OLQuotes(params);

      if (!convertResponse || typeof convertResponse !== 'object' || !convertResponse.output) {
        throw new Error(`convertGLQuotes2OLQuotes failed: ${JSON.stringify(convertResponse)}`);
      }

      generatedTwl = convertResponse.output;

      console.log('Generated TWL (after GL2OL conversion):', generatedTwl);

      // Merge with existing TWL if provided

      let existingTWLs = '';
      if (existingTwlContent.trim()) {
        generatedTwl = mergeExistingTwls(generatedTwl, existingTwlContent.trim());
      }

      const params2 = {
        bibleLinks: ['unfoldingWord/en_ult/master'],
        bookCode: selectedBook.value,
        tsvContent: generatedTwl,
        trySeparatorsAndOccurrences: true,
        quiet: false,
      };

      const addGLQuoteColsResult = await addGLQuoteCols(params2);

      if (!addGLQuoteColsResult || typeof addGLQuoteColsResult !== 'object' || !addGLQuoteColsResult.output) {
        throw new Error(`addGLQuoteCols failed: ${JSON.stringify(addGLQuoteColsResult)}`);
      }

      generatedTwl = addGLQuoteColsResult.output;

      // Ensure all IDs are unique and properly formatted
      generatedTwl = ensureUniqueIds(generatedTwl);
      console.log('Generated TWL (with unique IDs):', generatedTwl);

      // Filter out unlinked words using local storage data
      generatedTwl = filterUnlinkedWords(generatedTwl);
      console.log('Generated TWL (after filtering unlinked words):', generatedTwl);

      setTwlContent(generatedTwl);
      // Save to localStorage after initial generation (pass content directly)
      saveTwlContent(generatedTwl);
    } catch (err) {
      setError(`Failed to generate TWL: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle changes to existing TWL content with validation
   */
  const handleExistingTwlChange = (content) => {
    setExistingTwlContent(content);

    if (content.trim()) {
      // Check if it's valid 6-column format or valid extended format (8-11 columns)
      const isValid6Column = isValidTsvStructure(content);
      const isValidExtended = isValidExtendedTsvStructure(content);
      const isValid = isValid6Column || isValidExtended;
      setExistingTwlValid(isValid);
    } else {
      setExistingTwlValid(true);
    }
  };

  /**
   * Handle clicks on reference links (opens Translation Notes)
   */
  const handleReferenceClick = (reference, event) => {
    event.preventDefault();

    const url = convertReferenceToTnUrl(reference, selectedBook);
    if (!url) return;

    // Try to focus existing window and navigate to new reference
    const windowName = 'en_tn_window';

    try {
      // const tnWindow = window.open(url, windowName); // Restore if Preview app auto scrolls to a anchor if already open
      const tnWindow = window.open(url);
      if (tnWindow) {
        tnWindow.focus();
        // Navigate to new anchor after window is ready
        setTimeout(() => {
          try {
            tnWindow.location.href = url;
          } catch (e) {
            console.log('Cross-origin restriction, normal navigation will occur');
          }
        }, 100);
      }
    } catch (error) {
      console.warn('Error opening TN window:', error);
      window.open(url, windowName); // Fallback
    }
  };

  /**
   * Download first 6 columns only (regular TWL format)
   */
  const handleDownloadSixColumns = () => {
    if (!twlContent) return;

    handleDownloadMenuClose();

    const tsvContentOnly6Columns = processTsvContent(twlContent, true); // Just get first 6 columns
    const blob = new Blob([tsvContentOnly6Columns], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `twl_${selectedBook?.value?.toUpperCase() || 'export'}.tsv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Download all columns of the TWL as TSV (normalized column count)
   */
  const handleDownloadAllColumns = () => {
    if (!twlContent) return;

    handleDownloadMenuClose();

    // Normalize the content to ensure all rows have consistent column counts
    const normalizedContent = normalizeTsvColumnCount(twlContent);

    const blob = new Blob([normalizedContent], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `twl_${selectedBook?.value?.toUpperCase() || 'export'}_extended.tsv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Copy TWL content to clipboard (first 6 columns only)
   */
  const handleCopyToClipboard = async () => {
    if (!twlContent) return;

    try {
      const contentString = typeof twlContent === 'string' ? twlContent : String(twlContent);
      const lines = contentString.split('\n');
      const trimmedContent = lines
        .map((line) => {
          const columns = line.split('\t');
          return columns.slice(0, 6).join('\t');
        })
        .join('\n');

      await navigator.clipboard.writeText(trimmedContent);
      alert("This TWL's first 6 columns have been copied to your clipboard. You can now 'Edit on DCS' and paste in the copied content.");
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  /**
   * Calculate the number of data rows (excluding header)
   */
  const getTwlRowCount = () => {
    if (!processedTsvContent) return 0;

    const lines = processedTsvContent.split('\n').filter((line) => line.trim());
    return Math.max(0, lines.length - 1); // Subtract 1 for header row
  };

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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'rgb(229, 231, 235)' }}>
        {/* Header */}
        <AppBar position="static" sx={{ bgcolor: '#38ADDF' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              TSV TWL Creation App
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Box sx={{ px: '15px', py: 3 }}>
          {/* Book and Branch Selection Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select a Book of the Bible and Branch
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {/* Book Selection */}
                <Box sx={{ flex: 1, minWidth: 300 }}>
                  <Autocomplete
                    options={bookOptions}
                    getOptionLabel={(option) => option.label}
                    value={selectedBook}
                    onChange={handleBookSelect}
                    isOptionEqualToValue={(option, value) => option.value === value?.value}
                    renderInput={(params) => <TextField {...params} label="Select a Bible book..." variant="outlined" fullWidth />}
                    sx={{ mt: 2 }}
                  />
                </Box>

                {/* Branch Selection */}
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Autocomplete
                    options={branchOptions}
                    getOptionLabel={(option) => option.label}
                    onChange={handleBranchSelect}
                    renderInput={(params) => <TextField {...params} label="Select branch..." variant="outlined" fullWidth />}
                    value={selectedBranchOption}
                    isOptionEqualToValue={(option, value) => option.value === value?.value}
                    loading={branchesLoading}
                    sx={{ mt: 2 }}
                  />
                  {branchesError && (
                    <Alert severity="error" sx={{ mt: 1, fontSize: '0.75rem' }}>
                      {branchesError}
                    </Alert>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Load Existing TWLs Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2, justifyContent: 'center' }}>
                <Typography variant="body1" sx={{ color: 'rgba(0, 0, 0, 0.87)', fontWeight: 'bold' }}>
                  Load Existing TWLs (optional):
                </Typography>

                <Button
                  onClick={handlePasteText}
                  startIcon={<PasteIcon />}
                  variant="text"
                  sx={{
                    color: '#1976d2',
                    textTransform: 'none',
                    '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' },
                  }}
                >
                  Paste text
                </Button>

                <Box sx={{ position: 'relative' }}>
                  <input type="file" accept=".tsv" onChange={handleUploadFile} style={{ display: 'none' }} id="upload-tsv-file" />
                  <label htmlFor="upload-tsv-file">
                    <Button
                      component="span"
                      startIcon={<UploadIcon />}
                      variant="text"
                      sx={{
                        color: '#1976d2',
                        textTransform: 'none',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' },
                      }}
                    >
                      Upload a TSV file
                    </Button>
                  </label>
                </Box>

                <Button
                  onClick={async () => {
                    if (!selectedBook) return;

                    setLoading(true);
                    try {
                      const content = await fetchTWLContent(selectedBook.value, selectedBranch);
                      handleExistingTwlChange(content);
                    } catch (err) {
                      setError(`Failed to fetch existing TWL: ${err.message}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  startIcon={<DownloadIcon />}
                  variant="text"
                  disabled={!selectedBook || selectedBook === null}
                  sx={{
                    color: selectedBook ? '#1976d2' : 'rgba(0, 0, 0, 0.26)',
                    textTransform: 'none',
                    '&:hover': selectedBook ? { backgroundColor: 'rgba(25, 118, 210, 0.04)' } : {},
                  }}
                >
                  Fetch en_twl / twl_{selectedBook?.value.toUpperCase() || 'BOOK'}.tsv ({selectedBranch}) from DCS
                </Button>
              </Box>

              <textarea
                value={existingTwlContent}
                onChange={(e) => handleExistingTwlChange(e.target.value)}
                placeholder="Existing TWL content will appear here... (6 columns for merging, or 8-11 columns for direct loading)"
                style={{
                  width: '100%',
                  height: existingTwlContent ? '200px' : '50px',
                  padding: '12px',
                  border: `2px solid ${existingTwlValid ? '#ccc' : '#f44336'}`,
                  borderRadius: '4px',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '12px',
                  resize: 'both',
                  whiteSpace: 'pre',
                  overflow: 'auto',
                  backgroundColor: existingTwlValid ? '#ffffff' : '#ffebee',
                  boxSizing: 'border-box',
                  outline: 'none',
                  lineHeight: '1.4',
                }}
              />

              {existingTwlContent.trim() && !existingTwlValid && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  Invalid TWL format. Must have exactly 6 columns, or 8-11 columns with proper headers (Reference, ID, Tags, OrigWords, Occurrence, TWLink, GLQuote, GLOccurrence,
                  [Disambiguation, Context], [Already Exists]).
                </Alert>
              )}

              {/* Generate/Load TWLs Button */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  onClick={handleMainAction}
                  variant="contained"
                  disabled={!selectedBook || loading || (existingTwlContent.trim() !== '' && !existingTwlValid)}
                  sx={{
                    backgroundColor: '#1976d2',
                    '&:hover': { backgroundColor: '#1565c0' },
                    textTransform: 'none',
                    px: 4,
                    py: 1.5,
                  }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
                  {existingTwlContent.trim() && isExtendedTsvFormat(existingTwlContent) ? 'Load into Table View' : 'Generate TWLs'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* TWL Output Section */}
          {twlContent && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Generated TWL Content for {selectedBook?.label}
                </Typography>

                {/* Controls */}
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                  <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange} size="small">
                    <ToggleButton value="table">Table View</ToggleButton>
                    <ToggleButton value="raw">Raw Text</ToggleButton>
                  </ToggleButtonGroup>

                  {viewMode === 'raw' && (
                    <Button
                      onClick={handleSave}
                      startIcon={<SaveIcon />}
                      variant="contained"
                      size="small"
                      sx={{
                        backgroundColor: '#2e7d32',
                        textTransform: 'none',
                        '&:hover': { backgroundColor: '#1b5e20' },
                      }}
                    >
                      Save & Return to Table View
                    </Button>
                  )}

                  {viewMode === 'table' && hasBackup && (
                    <Button
                      onClick={handleUndo}
                      startIcon={<UndoIcon />}
                      variant="outlined"
                      size="small"
                      sx={{
                        color: '#1976d2',
                        borderColor: '#1976d2',
                        textTransform: 'none',
                        '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' },
                      }}
                    >
                      Undo Last Change
                    </Button>
                  )}

                  <Button
                    onClick={handleUnlinkedWordsDialogOpen}
                    startIcon={<ManageIcon />}
                    variant="outlined"
                    size="small"
                    sx={{
                      color: '#ff9800',
                      borderColor: '#ff9800',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 152, 0, 0.04)',
                        borderColor: '#ff9800',
                      },
                    }}
                  >
                    Manage Unlinked Words
                  </Button>

                  <Button
                    onClick={handleDownloadMenuClick}
                    endIcon={<ArrowDropDownIcon />}
                    variant="contained"
                    size="small"
                    disabled={!twlContent || twlContent === ''}
                    sx={{
                      bgcolor: '#38ADDF',
                      '&:hover': { bgcolor: '#2e8bb8' },
                      textTransform: 'none',
                    }}
                  >
                    Download TWLs
                  </Button>
                  <Menu
                    anchorEl={downloadMenuAnchor}
                    open={downloadMenuOpen}
                    onClose={handleDownloadMenuClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                  >
                    <MenuItem onClick={handleDownloadSixColumns}>Download First 6 Columns</MenuItem>
                    <MenuItem onClick={handleDownloadAllColumns}>Download All Columns</MenuItem>
                  </Menu>

                  <Button
                    onClick={handleCopyToClipboard}
                    variant="outlined"
                    size="small"
                    disabled={!twlContent || twlContent === ''}
                    sx={{
                      color: '#1976d2',
                      borderColor: '#1976d2',
                      textTransform: 'none',
                      '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' },
                    }}
                  >
                    Copy to Clipboard
                  </Button>

                  <Button
                    component="a"
                    href={`https://git.door43.org/unfoldingWord/en_twl/_edit/${selectedBranch}/twl_${selectedBook?.value?.toUpperCase() || 'BOOK'}.tsv`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    size="small"
                    disabled={!selectedBook || selectedBook === null}
                    sx={{
                      color: '#1976d2',
                      borderColor: '#1976d2',
                      textTransform: 'none',
                      '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' },
                      textDecoration: 'none',
                    }}
                  >
                    Edit twl_{selectedBook?.value?.toUpperCase() || 'BOOK'}.tsv on DCS
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    onClick={handleCommitModalOpen}
                    disabled={!twlContent || !selectedBook}
                    sx={{
                      ml: 2,
                      color: '#4caf50',
                      borderColor: '#4caf50',
                      textTransform: 'none',
                      '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.04)' },
                    }}
                  >
                    Commit to DCS
                  </Button>
                </Box>

                {/* Content Display */}
                <Box sx={{ mt: 2 }}>
                  {viewMode === 'table' ? (
                    <TWLTable
                      tableData={tableData}
                      selectedBook={selectedBook}
                      onDeleteRow={handleDeleteRow}
                      onUnlinkRow={handleUnlinkRow}
                      onDisambiguationClick={handleDisambiguationClick}
                      onClearDisambiguation={handleClearDisambiguation}
                      onReferenceClick={handleReferenceClick}
                    />
                  ) : (
                    <>
                      {hasBackup && (
                        <Box sx={{ mb: 1 }}>
                          <Button
                            onClick={handleUndo}
                            startIcon={<UndoIcon />}
                            variant="outlined"
                            size="small"
                            sx={{
                              color: '#1976d2',
                              borderColor: '#1976d2',
                              textTransform: 'none',
                              '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' },
                            }}
                          >
                            Undo Last Change
                          </Button>
                        </Box>
                      )}
                      <textarea
                        value={processedTsvContent}
                        onChange={(e) => {
                          handleRawTextChange(e.target.value);
                        }}
                        style={{
                          width: '100%',
                          height: '400px',
                          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                          fontSize: '12px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '8px',
                          resize: 'vertical',
                          backgroundColor: 'white',
                        }}
                      />
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Commit to DCS Modal */}
      <Dialog open={commitModalOpen} onClose={handleCommitModalClose} maxWidth="sm" fullWidth>
        <DialogTitle>Commit TWL to DCS</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Your Name"
              type="text"
              fullWidth
              variant="outlined"
              value={commitForm.name}
              onChange={(e) => setCommitForm((prev) => ({ ...prev, name: e.target.value }))}
              error={!!commitForm.errors.name}
              helperText={commitForm.errors.name}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Your Email"
              type="email"
              fullWidth
              variant="outlined"
              value={commitForm.email}
              onChange={(e) => setCommitForm((prev) => ({ ...prev, email: e.target.value }))}
              error={!!commitForm.errors.email}
              helperText={commitForm.errors.email}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Commit Message (optional)"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={commitForm.message}
              onChange={(e) => setCommitForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder={`Update TWL for ${selectedBook?.value?.toUpperCase() || 'BOOK'}`}
            />
            {commitForm.submitting && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Creating commit and pull request...
                </Typography>
              </Box>
            )}
            {commitForm.result && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color={commitForm.result.success ? 'success.main' : 'error.main'}>
                  {commitForm.result.message}
                </Typography>
                {commitForm.result.success && commitForm.result.pullRequestUrl && (
                  <Button variant="text" size="small" href={commitForm.result.pullRequestUrl} target="_blank" rel="noopener noreferrer" sx={{ mt: 1 }}>
                    View Pull Request
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCommitModalClose} disabled={commitForm.submitting}>
            Cancel
          </Button>
          <Button onClick={handleCommitSubmit} variant="contained" disabled={commitForm.submitting || !commitForm.name.trim() || !commitForm.email.trim()}>
            {commitForm.submitting ? 'Committing...' : 'Commit & Create PR'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unlinked Words Manager Dialog */}
      <UnlinkedWordsManager open={unlinkedWordsDialogOpen} onClose={handleUnlinkedWordsDialogClose} onUnlinkedWordsChange={handleUnlinkedWordsChange} />
    </ThemeProvider>
  );
}

export default App;
