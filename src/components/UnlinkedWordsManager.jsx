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
} from '@mui/material';
import { Delete as DeleteIcon, Download as DownloadIcon, Upload as UploadIcon } from '@mui/icons-material';
import { getUnlinkedWords, removeUnlinkedWord, importUnlinkedWords } from '../utils/unlinkedWords.js';

const UnlinkedWordsManager = ({ open, onClose, onUnlinkedWordsChange }) => {
  const [unlinkedWords, setUnlinkedWords] = useState([]);

  // Load unlinked words when dialog opens
  useEffect(() => {
    if (open) {
      setUnlinkedWords(getUnlinkedWords());
    }
  }, [open]);

  /**
   * Handle removing an unlinked word
   */
  const handleRemoveWord = (id) => {
    const updatedWords = removeUnlinkedWord(id);
    setUnlinkedWords(updatedWords);

    // Notify parent that unlinked words changed
    if (onUnlinkedWordsChange) {
      onUnlinkedWordsChange();
    }
  };

  /**
   * Handle exporting unlinked words to JSON
   */
  const handleExport = () => {
    if (unlinkedWords.length === 0) {
      alert('No unlinked words to export.');
      return;
    }

    // Create export data with clean structure
    const exportData = unlinkedWords.map((word) => ({
      book: word.book,
      reference: word.reference,
      origWords: word.origWords,
      twLink: word.twLink,
      glQuote: word.glQuote,
      dateAdded: word.dateAdded,
    }));

    // Create and download file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `unlinked-words-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  /**
   * Handle importing unlinked words from JSON file
   */
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        const result = importUnlinkedWords(importData);

        // Refresh the display
        setUnlinkedWords(getUnlinkedWords());

        // Notify parent that unlinked words changed
        if (onUnlinkedWordsChange) {
          onUnlinkedWordsChange();
        }

        // Show result to user
        alert(`Import completed!\nAdded: ${result.added} words\nSkipped (duplicates): ${result.skipped} words\nTotal processed: ${result.total} words`);
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import file. Please ensure it is a valid JSON file with the correct format.');
      }
    };

    reader.onerror = () => {
      alert('Failed to read the uploaded file.');
    };

    reader.readAsText(file);

    // Reset the file input
    event.target.value = '';
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
        {unlinkedWords.length === 0 ? (
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
                {unlinkedWords.map((word) => (
                  <TableRow key={word.id} hover>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Re-enable linking for this word">
                        <IconButton
                          onClick={() => handleRemoveWord(word.id)}
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
                      {word.reference}
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
                      {word.twLink}
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

      <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Export Button */}
          <Button
            onClick={handleExport}
            startIcon={<DownloadIcon />}
            variant="outlined"
            disabled={unlinkedWords.length === 0}
            sx={{
              color: '#1976d2',
              borderColor: '#1976d2',
              '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' },
            }}
          >
            Export JSON
          </Button>

          {/* Import Button */}
          <input accept=".json" style={{ display: 'none' }} id="import-file-input" type="file" onChange={handleImport} />
          <label htmlFor="import-file-input">
            <Button
              component="span"
              startIcon={<UploadIcon />}
              variant="outlined"
              sx={{
                color: '#1976d2',
                borderColor: '#1976d2',
                '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' },
              }}
            >
              Import JSON
            </Button>
          </label>
        </Box>

        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UnlinkedWordsManager;
