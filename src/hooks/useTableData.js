/**
 * Custom hook for managing table data - now returns parsed data without independent state
 * The actual editing is handled in the main App component to ensure data consistency
 */
import { useMemo } from 'react';

export const useTableData = (tsvContent) => {
  // Parse TSV content into table format for display
  const tableData = useMemo(() => {
    if (!tsvContent) return { headers: [], rows: [] };

    const lines = tsvContent.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = lines[0].split('\t');
    const rows = lines.slice(1).map((line) => line.split('\t'));

    return { headers, rows };
  }, [tsvContent]);

  return {
    tableData,
  };
};
