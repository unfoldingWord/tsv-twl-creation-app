/**
 * API functions for managing deleted row markers on the server
 */

import { getUserIdentifier } from '../utils/userUtils.js';

export const addDeletedRowToServer = async (book, reference, origWords, occurrence, glQuote = '', glOccurrence = '') => {
  try {
    const userIdentifier = getUserIdentifier();
    const response = await fetch('/.netlify/functions/add-deleted-row', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book, reference, origWords, occurrence, glQuote, glOccurrence, userIdentifier }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add deleted row');
    return data;
  } catch (error) {
    console.error('Error adding deleted row to server:', error);
    throw error;
  }
};

export const removeDeletedRowFromServer = async (book, reference, origWords, occurrence) => {
  try {
    const userIdentifier = getUserIdentifier();
    const response = await fetch('/.netlify/functions/remove-deleted-row', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book, reference, origWords, occurrence, userIdentifier }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to remove deleted row');
    return data;
  } catch (error) {
    console.error('Error removing deleted row from server:', error);
    throw error;
  }
};

export const getDeletedRowsFromServer = async (book) => {
  try {
    console.log('🗑️  [CLIENT] Requesting deleted rows for book:', book);
    const params = new URLSearchParams({ book });
    const response = await fetch(`/.netlify/functions/get-deleted-rows?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get deleted rows');
    console.log('🗑️  [CLIENT] Received deleted rows:', data.count, 'items');
    if (data.items && data.items.length > 0) {
      console.log('🗑️  [CLIENT] Sample deleted row:', data.items[0]);
      // Filter to show only 1:3 references for debugging
      const filtered1_3 = data.items.filter(it => it.reference && it.reference.startsWith('1:3'));
      if (filtered1_3.length > 0) {
        console.log('🗑️  [CLIENT] Items for 1:3:', filtered1_3.map(it => `${it.reference}|${it.normalizedOrigWords}|${it.occurrence}`));
      } else {
        console.log('🗑️  [CLIENT] No items found with reference starting with 1:3');
      }
    }
    return data;
  } catch (error) {
    console.error('Error getting deleted rows from server:', error);
    return { items: [], count: 0 };
  }
};
