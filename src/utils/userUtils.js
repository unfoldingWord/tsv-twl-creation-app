/**
 * User-related utility functions
 */

/**
 * Get or create a persistent user identifier for tracking user actions
 * @returns {string} User identifier
 */
export const getUserIdentifier = () => {
  let userId = localStorage.getItem('twl-user-id');
  if (!userId) {
    userId = 'user-' + Date.now();
    localStorage.setItem('twl-user-id', userId);
  }
  return userId;
};

/**
 * Generate a unique ID for records/entries
 * @returns {string} Unique identifier
 */
export const generateUniqueId = () => {
  return Date.now() + Math.random().toString(36).substr(2, 9);
};

/**
 * Get current timestamp in ISO string format
 * @returns {string} ISO timestamp string
 */
export const getCurrentTimestamp = () => {
  return new Date().toISOString();
};
