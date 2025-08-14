/**
 * TSV (Tab-Separated Values) processing utilities
 */

/**
 * Validate if TSV content has proper structure (6 columns per row)
 */
export const isValidTsvStructure = (content) => {
  if (!content || typeof content !== 'string') return false;

  const lines = content
    .trim()
    .split('\n')
    .filter((line) => line.trim());

  if (lines.length === 0) return false;

  // Check each line has exactly 6 columns
  for (let i = 0; i < lines.length; i++) {
    const columns = lines[i].split('\t');
    if (columns.length !== 6) {
      return false;
    }
  }

  return true;
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
export const truncateContext = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;

  // Find last complete word within limit
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }

  return truncated + '...';
};
