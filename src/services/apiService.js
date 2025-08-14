/**
 * API service for external data fetching
 */

import { BibleBookData } from '../common/books.js';

/**
 * Fetch available branches from the repository
 */
export const fetchBranches = async () => {
  const response = await fetch('https://git.door43.org/api/v1/repos/unfoldingWord/en_twl/branches');

  if (!response.ok) {
    throw new Error(`Failed to fetch branches: ${response.statusText}`);
  }

  const branchData = await response.json();
  return branchData.map((branch) => branch.name).sort();
};

/**
 * Decode base64 content as UTF-8
 */
const decodeBase64Content = (base64Content) => {
  const cleanBase64 = base64Content.replace(/\s/g, ''); // Remove any whitespace
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
};

/**
 * Fetch USFM content for a specific book and branch
 */
export const fetchUSFMContent = async (bookValue) => {
  const bookData = BibleBookData[bookValue];
  const usfmFileName = bookData.usfm;

  const response = await fetch(
    `https://git.door43.org/api/v1/repos/unfoldingWord/en_ult/contents/${usfmFileName}.usfm?ref=master`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch USFM content: ${response.statusText}`);
  }

  const data = await response.json();
  return decodeBase64Content(data.content);
};

/**
 * Fetch existing TWL content for a specific book and branch
 */
export const fetchTWLContent = async (bookValue, branch = 'master') => {
  const bookCode = bookValue.toUpperCase();

  const response = await fetch(
    `https://git.door43.org/api/v1/repos/unfoldingWord/en_twl/contents/twl_${bookCode}.tsv?ref=${branch}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch TWL content: ${response.statusText}`);
  }

  const data = await response.json();
  return decodeBase64Content(data.content);
};
