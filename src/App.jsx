import React, { useState, useMemo } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Card,
  CardContent,
  Autocomplete,
  TextField,
  TextareaAutosize,
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
} from '@mui/material';
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

function App() {
  const [selectedBook, setSelectedBook] = useState(null);
  const [usfmContent, setUsfmContent] = useState('');
  const [twlContent, setTwlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOnlySixColumns, setShowOnlySixColumns] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'raw'

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

    if (origWordsIndex === -1 || occurrenceIndex === -1) {
      console.warn('Could not find OrigWords or Occurrence columns');
      return tsvContent;
    }

    // Create new headers with GLQuote and GLOccurrence inserted after Occurrence
    const newHeaders = [...headers];
    newHeaders.splice(occurrenceIndex + 1, 0, 'GLQuote', 'GLOccurrence');

    // Process each row
    const newLines = lines.map((line, index) => {
      if (index === 0) {
        // Header row
        return newHeaders.join('\t');
      }

      const columns = line.split('\t');
      if (columns.length <= Math.max(origWordsIndex, occurrenceIndex)) {
        // Not enough columns, return as-is
        return line;
      }

      // Insert GLQuote (copy of OrigWords) and GLOccurrence (copy of Occurrence) after Occurrence
      const newColumns = [...columns];
      const glQuoteValue = columns[origWordsIndex] || '';
      const glOccurrenceValue = columns[occurrenceIndex] || '';

      newColumns.splice(occurrenceIndex + 1, 0, glQuoteValue, glOccurrenceValue);

      return newColumns.join('\t');
    });

    return newLines.join('\n');
  };

  // Prepare book options for the autocomplete
  const bookOptions = Object.keys(BibleBookData).map((bookId) => ({
    value: bookId,
    label: `${BibleBookData[bookId].title} (${bookId})`,
  }));

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
  const tableData = useMemo(() => {
    if (!processedTsvContent) return { headers: [], rows: [] };

    const lines = processedTsvContent.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = lines[0].split('\t');
    const rows = lines.slice(1).map((line) => line.split('\t'));

    return { headers, rows };
  }, [processedTsvContent]);

  const handleBookSelect = async (event, value) => {
    if (!value) {
      setSelectedBook(null);
      setUsfmContent('');
      setTwlContent('');
      setError('');
      setShowOnlySixColumns(false);
      setViewMode('table');
      return;
    }

    setSelectedBook(value);
    setLoading(true);
    setError('');
    setTwlContent('');
    setShowOnlySixColumns(false);
    setViewMode('table');

    try {
      const bookData = BibleBookData[value.value];
      const usfmFileName = bookData.usfm;

      const response = await fetch(`https://git.door43.org/api/v1/repos/unfoldingWord/en_ult/contents/${usfmFileName}.usfm?ref=master`);

      if (!response.ok) {
        throw new Error(`Failed to fetch USFM content: ${response.statusText}`);
      }

      const data = await response.json();
      const decodedContent = atob(data.content);
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
        bibleLinks: ['unfoldingWord/en_ult/master'],
        bookCode: value.value,
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

      setTwlContent(tsvContent);
    } catch (err) {
      setError(`Error loading book content: ${err.message}`);
    } finally {
      setLoading(false);
    }
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
          {/* Book Selection Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select a Book of the Bible
              </Typography>
              <Autocomplete
                options={bookOptions}
                getOptionLabel={(option) => option.label}
                onChange={handleBookSelect}
                renderInput={(params) => <TextField {...params} label="Search for a Bible book..." variant="outlined" fullWidth />}
                value={selectedBook}
                isOptionEqualToValue={(option, value) => option.value === value?.value}
                sx={{ mt: 2 }}
              />
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
                    label="Show only the 6 columns"
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
                    <ToggleButton value="raw">Raw TSV</ToggleButton>
                  </ToggleButtonGroup>
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
                            {tableData.headers.map((header, index) => (
                              <TableCell key={index}>{header}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tableData.rows.map((row, rowIndex) => (
                            <TableRow key={rowIndex} hover>
                              {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex}>{cell}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    // Raw TSV View
                    <TextareaAutosize
                      value={processedTsvContent}
                      readOnly={showOnlySixColumns}
                      onChange={(e) => {
                        if (!showOnlySixColumns) {
                          setTwlContent(e.target.value);
                        }
                      }}
                      style={{
                        width: '100%',
                        minHeight: '400px',
                        maxHeight: '600px',
                        padding: '16px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '12px',
                        resize: 'vertical',
                        whiteSpace: 'pre',
                        overflowX: 'auto',
                        overflowY: 'auto',
                        tabSize: 4,
                        backgroundColor: showOnlySixColumns ? '#f5f5f5' : '#ffffff',
                        cursor: showOnlySixColumns ? 'default' : 'text',
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
