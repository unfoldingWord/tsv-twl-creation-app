/**
 * Interactive table component for displaying TWL data
 */
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Tooltip } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { convertRcLinkToUrl, convertReferenceToTnUrl } from '../utils/urlConverters.js';
import { truncateContextAroundWord } from '../utils/tsvUtils.js';
import { parseDisambiguationOptions, renderDisambiguationText } from '../utils/disambiguationUtils.js';

const TWLTable = ({ tableData, selectedBook, onDeleteRow, onDisambiguationClick, onReferenceClick, showOnlySixColumns = false }) => {
  if (!tableData || !tableData.headers.length) {
    return <div>No data to display</div>;
  }

  // Determine which columns to display
  const displayHeaders = showOnlySixColumns ? tableData.headers.slice(0, 6) : tableData.headers;
  const showActions = !showOnlySixColumns; // Only show actions when not limiting columns

  return (
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
            {showActions && <TableCell sx={{ width: '50px', textAlign: 'center' }}>Action</TableCell>}
            {displayHeaders.map((header, index) => (
              <TableCell key={index}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {tableData.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex} hover>
              {/* Delete Button Column - only show when actions are enabled */}
              {showActions && (
                <TableCell sx={{ width: '50px', textAlign: 'center' }}>
                  <IconButton
                    onClick={() => onDeleteRow(rowIndex)}
                    size="small"
                    sx={{
                      color: '#d32f2f',
                      '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.04)' },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}

              {/* Display only the specified columns */}
              {(showOnlySixColumns ? row.slice(0, 6) : row).map((cell, cellIndex) => {
                const headerName = displayHeaders[cellIndex];
                const isTWLinkColumn = headerName === 'TWLink';
                const isReferenceColumn = headerName === 'Reference';
                const isContextColumn = headerName === 'Context';
                const isDisambiguationColumn = headerName === 'Disambiguation';

                // TWLink column with external links
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
                if (isDisambiguationColumn && cell && showActions) {
                  // Find the TWLink column value for this row
                  const twLinkIndex = displayHeaders.findIndex((h) => h === 'TWLink');
                  const currentTWLink = twLinkIndex !== -1 ? (showOnlySixColumns ? row.slice(0, 6) : row)[twLinkIndex] : '';

                  const parseResult = parseDisambiguationOptions(cell, currentTWLink, (newDisambiguation, newTWLink) => {
                    onDisambiguationClick(rowIndex, cellIndex, newDisambiguation, newTWLink);
                  });

                  if (parseResult.clickableOptions.length > 0) {
                    const elements = renderDisambiguationText(cell, parseResult);

                    return (
                      <TableCell key={cellIndex}>
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
                      </TableCell>
                    );
                  }
                }

                // Default cell rendering
                return <TableCell key={cellIndex}>{cell}</TableCell>;
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TWLTable;
