/**
 * TSV (Tab-Separated Values) processing utilities
 */

/**
 * Validate if TSV content has proper structure (6 columns per row for basic format)
 */
export const isValidTsvStructure = (content) => {
  if (!content || typeof content !== 'string') return false;

  const lines = content
    .trim()
    .split('\n')
    .filter((line) => line.trim());

  if (lines.length === 0) return false;

  // Check that all lines have exactly 6 columns (basic TWL format)
  for (let i = 0; i < lines.length; i++) {
    const columns = lines[i].split('\t');
    if (columns.length !== 6) {
      return false;
    }
  }

  return true;
};

/**
 * Validate if TSV content has the correct headers for 8-9 column or 10-11 column format
 */
export const isValidExtendedTsvStructure = (content) => {
  if (!content || typeof content !== 'string') return false;

  const lines = content
    .trim()
    .split('\n')
    .filter((line) => line.trim());

  if (lines.length === 0) return false;

  const headers = lines[0].split('\t');
  const columnCount = headers.length;

  // Expected headers for 8-9 columns (old format with GLQuote/GLOccurrence)
  const expected8Headers = ['Reference', 'ID', 'Tags', 'OrigWords', 'Occurrence', 'TWLink', 'GLQuote', 'GLOccurrence'];
  const expected9Headers = [...expected8Headers, 'Merge Status'];

  // Expected headers for 10-11 columns (new format with Disambiguation and Context)
  const expected10Headers = ['Reference', 'ID', 'Tags', 'OrigWords', 'Occurrence', 'TWLink', 'GLQuote', 'GLOccurrence', 'Disambiguation', 'Context'];
  const expected11Headers = [...expected10Headers, 'Merge Status'];

  // Check if headers match expected format
  let expectedHeaders = [];
  let allowMissingLastColumn = false;

  if (columnCount === 8) {
    expectedHeaders = expected8Headers;
  } else if (columnCount === 9) {
    expectedHeaders = expected9Headers;
  } else if (columnCount === 10) {
    expectedHeaders = expected10Headers;
  } else if (columnCount === 11) {
    expectedHeaders = expected11Headers;
    // For 11-column format, allow data rows to have 10 or 11 columns
    // (some may be missing the "Merge Status" column)
    allowMissingLastColumn = true;
  } else {
    return false;
  }

  // Validate headers
  const headersMatch = headers.every((header, index) => header === expectedHeaders[index]);
  if (!headersMatch) {
    return false;
  }

  // Validate that all data rows have consistent column count
  for (let i = 1; i < lines.length; i++) {
    const rowColumns = lines[i].split('\t');
    if (allowMissingLastColumn) {
      // For 11-column header format, allow rows to have 10 or 11 columns
      if (rowColumns.length !== 10 && rowColumns.length !== 11) {
        return false;
      }
    } else {
      // For other formats, require exact column count
      if (rowColumns.length !== columnCount) {
        return false;
      }
    }
  }

  return true;
};/**
 * Check if TSV content is in extended format (8-11 columns) and should be loaded directly
 */
export const isExtendedTsvFormat = (content) => {
  if (!content || typeof content !== 'string') return false;

  const lines = content
    .trim()
    .split('\n')
    .filter((line) => line.trim());

  if (lines.length === 0) return false;

  const firstLineColumns = lines[0].split('\t');
  return [8, 9, 10, 11].includes(firstLineColumns.length) && isValidExtendedTsvStructure(content);
};

/**
 * Normalize TSV content to ensure all rows have the same number of columns as the header
 */
export const normalizeTsvColumnCount = (content) => {
  if (!content || typeof content !== 'string') return content;

  const lines = content
    .trim()
    .split('\n')
    .filter((line) => line.trim());

  if (lines.length === 0) return content;

  // Get expected column count from header
  const headerColumns = lines[0].split('\t');
  const expectedColumnCount = headerColumns.length;

  // Normalize each line to have the expected column count
  const normalizedLines = lines.map((line, index) => {
    const columns = line.split('\t');

    if (columns.length === expectedColumnCount) {
      return line; // Already correct
    } else if (columns.length < expectedColumnCount) {
      // Add empty columns to reach expected count
      const missingCount = expectedColumnCount - columns.length;
      const paddedColumns = [...columns, ...new Array(missingCount).fill('')];
      return paddedColumns.join('\t');
    } else {
      // Too many columns, truncate to expected count
      return columns.slice(0, expectedColumnCount).join('\t');
    }
  });

  return normalizedLines.join('\n');
};

/**
 * Parse TSV content into structured data
 */
export const parseTsv = (content, hasHeader = true) => {
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

/**
 * Check if existing TWL content has header row
 */
export const hasHeader = (content) => {
  const lines = content
    .trim()
    .split('\n')
    .filter((line) => line.trim());

  if (lines.length === 0) return false;

  const firstLine = lines[0].split('\t');
  return firstLine.length >= 3 &&
    firstLine[0] === 'Reference' &&
    firstLine[1] === 'ID' &&
    firstLine[2] === 'Tags';
};

/**
 * Compare two Bible references numerically (e.g., "1:2" vs "1:10")
 */
export const compareReferences = (ref1, ref2) => {
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

/**
 * Process TSV content to show only first 6 columns or all columns
 */
export const processTsvContent = (content, showOnlySixColumns) => {
  if (!content) return '';

  if (!showOnlySixColumns) return content;

  const lines = content.split('\n');
  return lines
    .map((line) => {
      const columns = line.split('\t');
      return columns.slice(0, 6).join('\t');
    })
    .join('\n');
};

/**
 * Truncate context text for display with ellipsis
 */
export const truncateContextBeginning = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;

  // Find last complete word within limit
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }

  return truncated + '...';
};

