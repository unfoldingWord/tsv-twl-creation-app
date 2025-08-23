/**
 * Interactive table component for displaying TWL data with pagination, search, and filtering
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Typography,
  Pagination,
  TablePagination,
  InputAdornment,
  Menu,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Delete as DeleteIcon, Search as SearchIcon, Clear as ClearIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { RxLinkBreak2 as UnlinkIcon } from 'react-icons/rx';
import { convertRcLinkToUrl, convertReferenceToTnUrl } from '../utils/urlConverters.js';
import { truncateContextAroundWord } from '../utils/tsvUtils.js';
import { parseDisambiguationOptions, renderDisambiguationText } from '../utils/disambiguationUtils.js';
import JSZip from 'jszip';

const TWLTable = ({ tableData, selectedBook, onDeleteRow, onUnlinkRow, onDisambiguationClick, onReferenceClick, onClearDisambiguation, dcsHost }) => {
  // State for pagination, search, and filtering
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [filters, setFilters] = useState({
    hasDisambiguation: null, // null = show all, true = has disambiguation, false = no disambiguation
    mergeStatus: '', // '' = show all, 'BOTH' = has 'BOTH', 'OLD' = has 'OLD', 'NEW' = has 'NEW'
    isInvalidRCLink: null, // null = show all, true = is invalid
  });

  // Memoized fetch and load of en_tw zip file
  const [twRcLinks, setTwRcLinks] = useState([]);

  useEffect(() => {
    async function fetchTwArticleRcLinks() {
      try {
        const response = await fetch(`https://${dcsHost}/unfoldingWord/en_tw/archive/master.zip`);
        const blob = await response.blob();
        const zip = await JSZip.loadAsync(blob);
        // Get all article paths that start with en_tw/bible and end with .md
        const rcLinks = Object.keys(zip.files)
          .filter((filePath) => filePath.startsWith('en_tw/bible/') && filePath.endsWith('.md'))
          .map((filePath) => 'rc://*/tw/dict/' + filePath.slice('en_tw/'.length, filePath.length - '.md'.length));
        setTwRcLinks(rcLinks);
      } catch (err) {
        console.warn(`Error fetching or processing en_tw zip: ${err.message}`);
      }
    }
    fetchTwArticleRcLinks();
  }, [dcsHost]);

  if (!tableData || !tableData.headers.length) {
    return <div>No data to display</div>;
  }

  // Find column indices for search and filtering
  const referenceIndex = tableData.headers.findIndex((header) => header === 'Reference');
  const origWordsIndex = tableData.headers.findIndex((header) => header === 'OrigWords');
  const twLinkIndex = tableData.headers.findIndex((header) => header === 'TWLink');
  const glQuoteIndex = tableData.headers.findIndex((header) => header === 'GLQuote');
  const disambiguationIndex = tableData.headers.findIndex((header) => header === 'Disambiguation');
  const alreadyExistsIndex = tableData.headers.findIndex((header) => header === 'Merge Status');
  const idIndex = tableData.headers.findIndex((header) => header === 'ID');
  const tagsIndex = tableData.headers.findIndex((header) => header === 'Tags');

  // Filter and search logic
  const filteredRows = useMemo(() => {
    let filtered = tableData.rows;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((row) => {
        // Reference (exact match)
        if (referenceIndex >= 0 && row[referenceIndex] && row[referenceIndex].toLowerCase() === searchLower) {
          return true;
        }
        // OrigWords (partial match)
        if (origWordsIndex >= 0 && row[origWordsIndex] && row[origWordsIndex].toLowerCase().includes(searchLower)) {
          return true;
        }
        // TWLink (partial match)
        if (twLinkIndex >= 0 && row[twLinkIndex] && row[twLinkIndex].toLowerCase().includes(searchLower)) {
          return true;
        }
        // GLQuote (partial match)
        if (glQuoteIndex >= 0 && row[glQuoteIndex] && row[glQuoteIndex].toLowerCase().includes(searchLower)) {
          return true;
        }
        // Disambiguation (partial match)
        if (disambiguationIndex >= 0 && row[disambiguationIndex] && row[disambiguationIndex].toLowerCase().includes(searchLower)) {
          return true;
        }
        // ID (partial match)
        if (idIndex >= 0 && row[idIndex] && row[idIndex].toLowerCase().includes(searchLower)) {
          return true;
        }
        // Tags (partial match)
        if (tagsIndex >= 0 && row[tagsIndex] && row[tagsIndex].toLowerCase().includes(searchLower)) {
          return true;
        }
        return false;
      });
    }

    // Apply filters
    if (filters.hasDisambiguation !== null) {
      filtered = filtered.filter((row) => {
        const hasDisambiguation = disambiguationIndex >= 0 && row[disambiguationIndex] && row[disambiguationIndex].trim() !== '';
        return filters.hasDisambiguation ? hasDisambiguation : !hasDisambiguation;
      });
    }

    // Apply invalid RC link
    if (filters.isInvalidRCLink !== null) {
      filtered = filtered.filter((row) => {
        const isInvalidRCLink = twLinkIndex >= 0 && row[twLinkIndex] && !twRcLinks.includes(row[twLinkIndex]);
        return filters.isInvalidRCLink ? isInvalidRCLink : !isInvalidRCLink;
      });
    }

    if (filters.mergeStatus !== '') {
      filtered = filtered.filter((row) => {
        const mergeStatus = alreadyExistsIndex >= 0 && row[alreadyExistsIndex] && row[alreadyExistsIndex].trim() === filters.mergeStatus;
        return filters.mergeStatus ? mergeStatus : !mergeStatus;
      });
    }

    return filtered;
  }, [tableData.rows, searchTerm, filters, referenceIndex, origWordsIndex, twLinkIndex, glQuoteIndex, disambiguationIndex, alreadyExistsIndex, idIndex, tagsIndex]);

  // Pagination logic
  const paginatedRows = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredRows.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  // Handle pagination changes
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Reset page when search term or filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, filters]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  // Handle filtering
  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setPage(0); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      hasDisambiguation: null,
      mergeStatus: null,
      isInvalidRCLink: null,
    });
    setPage(0);
  };

  // Calculate actual row indices for callbacks (accounting for pagination and filtering)
  const getActualRowIndex = (paginatedRowIndex) => {
    const filteredRowIndex = page * rowsPerPage + paginatedRowIndex;
    const filteredRow = filteredRows[filteredRowIndex];
    return tableData.rows.findIndex((row) => row === filteredRow);
  };

  return (
    <Box>
      {/* Search and Filter Controls */}
      <Box sx={{ mb: 0, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search Reference, ID, Tags, OrigWords, TWLink, GLQuote, Disambiguation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 400, flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={clearSearch}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="outlined"
          onClick={handleFilterClick}
          startIcon={<FilterIcon />}
          size="small"
          endIcon={
            (filters.hasDisambiguation !== null || filters.mergeStatus !== '' || filters.isInvalidRCLink !== null) && (
              <Chip size="small" label={Object.values(filters).filter((v) => v !== null && v !== '').length} color="primary" sx={{ ml: 1 }} />
            )
          }
        >
          Filter
        </Button>
      </Box>

      {/* Filter Menu */}
      <Menu anchorEl={filterAnchorEl} open={Boolean(filterAnchorEl)} onClose={handleFilterClose} PaperProps={{ sx: { minWidth: 250 } }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filters
          </Typography>

          <FormGroup>
            {/* Disambiguation filter checkboxes (no label) */}
            <FormControlLabel
              control={<Checkbox checked={filters.hasDisambiguation === true} onChange={(e) => handleFilterChange('hasDisambiguation', e.target.checked ? true : null)} />}
              label="Has Disambiguation"
            />
            <FormControlLabel
              control={<Checkbox checked={filters.hasDisambiguation === false} onChange={(e) => handleFilterChange('hasDisambiguation', e.target.checked ? false : null)} />}
              label="No Disambiguation"
            />

            <FormControlLabel
              control={<Checkbox checked={filters.isInvalidRCLink === true} onChange={(e) => handleFilterChange('isInvalidRCLink', e.target.checked ? true : null)} />}
              label="Is Invalid TWLink"
            />

            {/* Only show Merge Status filter if the column exists */}
            {alreadyExistsIndex >= 0 && (
              <>
                <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                  Merge Status:
                </Typography>
                <FormControlLabel
                  control={<Checkbox checked={filters.mergeStatus === 'BOTH'} onChange={(e) => handleFilterChange('mergeStatus', e.target.checked ? 'BOTH' : '')} />}
                  label="BOTH"
                />
                <FormControlLabel
                  control={<Checkbox checked={filters.mergeStatus === 'OLD'} onChange={(e) => handleFilterChange('mergeStatus', e.target.checked ? 'OLD' : '')} />}
                  label="OLD"
                />
                <FormControlLabel
                  control={<Checkbox checked={filters.mergeStatus === 'NEW'} onChange={(e) => handleFilterChange('mergeStatus', e.target.checked ? 'NEW' : '')} />}
                  label="NEW"
                />
              </>
            )}
          </FormGroup>

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button size="small" onClick={clearFilters}>
              Clear All
            </Button>
            <Button size="small" variant="contained" onClick={handleFilterClose}>
              Apply
            </Button>
          </Box>
        </Box>
      </Menu>

      {/* Pagination */}
      <Box sx={{ mt: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <TablePagination
          component="div"
          count={filteredRows.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100, 250, 500, 1000]}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
          sx={{ '& .MuiTablePagination-toolbar': { minHeight: '52px' } }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
          {filteredRows.length !== tableData.rows.length && `Matches ${filteredRows.length} of the ${tableData.rows.length} rows.`}
        </Typography>
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          maxHeight: '800px',
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
                <TableCell key={index} sx={{ fontWeight: index > 5 ? 'normal' : 'bold', fontSize: index > 5 ? '1em' : '1.2em', color: index > 5 ? 'grey' : 'black' }}>
                  {header}
                </TableCell>
              ))}
              {<TableCell sx={{ width: '100px', textAlign: 'center', fontWeight: 'norma', color: 'grey' }}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.map((row, rowIndex) => (
              <TableRow key={`${page}-${rowIndex}`} hover>
                {row.map((cell, cellIndex) => {
                  const headerName = tableData.headers[cellIndex];
                  const isTWLinkColumn = headerName === 'TWLink';
                  const isReferenceColumn = headerName === 'Reference';
                  const isContextColumn = headerName === 'Context';
                  const isDisambiguationColumn = headerName === 'Disambiguation';

                  // TWLink column with external links
                  if (isTWLinkColumn && cell) {
                    const url = convertRcLinkToUrl(cell, dcsHost);
                    if (url) {
                      return (
                        <TableCell key={cellIndex} sx={!twRcLinks.includes(cell) ? { backgroundColor: '#ffe5e5' } : undefined}>
                          <Tooltip title="View the Translation Words article for this word" arrow>
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
                          </Tooltip>
                        </TableCell>
                      );
                    }
                  }

                  // Reference column with TN links
                  if (isReferenceColumn && cell && selectedBook) {
                    const url = convertReferenceToTnUrl(cell, selectedBook);
                    if (url) {
                      return (
                        <TableCell key={cellIndex}>
                          <Tooltip title="View the TNs for this verse" arrow>
                            <a
                              href={url}
                              onClick={(e) => onReferenceClick && onReferenceClick(cell, e)}
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

                  // Context column with truncation and tooltip
                  if (isContextColumn && cell) {
                    const truncatedText = truncateContextAroundWord(cell);
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

                  // Disambiguation column with clickable options (only when actions are enabled)
                  if (isDisambiguationColumn && cell) {
                    // Find the TWLink column value for this row
                    const twLinkIndex = tableData.headers.findIndex((h) => h === 'TWLink');
                    const currentTWLink = twLinkIndex !== -1 ? row[twLinkIndex] : '';

                    const parseResult = parseDisambiguationOptions(cell, currentTWLink, (newDisambiguation, newTWLink) => {
                      onDisambiguationClick(getActualRowIndex(rowIndex), cellIndex, newDisambiguation, newTWLink);
                    });

                    if (parseResult.clickableOptions.length > 0) {
                      const elements = renderDisambiguationText(cell, parseResult);

                      return (
                        <TableCell key={cellIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1, padding: '4px 8px' }}>
                          {onClearDisambiguation && (
                            <Tooltip title="Mark as done (will remove these choices)" arrow>
                              <Checkbox
                                checked={false}
                                size="small"
                                sx={{
                                  padding: '2px',
                                  '& .MuiSvgIcon-root': {
                                    fontSize: '0.8rem',
                                  },
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  onClearDisambiguation(getActualRowIndex(rowIndex), cellIndex);
                                }}
                              />
                            </Tooltip>
                          )}
                          <Box sx={{ flex: 1 }}>
                            {elements.map((element, elemIndex) => {
                              if (element.type === 'clickable') {
                                return (
                                  <React.Fragment key={elemIndex}>
                                    <span
                                      onClick={async (e) => {
                                        // Change cursor to wait on click
                                        e.target.style.cursor = 'wait';
                                        await new Promise((resolve) => setTimeout(resolve, 100));
                                        element.onClick();
                                      }}
                                      style={{
                                        color: '#1976d2',
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {element.content}
                                    </span>
                                  </React.Fragment>
                                );
                              } else {
                                return (
                                  <React.Fragment key={elemIndex}>
                                    <span style={element.isSelected ? { fontWeight: 'bold', color: '#333' } : {}}>{element.content}</span>
                                  </React.Fragment>
                                );
                              }
                            })}
                          </Box>
                        </TableCell>
                      );
                    }
                  }

                  // Handle disambiguation column with content but no clickable options
                  if (isDisambiguationColumn && cell) {
                    return (
                      <TableCell key={cellIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1, padding: '4px 8px' }}>
                        {onClearDisambiguation && (
                          <Tooltip title="Mark as done (clears disambiguation)" arrow>
                            <Checkbox
                              checked={false}
                              size="small"
                              sx={{
                                padding: '2px',
                                '& .MuiSvgIcon-root': {
                                  fontSize: '0.8rem',
                                },
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                onClearDisambiguation(getActualRowIndex(rowIndex), cellIndex);
                              }}
                            />
                          </Tooltip>
                        )}
                        <Box sx={{ flex: 1 }}>{cell}</Box>
                      </TableCell>
                    );
                  }

                  // Default cell rendering
                  return <TableCell key={cellIndex}>{cell}</TableCell>;
                })}

                <TableCell sx={{ width: '100px', textAlign: 'center' }}>
                  <Tooltip title="Delete just this one TWL">
                    <IconButton
                      onClick={() => onDeleteRow(getActualRowIndex(rowIndex))}
                      size="small"
                      sx={{
                        color: '#d32f2f',
                        '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.04)' },
                        mr: 1,
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Unlink this Word: This `OrigWords` will never be linked to this `TW` article again, removing this one and others in this list with the same `OrigWords` and `TWLink`. Can be managed via the Unlinked Words Manager above.">
                    <IconButton
                      onClick={() => onUnlinkRow(getActualRowIndex(rowIndex))}
                      size="small"
                      sx={{
                        color: 'red',
                        '&:hover': { backgroundColor: 'rgba(255, 152, 0, 0.04)' },
                      }}
                    >
                      <UnlinkIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <TablePagination
          component="div"
          count={filteredRows.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100, 250, 500, 1000]}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
          sx={{ '& .MuiTablePagination-toolbar': { minHeight: '52px' } }}
        />
      </Box>
    </Box>
  );
};

export default TWLTable;
