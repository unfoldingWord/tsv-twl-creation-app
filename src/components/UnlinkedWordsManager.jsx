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
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useUnlinkedWords } from '../hooks/useUnlinkedWords.js';
import { convertReferenceToUltUrl, convertTwLinkToUrl } from '../utils/urlConverters.js';

const UnlinkedWordsManager = ({ open, onClose, onUnlinkedWordsChange }) => {
  const { unlinkedWords, loading, error, removeUnlinkedWord, refreshFromServer, refreshFromLocalStorage } = useUnlinkedWords();

  // Refresh unlinked words when dialog opens
  useEffect(() => {
    if (open) {
      refreshFromLocalStorage();
    }
  }, [open, refreshFromLocalStorage]);

  // Filter out removed items for display
  const activeUnlinkedWords = unlinkedWords.filter((word) => !word.removed);

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

        {!loading && activeUnlinkedWords.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No unlinked words found.
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
                  <TableCell sx={{ width: '80px', textAlign: 'center' }}>Action</TableCell>
                  <TableCell>Book</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>Original Words</TableCell>
                  <TableCell>TW Link</TableCell>
                  <TableCell>GL Quote</TableCell>
                  <TableCell>Date Added</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeUnlinkedWords.map((word) => (
                  <TableRow key={word.id} hover>
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
                    <TableCell
                      sx={{
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {word.book || 'Unknown'}
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
                        const twUrl = convertTwLinkToUrl(word.twLink);
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
                    <TableCell sx={{ fontSize: '12px' }}>{new Date(word.dateAdded).toLocaleDateString()}</TableCell>
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
