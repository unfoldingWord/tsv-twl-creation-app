/**
 * Component for managing unlinked words
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Link,
  Tabs,
  Tab,
} from '@mui/material';
import { Delete as DeleteIcon, ArrowUpward as ArrowUpwardIcon, ArrowDownward as ArrowDownwardIcon } from '@mui/icons-material';
import { useUnlinkedWords } from '../hooks/useUnlinkedWords.js';
import { convertReferenceToUltUrl, convertTwLinkToUrl } from '../utils/urlConverters.js';
import { getUserIdentifier } from '../utils/userUtils.js';

const UnlinkedWordsManager = ({ open, onClose, onUnlinkedWordsChange, dcsHost }) => {
  const { unlinkedWords, loading, error, removeUnlinkedWord, refreshFromServer, refreshFromLocalStorage } = useUnlinkedWords();
  const [activeTab, setActiveTab] = useState(0); // 0 = My Words, 1 = All Words
  const [sortColumn, setSortColumn] = useState('dateAdded'); // Default sort by Date Added
  const [sortDirection, setSortDirection] = useState('desc'); // Default descending (newest first)

  // Refresh unlinked words when dialog opens
  useEffect(() => {
    if (open) {
      refreshFromLocalStorage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only depend on 'open', not the function

  // Get current user ID
  const currentUserId = getUserIdentifier();

  // Filter out removed items for display
  const allActiveUnlinkedWords = unlinkedWords.filter((word) => !word.removed);
  const myActiveUnlinkedWords = allActiveUnlinkedWords.filter((word) => word.userIdentifier === currentUserId);

  // Determine which words to display based on active tab
  let displayedUnlinkedWords = activeTab === 0 ? myActiveUnlinkedWords : allActiveUnlinkedWords;

  // Apply sorting if a sort column is selected
  if (sortColumn) {
    displayedUnlinkedWords = [...displayedUnlinkedWords].sort((a, b) => {
      let valueA = a[sortColumn] || '';
      let valueB = b[sortColumn] || '';

      // Special handling for date fields
      if (sortColumn === 'dateAdded') {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      } else {
        // Convert to strings for consistent comparison
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
      }

      if (valueA < valueB) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      // If clicking the same column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new column, set it as sort column with ascending direction
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  /**
   * Handle removing an unlinked word
   */
  const handleRemoveWord = async (origWords, twLink) => {
    try {
      await removeUnlinkedWord(origWords, twLink);

      // Notify parent that unlinked words changed
      if (onUnlinkedWordsChange) {
        onUnlinkedWordsChange();
      }
    } catch (error) {
      console.error('Failed to remove unlinked word:', error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' },
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          Manage Unlinked Words
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Words in this list are automatically removed from generated TWLs. Remove words from this list to re-enable linking in future generations.
        </Typography>
      </DialogTitle>

      {/* Tabs for filtering */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="unlinked words filter tabs">
          <Tab label={`My Unlinked Words (${myActiveUnlinkedWords.length})`} />
          <Tab label={`All Unlinked Words (${allActiveUnlinkedWords.length})`} />
        </Tabs>
      </Box>

      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading unlinked words...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {!loading && displayedUnlinkedWords.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {activeTab === 0 ? 'No unlinked words found for your user.' : 'No unlinked words found.'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Use the unlink button (🔗) in the table to unlink words.
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('book')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Book
                      {sortColumn === 'book' && (sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('reference')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Reference
                      {sortColumn === 'reference' && (sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('origWords')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      OrigWords
                      {sortColumn === 'origWords' && (sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('twLink')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      TWLink
                      {sortColumn === 'twLink' && (sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('glQuote')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      GLQuote
                      {sortColumn === 'glQuote' && (sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                    </Box>
                  </TableCell>
                  {activeTab === 1 && (
                    <TableCell sx={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('userIdentifier')}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        User ID
                        {sortColumn === 'userIdentifier' && (sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                      </Box>
                    </TableCell>
                  )}
                  <TableCell sx={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('dateAdded')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Date Added
                      {sortColumn === 'dateAdded' && (sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ width: '80px', textAlign: 'center' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedUnlinkedWords.map((word) => (
                  <TableRow key={word.id} hover>
                    <TableCell
                      sx={{
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {word.book.toUpperCase() || 'Unknown'}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '12px',
                      }}
                    >
                      {(() => {
                        const ultUrl = convertReferenceToUltUrl(word.reference, word.book);
                        return ultUrl ? (
                          <Link
                            href={ultUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              color: '#1976d2',
                              textDecoration: 'none',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                          >
                            {word.reference}
                          </Link>
                        ) : (
                          word.reference
                        );
                      })()}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '12px',
                      }}
                    >
                      {word.origWords}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '12px',
                      }}
                    >
                      {(() => {
                        const twUrl = convertTwLinkToUrl(word.twLink, dcsHost);
                        return twUrl ? (
                          <Link
                            href={twUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              color: '#1976d2',
                              textDecoration: 'none',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                          >
                            {word.twLink}
                          </Link>
                        ) : (
                          word.twLink
                        );
                      })()}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '12px',
                      }}
                    >
                      {word.glQuote}
                    </TableCell>
                    {activeTab === 1 && <TableCell sx={{ fontSize: '12px', fontFamily: 'monospace' }}>{word.userIdentifier || 'Unknown'}</TableCell>}
                    <TableCell sx={{ fontSize: '12px' }}>{new Date(word.dateAdded).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Re-enable linking for this word">
                        <IconButton
                          onClick={() => handleRemoveWord(word.origWords, word.twLink)}
                          size="small"
                          sx={{
                            color: '#4caf50',
                            '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.04)' },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'flex-end', p: 2 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UnlinkedWordsManager;
