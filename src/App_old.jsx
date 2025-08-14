import React, { useState, useMemo, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Tooltip,
  IconButton,
} from '@mui/material';
import { ContentPaste as PasteIcon, Upload as UploadIcon, CloudDownload as DownloadIcon, Delete as DeleteIcon, Undo as UndoIcon } from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BibleBookData } from '@common/books';
import { generateTWL } from 'twl-linker';
import { convertGLQuotes2OLQuotes } from 'tsv-quote-converters';

const theme = createTheme({
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Cookie utility functions
const setCookie = (name, value, days = 365) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name) => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

// LocalStorage utility functions (more reliable than cookies)
const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

const getLocalStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Failed to read from localStorage:', error);
    return null;
  }
};

function App() {
  // Try localStorage for saved book, with cookie fallback
  const savedBookData = getLocalStorage('selectedBook') || getCookie('selectedBook');
  let savedBook = null;
  if (savedBookData) {
    try {
      savedBook = JSON.parse(savedBookData);
    } catch (error) {
      console.warn('Failed to parse saved book data:', error);
    }
  }

  const [selectedBook, setSelectedBook] = useState(savedBook);
  // Try localStorage first, then fallback to cookies
  const savedBranch = getLocalStorage('selectedBranch') || getCookie('selectedBranch');
  console.log('Loaded branch from storage:', savedBranch);
  console.log('Loaded book from storage:', savedBook);
  const [selectedBranch, setSelectedBranch] = useState(savedBranch || 'master');
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState('');
  const [usfmContent, setUsfmContent] = useState('');
  const [twlContent, setTwlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOnlySixColumns, setShowOnlySixColumns] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'raw'
  const [existingTwlContent, setExistingTwlContent] = useState('');
  const [showExistingTwlTextArea, setShowExistingTwlTextArea] = useState(false);
  const [existingTwlValid, setExistingTwlValid] = useState(true);
  const [deletedRow, setDeletedRow] = useState(null); // { row: [...], index: number }
  const [tableRows, setTableRows] = useState([]); // Store actual table data for manipulation

  // Fetch branches on component mount
  useEffect(() => {
    const fetchBranches = async () => {
      setBranchesLoading(true);
      setBranchesError('');

      try {
        const response = await fetch('https://git.door43.org/api/v1/repos/unfoldingWord/en_twl/branches');

        if (!response.ok) {
          throw new Error(`Failed to fetch branches: ${response.statusText}`);
        }

        const branchData = await response.json();
        const branchNames = branchData.map((branch) => branch.name).sort();
        setBranches(branchNames);
      } catch (err) {
        setBranchesError(`Error loading branches: ${err.message}`);
      } finally {
        setBranchesLoading(false);
      }
    };

    fetchBranches();
  }, []);

  // Handle branch selection
  const handleBranchSelect = (event, value) => {
    const branchName = value?.value || 'master';
    console.log('Setting branch to:', branchName);
    setSelectedBranch(branchName);
    // Save to both localStorage and cookies for maximum compatibility
    setLocalStorage('selectedBranch', branchName);
    setCookie('selectedBranch', branchName);
    console.log('Branch saved. localStorage:', getLocalStorage('selectedBranch'), 'Cookies:', document.cookie);
  };

  // Helper function to add GLQuote and GLOccurrence columns
  const addGLQuoteColumns = (tsvContent) => {
    // Ensure input is a string
    if (typeof tsvContent !== 'string') {
      console.error('addGLQuoteColumns received non-string input:', typeof tsvContent, tsvContent);
      return '';
    }

    const lines = tsvContent.split('\n');
    if (lines.length === 0) return tsvContent;

    // Parse header row to find column indices
    const headers = lines[0].split('\t');
    const origWordsIndex = headers.findIndex((h) => h === 'OrigWords');
    const occurrenceIndex = headers.findIndex((h) => h === 'Occurrence');
    const twLinkIndex = headers.findIndex((h) => h === 'TWLink');

    if (origWordsIndex === -1 || occurrenceIndex === -1) {
      console.warn('Could not find OrigWords or Occurrence columns');
      return tsvContent;
    }

    if (twLinkIndex === -1) {
      console.warn('Could not find TWLink column');
      return tsvContent;
    }

    // Create new headers with GLQuote and GLOccurrence inserted after TWLink
    const newHeaders = [...headers];
    newHeaders.splice(twLinkIndex + 1, 0, 'GLQuote', 'GLOccurrence');

    // Process each row
    const newLines = lines.map((line, index) => {
      if (index === 0) {
        // Header row
        return newHeaders.join('\t');
      }

      const columns = line.split('\t');
      if (columns.length <= Math.max(origWordsIndex, occurrenceIndex, twLinkIndex)) {
        // Not enough columns, return as-is
        return line;
      }

      // Insert GLQuote (copy of OrigWords) and GLOccurrence (copy of Occurrence) after TWLink
      const newColumns = [...columns];
      const glQuoteValue = columns[origWordsIndex] || '';
      const glOccurrenceValue = columns[occurrenceIndex] || '';

      newColumns.splice(twLinkIndex + 1, 0, glQuoteValue, glOccurrenceValue);

      return newColumns.join('\t');
    });

    return newLines.join('\n');
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

  // Process TSV content for display
  const processedTsvContent = useMemo(() => {
    if (!twlContent) return '';

    // Ensure twlContent is a string
    const contentString = typeof twlContent === 'string' ? twlContent : String(twlContent);

    const lines = contentString.split('\n');

    if (showOnlySixColumns) {
      // Show only first 6 columns (indices 0-5)
      return lines
        .map((line) => {
          const columns = line.split('\t');
          return columns.slice(0, 6).join('\t');
        })
        .join('\n');
    }

    return contentString;
  }, [twlContent, showOnlySixColumns]);

  // Parse TSV content into table data
  const baseTableData = useMemo(() => {
    if (!processedTsvContent) return { headers: [], rows: [] };

    const lines = processedTsvContent.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = lines[0].split('\t');
    const rows = lines.slice(1).map((line) => line.split('\t'));

    return { headers, rows };
  }, [processedTsvContent]);

  // Update tableRows when base data changes
  useEffect(() => {
    setTableRows(baseTableData.rows);
    setDeletedRow(null); // Clear any undo state when data changes
  }, [baseTableData]);

  // Final table data for display (filtered rows)
  const tableData = useMemo(
    () => ({
      headers: baseTableData.headers,
      rows: tableRows,
    }),
    [baseTableData.headers, tableRows]
  );

  // Helper function to convert rc:// links to Door43 URLs
  const convertRcLinkToUrl = (rcLink) => {
    if (!rcLink || !rcLink.startsWith('rc://')) {
      return null;
    }

    try {
      // Extract the path from rc://*/<path>
      const match = rcLink.match(/^rc:\/\/\*\/(.+)$/);
      if (!match) return null;

      const fullPath = match[1];
      // Get the last three parts of the path
      const pathParts = fullPath.split('/');
      if (pathParts.length < 3) return null;

      const lastThreeParts = pathParts.slice(-3).join('/');
      return `https://git.door43.org/unfoldingWord/en_tw/src/master/${lastThreeParts}.md`;
    } catch (error) {
      console.warn('Error converting rc:// link:', rcLink, error);
      return null;
    }
  };

  const handleBookSelect = async (event, value) => {
    if (!value) {
      setSelectedBook(null);
      // Clear saved book from both localStorage and cookies
      setLocalStorage('selectedBook', '');
      setCookie('selectedBook', '');
      setUsfmContent('');
      setTwlContent('');
      setError('');
      setShowOnlySixColumns(false);
      setViewMode('table');
      return;
    }

    setSelectedBook(value);
    // Save to both localStorage and cookies for maximum compatibility
    setLocalStorage('selectedBook', JSON.stringify(value));
    setCookie('selectedBook', JSON.stringify(value));
    setError('');
    setTwlContent('');
    setShowOnlySixColumns(false);
    setViewMode('table');
  };

  // Handler for pasting text from clipboard
  const handlePasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleExistingTwlChange(text);
      setShowExistingTwlTextArea(true);
    } catch (err) {
      alert('Failed to read from clipboard. Please try again or paste manually.');
      setShowExistingTwlTextArea(true);
    }
  };

  // Handler for uploading TSV file
  const handleUploadFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's a TSV file
    if (!file.name.toLowerCase().endsWith('.tsv')) {
      alert('Please select a .tsv file');
      return;
    }

    // Check file size (limit to 10MB to prevent huge files)
    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large. Please select a file smaller than 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        handleExistingTwlChange(content);
        setShowExistingTwlTextArea(true);
      } catch (err) {
        alert('Failed to read file content');
      }
    };
    reader.onerror = () => {
      alert('Failed to read file');
    };
    reader.readAsText(file);
  };

  // Handler for fetching from DCS
  const handleFetchFromDcs = async () => {
    if (!selectedBook) {
      alert('Please select a book first');
      return;
    }

    try {
      setLoading(true);
      const bookCode = selectedBook.value.toUpperCase();
      const url = `https://git.door43.org/api/v1/repos/unfoldingWord/en_twl/contents/twl_${bookCode}.tsv?ref=${selectedBranch}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch TWL file: ${response.statusText}`);
      }

      const data = await response.json();

      // Decode Base64 content as UTF-8
      const base64Content = data.content.replace(/\s/g, ''); // Remove any whitespace
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decodedContent = new TextDecoder('utf-8').decode(bytes);

      handleExistingTwlChange(decodedContent);
      setShowExistingTwlTextArea(true);
    } catch (err) {
      alert(`Error fetching TWL file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handler for generating TWLs
  const handleGenerateTwl = async () => {
    if (!selectedBook) {
      alert('Please select a book first');
      return;
    }

    // Validate existing TWL content if provided
    if (existingTwlContent.trim() && !existingTwlValid) {
      alert('Please fix the existing TWL content. It must have exactly 6 columns per row.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const bookData = BibleBookData[selectedBook.value];
      const usfmFileName = bookData.usfm;

      const response = await fetch(`https://git.door43.org/api/v1/repos/unfoldingWord/en_ult/contents/${usfmFileName}.usfm?ref=master`);

      if (!response.ok) {
        throw new Error(`Failed to fetch USFM content: ${response.statusText}`);
      }

      const data = await response.json();
      // Properly decode Base64 content as UTF-8
      const base64Content = data.content.replace(/\s/g, ''); // Remove any whitespace
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decodedContent = new TextDecoder('utf-8').decode(bytes);
      setUsfmContent(decodedContent);

      // Generate TWL content
      const twlResult = generateTWL(decodedContent);

      // Ensure twlResult is a string
      if (typeof twlResult !== 'string') {
        throw new Error(`generateTWL returned ${typeof twlResult} instead of string`);
      }

      // Add GLQuote and GLOccurrence columns manually
      let tsvContent = addGLQuoteColumns(twlResult);

      // Ensure tsvContent is still a string
      if (typeof tsvContent !== 'string') {
        throw new Error(`addGLQuoteColumns returned ${typeof tsvContent} instead of string`);
      }

      // Convert GL quotes to OL quotes
      const params = {
        bibleLinks: [`unfoldingWord/en_ult/master`],
        bookCode: selectedBook.value,
        tsvContent: tsvContent,
        trySeparatorsAndOccurrences: true,
      };
      const convertResponse = await convertGLQuotes2OLQuotes(params);

      if (!convertResponse || typeof convertResponse !== 'object' || !convertResponse.output) {
        throw new Error(`convertGLQuotes2OLQuotes failed: ${JSON.stringify(convertResponse)}`);
      }

      tsvContent = convertResponse?.output;

      // Ensure final result is a string
      if (typeof tsvContent !== 'string') {
        throw new Error(`convertGLQuotes2OLQuotes returned ${typeof tsvContent} instead of string`);
      }

      // Merge with existing TWLs if provided
      if (existingTwlContent.trim() && existingTwlValid) {
        tsvContent = mergeExistingTwls(tsvContent, existingTwlContent);
      }

      setTwlContent(tsvContent);
    } catch (err) {
      setError(`Error loading book content: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to validate existing TWL content
  const validateExistingTwl = (content) => {
    if (!content.trim()) {
      return true; // Empty content is valid (no merging needed)
    }

    const lines = content
      .trim()
      .split('\n')
      .filter((line) => line.trim());
    if (lines.length === 0) {
      return true; // No data lines
    }

    // Check each line has exactly 6 columns
    for (let i = 0; i < lines.length; i++) {
      const columns = lines[i].split('\t');
      if (columns.length !== 6) {
        return false;
      }
    }

    return true;
  };

  // Function to parse TSV content
  const parseTsv = (content, hasHeader = true) => {
    const lines = content
      .trim()
      .split('\n')
      .filter((line) => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    let headers = [];
    let rows = [];

    if (hasHeader) {
      headers = lines[0].split('\t');
      rows = lines.slice(1).map((line) => line.split('\t'));
    } else {
      rows = lines.map((line) => line.split('\t'));
    }

    return { headers, rows };
  };

  // Function to check if existing TWL has header
  const hasHeader = (content) => {
    const lines = content
      .trim()
      .split('\n')
      .filter((line) => line.trim());
    if (lines.length === 0) return false;

    const firstLine = lines[0].split('\t');
    return firstLine.length >= 3 && firstLine[0] === 'Reference' && firstLine[1] === 'ID' && firstLine[2] === 'Tags';
  };

  // Function to merge existing TWLs with generated TWLs
  const mergeExistingTwls = (generatedContent, existingContent) => {
    if (!existingContent.trim()) {
      return generatedContent; // No existing content to merge
    }

    // Parse generated content (always has header)
    const generated = parseTsv(generatedContent, true);
    const generatedHeaders = generated.headers;
    const generatedRows = generated.rows;

    // Parse existing content (check if it has header)
    const existingHasHeader = hasHeader(existingContent);
    const existing = parseTsv(existingContent, existingHasHeader);
    const existingRows = existing.rows;

    // Add "Already Exists" column to headers if there are existing rows
    const finalHeaders = existingRows.length > 0 ? [...generatedHeaders, 'Already Exists'] : generatedHeaders;

    // Find column indices
    const origWordsIndex = generatedHeaders.findIndex((h) => h === 'OrigWords');
    const occurrenceIndex = generatedHeaders.findIndex((h) => h === 'Occurrence');

    // Initialize pointers
    let existingPointer = 0;
    let generatedPointer = 0;
    const mergedRows = [];

    // Helper function to create extended existing row
    const createExtendedExistingRow = (existingRow) => {
      const extendedRow = [...existingRow];
      while (extendedRow.length < generatedHeaders.length) {
        extendedRow.push('');
      }
      // Add "x" to "Already Exists" column if there are existing rows
      if (existingRows.length > 0) {
        extendedRow.push('x');
      }
      return extendedRow;
    };

    // Helper function to check if existing row matches generated row
    const isExactMatch = (existingRow, generatedRow) => {
      const existingRef = existingRow[0] || '';
      const existingOrigWords = origWordsIndex >= 0 ? existingRow[origWordsIndex] || '' : '';
      const existingOccurrence = occurrenceIndex >= 0 ? existingRow[occurrenceIndex] || '' : '';

      const generatedRef = generatedRow[0] || '';
      const generatedOrigWords = origWordsIndex >= 0 ? generatedRow[origWordsIndex] || '' : '';
      const generatedOccurrence = occurrenceIndex >= 0 ? generatedRow[occurrenceIndex] || '' : '';

      return existingRef === generatedRef && existingOrigWords === generatedOrigWords && existingOccurrence === generatedOccurrence;
    };

    // Helper function to update generated row with existing data
    const updateGeneratedRow = (generatedRow, existingRow) => {
      const updatedRow = [...generatedRow];
      // Replace first 6 columns with existing row data
      for (let i = 0; i < Math.min(6, existingRow.length); i++) {
        updatedRow[i] = existingRow[i];
      }
      // Add "x" to "Already Exists" column if there are existing rows
      if (existingRows.length > 0) {
        updatedRow.push('x');
      }
      return updatedRow;
    };

    // Main merging loop - process existing rows in order
    while (existingPointer < existingRows.length) {
      const existingRow = existingRows[existingPointer];
      const existingRef = existingRow[0] || '';

      // First, add all generated rows with references less than the current existing row
      while (generatedPointer < generatedRows.length) {
        const generatedRow = generatedRows[generatedPointer];
        const generatedRef = generatedRow[0] || '';

        if (compareReferences(generatedRef, existingRef) < 0) {
          // Generated reference is less than existing reference, add it
          const extendedGeneratedRow = existingRows.length > 0 ? [...generatedRow, ''] : generatedRow;
          mergedRows.push(extendedGeneratedRow);
          generatedPointer++;
        } else {
          // Generated reference is >= existing reference, break to handle existing row
          break;
        }
      }

      // Now look for a matching generated row with the same reference
      let matchFound = false;
      let tempGeneratedPointer = generatedPointer;

      // Search through generated rows with the same reference as the existing row
      while (tempGeneratedPointer < generatedRows.length) {
        const generatedRow = generatedRows[tempGeneratedPointer];
        const generatedRef = generatedRow[0] || '';

        if (compareReferences(generatedRef, existingRef) === 0) {
          // Same reference, check for exact match
          if (isExactMatch(existingRow, generatedRow)) {
            // Exact match found! Add all generated rows up to this point
            while (generatedPointer < tempGeneratedPointer) {
              const extendedGeneratedRow = existingRows.length > 0 ? [...generatedRows[generatedPointer], ''] : generatedRows[generatedPointer];
              mergedRows.push(extendedGeneratedRow);
              generatedPointer++;
            }
            // Add the updated generated row with existing data
            mergedRows.push(updateGeneratedRow(generatedRow, existingRow));
            generatedPointer++; // Skip the matched generated row
            matchFound = true;
            break;
          }
          tempGeneratedPointer++;
        } else if (compareReferences(generatedRef, existingRef) > 0) {
          // No more rows with this reference
          break;
        } else {
          tempGeneratedPointer++;
        }
      }

      if (!matchFound) {
        // No exact match found, insert the existing row as-is
        mergedRows.push(createExtendedExistingRow(existingRow));
      }

      existingPointer++;
    }

    // Add any remaining generated rows
    while (generatedPointer < generatedRows.length) {
      const extendedGeneratedRow = existingRows.length > 0 ? [...generatedRows[generatedPointer], ''] : generatedRows[generatedPointer];
      mergedRows.push(extendedGeneratedRow);
      generatedPointer++;
    }

    // Rebuild the TSV content
    const result = [finalHeaders.join('\t'), ...mergedRows.map((row) => row.join('\t'))].join('\n');
    return result;
  };

  // Helper function to compare references (e.g., "1:2" vs "1:10")
  const compareReferences = (ref1, ref2) => {
    const parseRef = (ref) => {
      const parts = ref.split(':');
      return {
        chapter: parseInt(parts[0]) || 0,
        verse: parseInt(parts[1]) || 0,
      };
    };

    const parsed1 = parseRef(ref1);
    const parsed2 = parseRef(ref2);

    if (parsed1.chapter !== parsed2.chapter) {
      return parsed1.chapter - parsed2.chapter;
    }
    return parsed1.verse - parsed2.verse;
  };

  // Update existing TWL content validation
  const handleExistingTwlChange = (content) => {
    setExistingTwlContent(content);
    setExistingTwlValid(validateExistingTwl(content));
  };

  // Helper function to convert reference to Translation Notes URL
  const convertReferenceToTnUrl = (reference) => {
    if (!reference || !selectedBook) {
      return null;
    }

    try {
      // Split reference on colon (e.g., "1:1" -> ["1", "1"])
      const parts = reference.split(':');
      if (parts.length !== 2) {
        return null;
      }

      const chapter = parts[0];
      const verse = parts[1];
      const bookCode = selectedBook.value.toLowerCase();

      return `https://preview.door43.org/u/unfoldingWord/en_tn?book=${bookCode}#${bookCode}-${chapter}-${verse}`;
    } catch (error) {
      console.warn('Error converting reference to TN URL:', reference, error);
      return null;
    }
  };

  // Helper function to truncate Context column content around [...] markers
  const truncateContext = (contextText) => {
    if (!contextText || typeof contextText !== 'string') {
      return contextText;
    }

    // Look for [...] pattern
    const bracketMatch = contextText.match(/\[[^\]]*\]/);
    if (!bracketMatch) {
      return contextText; // No brackets found, return as-is
    }

    const bracketText = bracketMatch[0];
    const bracketIndex = bracketMatch.index;

    // Get text before and after the brackets
    const beforeText = contextText.substring(0, bracketIndex).trim();
    const afterText = contextText.substring(bracketIndex + bracketText.length).trim();

    // Split into words and take max 2 words before and after
    const beforeWords = beforeText ? beforeText.split(/\s+/).slice(-2) : [];
    const afterWords = afterText ? afterText.split(/\s+/).slice(0, 2) : [];

    // Construct truncated text
    const parts = [];
    if (beforeWords.length > 0) {
      parts.push(beforeWords.join(' '));
    }
    parts.push(bracketText);
    if (afterWords.length > 0) {
      parts.push(afterWords.join(' '));
    }

    return parts.join(' ');
  };

  // Function to handle reference link clicks with window management
  const handleReferenceClick = (reference, event) => {
    event.preventDefault();

    const url = convertReferenceToTnUrl(reference);
    if (!url) return;

    // Try to focus existing window and change the anchor
    const windowName = 'en_tn_window';

    try {
      // Open or focus the window
      const tnWindow = window.open(url, windowName);

      if (tnWindow) {
        // Focus the window
        tnWindow.focus();

        // If the window was already open, we need to navigate to the new anchor
        // We'll do this by changing the location after a short delay to ensure the window is ready
        setTimeout(() => {
          try {
            tnWindow.location.href = url;
          } catch (e) {
            // If we can't access the window (cross-origin), just let the normal navigation happen
            console.log('Cross-origin restriction, normal navigation will occur');
          }
        }, 100);
      }
    } catch (error) {
      console.warn('Error opening TN window:', error);
      // Fallback to normal window opening
      window.open(url, windowName);
    }
  };

  // Handle row deletion
  const handleDeleteRow = (rowIndex) => {
    const rowToDelete = tableRows[rowIndex];
    setDeletedRow({ row: rowToDelete, index: rowIndex });
    setTableRows((prev) => prev.filter((_, index) => index !== rowIndex));
  };

  // Handle undo last deleted row
  const handleUndo = () => {
    if (deletedRow) {
      const newRows = [...tableRows];
      newRows.splice(deletedRow.index, 0, deletedRow.row);
      setTableRows(newRows);
      setDeletedRow(null);
    }
  };

  // Handle disambiguation option switching
  const handleDisambiguationClick = (rowIndex, cellIndex, newOption, newTWLink) => {
    setTableRows((prev) => {
      const newRows = [...prev];
      const row = [...newRows[rowIndex]];

      // Update the disambiguation field
      row[cellIndex] = newOption;

      // Find and update the TWLink column
      const twLinkIndex = baseTableData.headers.findIndex((h) => h === 'TWLink');
      if (twLinkIndex >= 0 && twLinkIndex < row.length) {
        row[twLinkIndex] = newTWLink;
      }

      newRows[rowIndex] = row;
      return newRows;
    });
  };

  // Parse disambiguation field to extract clickable options
  const parseDisambiguationOptions = (disambiguationText, currentRowIndex, currentCellIndex) => {
    if (!disambiguationText || typeof disambiguationText !== 'string') {
      return { currentOption: '', clickableOptions: [] };
    }

    // Match pattern like "manual:option1 (1:other/time, 2:other/age-timeperiod)"
    const match = disambiguationText.match(/^manual:option(\d+)\s*\(([^)]+)\)$/);
    if (!match) {
      return { currentOption: disambiguationText, clickableOptions: [] };
    }

    const currentOptionNumber = parseInt(match[1]);
    const optionsText = match[2];

    // Parse individual options like "1:other/time, 2:other/age-timeperiod"
    const optionMatches = optionsText.matchAll(/(\d+):([^,]+)/g);
    const clickableOptions = [];

    for (const optionMatch of optionMatches) {
      const optionNumber = parseInt(optionMatch[1]);
      const twPath = optionMatch[2].trim();

      if (optionNumber !== currentOptionNumber) {
        const newDisambiguation = `manual:option${optionNumber} (${optionsText})`;
        const newTWLink = `rc://*/tw/dict/bible/${twPath}`;

        clickableOptions.push({
          text: `${optionNumber}:${twPath}`,
          newDisambiguation,
          newTWLink,
          onClick: () => handleDisambiguationClick(currentRowIndex, currentCellIndex, newDisambiguation, newTWLink),
        });
      }
    }

    return {
      currentOption: `manual:option${currentOptionNumber}`,
      clickableOptions,
    };
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'rgb(229, 231, 235)' }}>
        {/* Header */}
        <AppBar position="static" sx={{ bgcolor: '#38ADDF' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ color: 'white', fontWeight: 'bold' }}>
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
                {/* Book Selector */}
                <Box sx={{ flex: 1, minWidth: 300 }}>
                  <Autocomplete
                    options={bookOptions}
                    getOptionLabel={(option) => option.label}
                    onChange={handleBookSelect}
                    renderInput={(params) => <TextField {...params} label="Select a Bible book..." variant="outlined" fullWidth />}
                    value={selectedBook}
                    isOptionEqualToValue={(option, value) => option.value === value?.value}
                    sx={{ mt: 2 }}
                  />
                </Box>

                {/* Branch Selector */}
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
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
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
                  onClick={handleFetchFromDcs}
                  startIcon={<DownloadIcon />}
                  variant="text"
                  disabled={!selectedBook}
                  sx={{
                    color: selectedBook ? '#1976d2' : 'rgba(0, 0, 0, 0.26)',
                    textTransform: 'none',
                    '&:hover': selectedBook ? { backgroundColor: 'rgba(25, 118, 210, 0.04)' } : {},
                  }}
                >
                  Fetch en_twl / twl_{selectedBook?.value.toUpperCase() || 'BOOK'}.tsv ({selectedBranch}) from DCS
                </Button>
              </Box>

              {showExistingTwlTextArea && (
                <textarea
                  value={existingTwlContent}
                  onChange={(e) => handleExistingTwlChange(e.target.value)}
                  placeholder="Existing TWL content will appear here... (Must have exactly 6 columns per row)"
                  style={{
                    width: '100%',
                    height: '200px',
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
              )}

              {showExistingTwlTextArea && !existingTwlValid && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  Invalid TWL format. Each row must have exactly 6 tab-separated columns.
                </Alert>
              )}

              {/* Generate TWLs Button */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  onClick={handleGenerateTwl}
                  variant="contained"
                  disabled={!selectedBook || loading || (existingTwlContent.trim() && !existingTwlValid)}
                  sx={{
                    backgroundColor: '#1976d2',
                    '&:hover': { backgroundColor: '#1565c0' },
                    textTransform: 'none',
                    px: 4,
                    py: 1.5,
                  }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
                  Generate TWLs
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Loading Indicator */}
          {loading && (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                  Loading book content and generating TWL...
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* TWL Content Display */}
          {twlContent && !loading && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Generated TWL Content for {selectedBook?.label}
                </Typography>

                {/* Toggle Control */}
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                  <FormControlLabel
                    control={<Checkbox checked={showOnlySixColumns} onChange={(e) => setShowOnlySixColumns(e.target.checked)} color="primary" />}
                    label="Hide the Extra Columns"
                  />

                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(event, newViewMode) => {
                      if (newViewMode !== null) {
                        setViewMode(newViewMode);
                      }
                    }}
                    size="small"
                  >
                    <ToggleButton value="table">Table View (Read-Only)</ToggleButton>
                    <ToggleButton value="raw">Raw Text {showOnlySixColumns ? <span>(Read-Only)</span> : <span>(Edit Mode)</span>}</ToggleButton>
                  </ToggleButtonGroup>

                  {viewMode === 'table' && deletedRow && (
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
                      Undo Delete
                    </Button>
                  )}

                  <button
                    onClick={() => {
                      if (!twlContent) return;

                      // Process content to show only first 6 columns
                      const contentString = typeof twlContent === 'string' ? twlContent : String(twlContent);
                      const lines = contentString.split('\n');
                      const trimmedContent = lines
                        .map((line) => {
                          const columns = line.split('\t');
                          return columns.slice(0, 6).join('\t');
                        })
                        .join('\n');

                      navigator.clipboard
                        .writeText(trimmedContent)
                        .then(() => {
                          // Show user-friendly notification
                          alert("This TWL's first 6 columns have been copied to your clipboard. You can now 'Edit on DCS' and paste in the copied content.");
                          console.log('TSV content copied to clipboard (6 columns)');
                        })
                        .catch((err) => {
                          console.error('Failed to copy to clipboard:', err);
                          alert('Failed to copy to clipboard. Please try again.');
                        });
                    }}
                    style={{
                      color: '#1976d2',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      padding: '6px 12px',
                      border: '1px solid #1976d2',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      transition: 'all 0.2s ease',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#1976d2';
                      e.target.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#1976d2';
                    }}
                  >
                    Copy to Clipboard
                  </button>

                  <a
                    href={`https://git.door43.org/unfoldingWord/en_twl/_edit/${selectedBranch}/twl_${selectedBook?.value.toUpperCase()}.tsv`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#1976d2',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      padding: '6px 12px',
                      border: '1px solid #1976d2',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#1976d2';
                      e.target.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#1976d2';
                    }}
                  >
                    Edit twl_{selectedBook?.value.toUpperCase()}.tsv on DCS
                  </a>
                </Box>

                <Box sx={{ mt: 2 }}>
                  {viewMode === 'table' ? (
                    // Table View
                    <TableContainer
                      component={Paper}
                      sx={{
                        maxHeight: '600px',
                        border: '1px solid #ccc',
                        '& .MuiTableCell-root': {
                          fontSize: '12px',
                          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                          whiteSpace: 'normal',
                          wordWrap: 'break-word',
                          maxWidth: '300px',
                          minWidth: '100px',
                          cursor: 'text',
                          verticalAlign: 'top',
                          padding: '8px 12px',
                        },
                        '& .MuiTableCell-head': {
                          backgroundColor: '#f5f5f5',
                          fontWeight: 'bold',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
                        },
                      }}
                    >
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: '50px', textAlign: 'center' }}>Action</TableCell>
                            {tableData.headers.map((header, index) => (
                              <TableCell key={index}>{header}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tableData.rows.map((row, rowIndex) => (
                            <TableRow key={rowIndex} hover>
                              {/* Delete Button Column */}
                              <TableCell sx={{ width: '50px', textAlign: 'center' }}>
                                <IconButton
                                  onClick={() => handleDeleteRow(rowIndex)}
                                  size="small"
                                  sx={{
                                    color: '#d32f2f',
                                    '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.04)' },
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>

                              {row.map((cell, cellIndex) => {
                                const headerName = tableData.headers[cellIndex];
                                const isTWLinkColumn = headerName === 'TWLink';
                                const isReferenceColumn = headerName === 'Reference';
                                const isContextColumn = headerName === 'Context';
                                const isDisambiguationColumn = headerName === 'Disambiguation';

                                if (isTWLinkColumn && cell) {
                                  const url = convertRcLinkToUrl(cell);
                                  if (url) {
                                    return (
                                      <TableCell key={cellIndex}>
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            color: '#1976d2',
                                            textDecoration: 'underline',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          {cell}
                                        </a>
                                      </TableCell>
                                    );
                                  }
                                }

                                if (isReferenceColumn && cell && selectedBook) {
                                  const url = convertReferenceToTnUrl(cell);
                                  if (url) {
                                    return (
                                      <TableCell key={cellIndex}>
                                        <Tooltip title="View the TNs for this verse" arrow>
                                          <a
                                            href={url}
                                            onClick={(e) => handleReferenceClick(cell, e)}
                                            style={{
                                              color: '#1976d2',
                                              textDecoration: 'underline',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            {cell}
                                          </a>
                                        </Tooltip>
                                      </TableCell>
                                    );
                                  }
                                }

                                if (isContextColumn && cell) {
                                  const truncatedText = truncateContext(cell);
                                  const shouldTruncate = truncatedText !== cell;

                                  if (shouldTruncate) {
                                    return (
                                      <TableCell key={cellIndex}>
                                        <Tooltip title={cell} arrow>
                                          <span style={{ cursor: 'help' }}>{truncatedText}</span>
                                        </Tooltip>
                                      </TableCell>
                                    );
                                  }
                                }

                                if (isDisambiguationColumn && cell) {
                                  const { currentOption, clickableOptions } = parseDisambiguationOptions(cell, rowIndex, cellIndex);

                                  if (clickableOptions.length > 0) {
                                    // Split the text and make non-current options clickable
                                    const parts = cell.split('(');
                                    if (parts.length === 2) {
                                      const prefix = parts[0].trim(); // "manual:option1 "
                                      const optionsText = parts[1].replace(')', ''); // "1:other/time, 2:other/age-timeperiod"

                                      return (
                                        <TableCell key={cellIndex}>
                                          <span>{prefix} (</span>
                                          {optionsText.split(',').map((option, optIndex) => {
                                            const trimmedOption = option.trim();
                                            const clickableOption = clickableOptions.find((opt) => trimmedOption === opt.text);

                                            return (
                                              <React.Fragment key={optIndex}>
                                                {optIndex > 0 && ', '}
                                                {clickableOption ? (
                                                  <span
                                                    onClick={clickableOption.onClick}
                                                    style={{
                                                      color: '#1976d2',
                                                      textDecoration: 'underline',
                                                      cursor: 'pointer',
                                                    }}
                                                  >
                                                    {trimmedOption}
                                                  </span>
                                                ) : (
                                                  <span>{trimmedOption}</span>
                                                )}
                                              </React.Fragment>
                                            );
                                          })}
                                          <span>)</span>
                                        </TableCell>
                                      );
                                    }
                                  }
                                }

                                return <TableCell key={cellIndex}>{cell}</TableCell>;
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    // Raw TSV View
                    <textarea
                      value={processedTsvContent}
                      readOnly={showOnlySixColumns}
                      onChange={(e) => {
                        if (!showOnlySixColumns) {
                          setTwlContent(e.target.value);
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '500px',
                        padding: '16px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '12px',
                        resize: 'both',
                        whiteSpace: 'pre',
                        overflow: 'scroll', // Always show scrollbars
                        tabSize: 4,
                        backgroundColor: showOnlySixColumns ? '#f5f5f5' : '#ffffff',
                        cursor: showOnlySixColumns ? 'default' : 'text',
                        boxSizing: 'border-box',
                        outline: 'none', // Remove default focus outline
                        lineHeight: '1.4', // Better line spacing for readability
                      }}
                      placeholder={showOnlySixColumns ? 'Read-only view showing first 6 columns...' : 'Edit TSV content here...'}
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
