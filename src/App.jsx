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
} from '@mui/material';
import { ContentPaste as PasteIcon, Upload as UploadIcon, CloudDownload as DownloadIcon, Undo as UndoIcon, ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Internal imports
import { BibleBookData } from '@common/books';
import { useAppState } from './hooks/useAppState.js';
import { useTableData } from './hooks/useTableData.js';
import TWLTable from './components/TWLTable.jsx';
import { fetchUSFMContent, fetchTWLContent } from './services/apiService.js';
import { mergeExistingTwls } from './services/twlService.js';
import { isValidTsvStructure, processTsvContent, addGLQuoteColumns, ensureUniqueIds } from './utils/tsvUtils.js';
import { convertReferenceToTnUrl } from './utils/urlConverters.js';

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
    showOnlySixColumns,
    viewMode,
    showExistingTwlTextArea,
    existingTwlValid,
    // State setters
    setUsfmContent,
    setTwlContent,
    setExistingTwlContent,
    setExistingTwlContentWithGLQuotes,
    setLoading,
    setError,
    setShowOnlySixColumns,
    setViewMode,
    setShowExistingTwlTextArea,
    setExistingTwlValid,
    // Handlers
    handleBranchSelect,
    handleBookSelect,
  } = useAppState();

  // Process TWL content based on column visibility setting
  const processedTsvContent = useMemo(() => processTsvContent(twlContent, showOnlySixColumns), [twlContent, showOnlySixColumns]);

  // Table data management (now just parsing, no independent state)
  const { tableData } = useTableData(processedTsvContent);

  // Backup/restore system for undo functionality
  const [backupTwlContent, setBackupTwlContent] = useState(null);
  const hasBackup = Boolean(backupTwlContent);

  // Clear backup when book changes
  useEffect(() => {
    setBackupTwlContent(null);
  }, [selectedBook?.value]); // Only trigger on book value change, not branch

  // Download menu state
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);
  const downloadMenuOpen = Boolean(downloadMenuAnchor);

  // Handle download menu open/close
  const handleDownloadMenuClick = (event) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchor(null);
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
    const newContent = newLines.join('\n');

    setTwlContent(newContent);
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
    const newContent = lines.join('\n');
    setTwlContent(newContent);
  };

  /**
   * Handle raw text changes with backup
   */
  const handleRawTextChange = (newContent) => {
    if (newContent !== twlContent) {
      // Create backup before making changes
      createBackup();
      setTwlContent(newContent);
    }
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
      setShowExistingTwlTextArea(true);
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
      setShowExistingTwlTextArea(true);
    };
    reader.onerror = () => {
      setError('Failed to read the uploaded file.');
    };
    reader.readAsText(file);
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
        if (!existingTwlContentWithGLQuotes) {
          const params = {
            bibleLinks: ['unfoldingWord/en_ult/master'],
            bookCode: selectedBook.value,
            tsvContent: existingTwlContent.trim(),
            trySeparatorsAndOccurrences: true,
            quiet: false,
          };

          const addGLQuoteColsResult = await addGLQuoteCols(params);

          if (!addGLQuoteColsResult || typeof addGLQuoteColsResult !== 'object' || !addGLQuoteColsResult.output) {
            throw new Error(`addGLQuoteCols failed: ${JSON.stringify(addGLQuoteColsResult)}`);
          }

          existingTWLs = addGLQuoteColsResult.output;
          // Rearrange columns: move columns 6 and 7 to the end, switching with column 8
          const lines = existingTWLs.split('\n');
          existingTWLs = lines
            .map((line) => {
              if (!line.trim()) return line;
              const columns = line.split('\t');
              if (columns.length >= 8) {
                // Move columns 6,7 to end and column 8 to position 6
                const [col1, col2, col3, col4, col5, col6, col7, col8, ...rest] = columns;
                return [col1, col2, col3, col4, col5, col8, col6, col7, ...rest].join('\t');
              }
              return line;
            })
            .join('\n');
          setExistingTwlContentWithGLQuotes(existingTWLs);
        } else {
          existingTWLs = existingTwlContentWithGLQuotes;
        }
        generatedTwl = mergeExistingTwls(generatedTwl, existingTWLs);
      }

      // Ensure all IDs are unique and properly formatted
      generatedTwl = ensureUniqueIds(generatedTwl);
      console.log('Generated TWL (with unique IDs):', generatedTwl);

      setTwlContent(generatedTwl);
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
      const isValid = isValidTsvStructure(content);
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

    const contentString = typeof twlContent === 'string' ? twlContent : String(twlContent);
    const lines = contentString.split('\n');
    const processedLines = lines.map((line) => {
      const columns = line.split('\t');
      return columns.slice(0, 6).join('\t');
    });

    const finalContent = processedLines.join('\n');
    const blob = new Blob([finalContent], { type: 'text/tab-separated-values' });
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
   * Download all columns (extended format with extra data)
   */
  const handleDownloadAllColumns = () => {
    if (!twlContent) return;

    handleDownloadMenuClose();

    const contentToDownload = processTsvContent(twlContent, false); // false = show all columns
    const blob = new Blob([contentToDownload], { type: 'text/tab-separated-values' });
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
                  onClick={async () => {
                    if (!selectedBook) return;

                    setLoading(true);
                    try {
                      const content = await fetchTWLContent(selectedBook.value, selectedBranch);
                      handleExistingTwlChange(content);
                      setShowExistingTwlTextArea(true);
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
                  Generate TWLs
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
                    <ToggleButton value="table">Table View</ToggleButton>
                    <ToggleButton value="raw">Raw Text {showOnlySixColumns ? <span>(Read-Only)</span> : <span>(Edit Mode)</span>}</ToggleButton>
                  </ToggleButtonGroup>

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
                </Box>

                {/* Content Display */}
                <Box sx={{ mt: 2 }}>
                  {viewMode === 'table' ? (
                    <TWLTable
                      tableData={tableData}
                      selectedBook={selectedBook}
                      onDeleteRow={handleDeleteRow}
                      onDisambiguationClick={handleDisambiguationClick}
                      onReferenceClick={handleReferenceClick}
                      showOnlySixColumns={showOnlySixColumns}
                    />
                  ) : (
                    <>
                      {!showOnlySixColumns && hasBackup && (
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
                        readOnly={showOnlySixColumns}
                        onChange={(e) => {
                          if (!showOnlySixColumns) {
                            handleRawTextChange(e.target.value);
                          }
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
                          backgroundColor: showOnlySixColumns ? '#f5f5f5' : 'white',
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
    </ThemeProvider>
  );
}

export default App;
