/**
 * API service for external data fetching
 */

import { BibleBookData } from '../common/books.js';

/**
 * Fetch available branches from the repository
 */
export const fetchBranches = async (dcsHost = "https://git.door43.org") => {
  const response = await fetch(`${dcsHost}/api/v1/repos/unfoldingWord/en_twl/branches`);

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

// Simple in-memory cache for USFM content
const usfmCache = new Map();
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

/**
 * Clear the USFM cache (useful for development or when forcing fresh data)
 */
export const clearUSFMCache = () => {
  usfmCache.clear();
  console.log('USFM cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  const stats = {
    size: usfmCache.size,
    entries: Array.from(usfmCache.keys()),
  };
  console.log('USFM Cache Stats:', stats);
  return stats;
};

/**
 * Fetch USFM content for a specific book, translation, and branch
 */
export const fetchUSFMContent = async (bookValue, translation = 'ult', dcsHost = 'git.door43.org', dcsToken) => {
  const bookData = BibleBookData[bookValue];
  if (!bookData) {
    throw new Error(`Book data not found for: ${bookValue}`);
  }

  const usfmFileName = bookData.usfm;
  const cacheKey = `${dcsHost}-${bookValue}-${translation}`;

  // Check cache first
  const cached = usfmCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`Using cached USFM content for ${translation} ${bookValue}`);
    return cached.content;
  }

  const headers = {};
  if (dcsToken) {
    headers['Authorization'] = `token ${dcsToken}`;
  }

  // Determine repository based on translation
  let repo;
  if (translation === 'ult') {
    repo = 'en_ult';
  } else if (translation === 'ust') {
    repo = 'en_ust';
  } else if (translation === 'original') {
    // For original languages, use appropriate repo based on testament
    repo = bookData.testament === 'new' ? 'el-x-koine_ugnt' : 'hbo_uhb';
  } else {
    repo = `en_${translation}`;
  }

  console.log(`Fetching USFM content for ${translation} ${bookValue} from server`);
  const response = await fetch(
    `https://${dcsHost}/api/v1/repos/unfoldingWord/${repo}/contents/${usfmFileName}.usfm?ref=master`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${translation} USFM content for ${bookValue}: ${response.statusText}`);
  }

  const data = await response.json();
  const content = decodeBase64Content(data.content);

  // Cache the result
  usfmCache.set(cacheKey, {
    content,
    timestamp: Date.now()
  });

  return content;
};

/**
 * Fetch existing TWL content for a specific book and branch
 */
export const fetchTWLContent = async (bookValue, branch = 'master', dcsHost = 'git.door43.org') => {
  const bookCode = bookValue.toUpperCase();

  const response = await fetch(
    `https://${dcsHost}/api/v1/repos/unfoldingWord/en_twl/contents/twl_${bookCode}.tsv?ref=${branch}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch TWL content: ${response.statusText}`);
  }

  const data = await response.json();
  return decodeBase64Content(data.content);
};