// Helper function to truncate Context column content around [...] markers
export const truncateContextAroundWord = (contextText) => {
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

  return parts.join(' ').replace(/] ([\.\?:,’”])/g, ']$1');
};

/**
 * Ensure all IDs in the ID column are unique and properly formatted
 * ID format: 4 character hex starting with [a-z], remaining 3 chars [a-z0-9]
 */
export const ensureUniqueIds = (tsvContent) => {
  if (!tsvContent || typeof tsvContent !== 'string') {
    console.error('ensureUniqueIds received invalid input:', typeof tsvContent, tsvContent);
    return '';
  }

  const lines = tsvContent.split('\n');
  if (lines.length === 0) return tsvContent;

  // Parse header row to find ID column index
  const headers = lines[0].split('\t');
  const idIndex = headers.findIndex((h) => h === 'ID');

  if (idIndex === -1) {
    console.warn('Could not find ID column for unique ID validation');
    return tsvContent;
  }

  const usedIds = new Set();

  /**
   * Generate a new unique ID following the format rules
   */
  const generateUniqueId = () => {
    const firstChar = 'abcdefghijklmnopqrstuvwxyz';
    const otherChars = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let newId;
    do {
      // First character from [a-z]
      const first = firstChar[Math.floor(Math.random() * firstChar.length)];
      // Next 3 characters from [a-z0-9]
      const remaining = Array.from({ length: 3 }, () => otherChars[Math.floor(Math.random() * otherChars.length)]).join('');

      newId = first + remaining;
    } while (usedIds.has(newId));

    return newId;
  };

  /**
   * Validate if ID follows the correct format
   */
  const isValidIdFormat = (id) => {
    if (!id || id.length !== 4) return false;

    // First character must be [a-z]
    if (!/^[a-z]/.test(id[0])) return false;

    // Remaining 3 characters must be [a-z0-9]
    if (!/^[a-z0-9]{3}$/.test(id.slice(1))) return false;

    return true;
  };

  // Process each row
  const newLines = lines.map((line, index) => {
    if (index === 0) {
      return line; // Keep header unchanged
    }

    const columns = line.split('\t');
    if (columns.length <= idIndex) {
      return line; // Not enough columns, return as-is
    }

    const currentId = columns[idIndex];

    // Check if ID needs to be changed (duplicate or invalid format)
    if (!isValidIdFormat(currentId) || usedIds.has(currentId)) {
      const newId = generateUniqueId();
      usedIds.add(newId);
      columns[idIndex] = newId;
      console.log(`Changed ID from "${currentId}" to "${newId}" in row ${index}`);
    } else {
      usedIds.add(currentId);
    }

    return columns.join('\t');
  });

  return newLines.join('\n');
};

/**
 * Add GLQuote and GLOccurrence columns to TWL content
 * GLQuote is copied from OrigWords, GLOccurrence is copied from Occurrence
 */
export const addGLQuoteColumns = (tsvContent) => {
  if (!tsvContent || typeof tsvContent !== 'string') {
    console.error('addGLQuoteColumns received invalid input:', typeof tsvContent, tsvContent);
    return '';
  }

  const lines = tsvContent.split('\n');
  if (lines.length === 0) return tsvContent;

  // Parse header row to find column indices
  const headers = lines[0].split('\t');
  const origWordsIndex = headers.findIndex((h) => h === 'OrigWords');
  const occurrenceIndex = headers.findIndex((h) => h === 'Occurrence');
  const twLinkIndex = headers.findIndex((h) => h === 'TWLink');

  if (origWordsIndex === -1 || occurrenceIndex === -1 || twLinkIndex === -1) {
    console.warn('Could not find required columns for GLQuote processing');
    return tsvContent;
  }

  // Create new headers with GLQuote and GLOccurrence inserted after TWLink
  const newHeaders = [...headers];
  newHeaders.splice(twLinkIndex + 1, 0, 'GLQuote', 'GLOccurrence');

  // Process each row
  const newLines = lines.map((line, index) => {
    if (index === 0) {
      return newHeaders.join('\t');
    }

    const columns = line.split('\t');
    if (columns.length <= Math.max(origWordsIndex, occurrenceIndex, twLinkIndex)) {
      return line; // Not enough columns, return as-is
    }

    // Insert GLQuote and GLOccurrence values after TWLink
    const newColumns = [...columns];
    const glQuoteValue = columns[origWordsIndex] || '';
    const glOccurrenceValue = columns[occurrenceIndex] || '';

    newColumns.splice(twLinkIndex + 1, 0, glQuoteValue, glOccurrenceValue);
    return newColumns.join('\t');
  });

  return newLines.join('\n');
};