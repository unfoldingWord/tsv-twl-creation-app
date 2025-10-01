/**
 * API functions for managing deleted row markers on the server
 */

import { getUserIdentifier } from '../utils/userUtils.js';

export const addDeletedRowToServer = async (book, reference, origWords, occurrence) => {
  try {
    const userIdentifier = getUserIdentifier();
    const response = await fetch('/.netlify/functions/add-deleted-row', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book, reference, origWords, occurrence, userIdentifier }),
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
    const params = new URLSearchParams({ book });
    const response = await fetch(`/.netlify/functions/get-deleted-rows?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get deleted rows');
    return data;
  } catch (error) {
    console.error('Error getting deleted rows from server:', error);
    return { items: [], count: 0 };
  }
};
