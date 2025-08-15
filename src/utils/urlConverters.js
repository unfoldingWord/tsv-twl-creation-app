/**
 * URL conversion utilities for TWL links and references
 */

/**
 * Convert rc:// links to Door43 URLs
 */
export const convertRcLinkToUrl = (rcLink) => {
  if (!rcLink || !rcLink.startsWith('rc://')) {
    return null;
  }

  try {
    // Extract the path from rc://*/<path>
    const match = rcLink.match(/^rc:\/\/\*\/(.+)$/);
    if (!match) return null;

    const fullPath = match[1];
    // Get the last three parts of the path
    const pathParts = fullPath.split('/');
    if (pathParts.length < 3) return null;

    const lastThreeParts = pathParts.slice(-3).join('/');
    return `https://git.door43.org/unfoldingWord/en_tw/src/master/${lastThreeParts}.md`;
  } catch (error) {
    console.warn('Error converting rc:// link:', rcLink, error);
    return null;
  }
};

/**
 * Convert Bible reference to Translation Notes URL
 */
export const convertReferenceToTnUrl = (reference, selectedBook) => {
  if (!reference || !selectedBook) {
    return null;
  }

  try {
    const bookValue = selectedBook.value; // e.g., "gen"

    // Create the anchor for the specific verse
    const anchor = `${bookValue}-${reference.replace(':', '-')}`;

    return `https://preview.door43.org/u/unfoldingWord/en_tn?book=${bookValue}#${anchor}`;
  } catch (error) {
    console.warn('Error converting reference to TN URL:', reference, error);
    return null;
  }
};

/**
 * Convert Bible reference to ULT URL for unlinked words manager
 */
export const convertReferenceToUltUrl = (reference, bookLabel) => {
  if (!reference || !bookLabel) {
    return null;
  }

  try {
    // Extract book code from parentheses in bookLabel (e.g., "Ruth (rut)" -> "rut")
    const match = bookLabel.match(/\(([^)]+)\)$/);
    if (!match) {
      return null;
    }

    const bookId = match[1];

    // Create the anchor for the specific verse
    const anchor = `${bookId}-${reference.replace(':', '-')}`;

    return `https://preview.door43.org/u/unfoldingWord/en_ult?book=${bookId}#${anchor}`;
  } catch (error) {
    console.warn('Error converting reference to ULT URL:', reference, error);
    return null;
  }
};

/**
 * Convert TWLink to Translation Words URL for unlinked words manager
 */
export const convertTwLinkToUrl = (twLink) => {
  if (!twLink) {
    return null;
  }

  try {
    // Extract the path from rc://*/<path>
    const match = twLink.match(/^rc:\/\/\*\/(.+)$/);
    if (!match) return null;

    const fullPath = match[1];
    // Get the last three parts of the path
    const pathParts = fullPath.split('/');
    if (pathParts.length < 3) return null;

    const lastThreeParts = pathParts.slice(-3).join('/');
    return `https://git.door43.org/unfoldingWord/en_tw/src/master/${lastThreeParts}.md`;
  } catch (error) {
    console.warn('Error converting TWLink to URL:', twLink, error);
    return null;
  }
};
