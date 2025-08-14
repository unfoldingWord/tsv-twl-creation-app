/**
 * Storage utilities for managing persistent data
 * Supports both localStorage and cookies as fallback
 */

/**
 * Set a cookie with expiration
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Expiration in days (default: 365)
 */
export const setCookie = (name, value, days = 365) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

/**
 * Get a cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 */
export const getCookie = (name) => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

/**
 * Set value in localStorage with error handling
 * @param {string} key - Storage key
 * @param {string} value - Storage value
 */
export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

/**
 * Get value from localStorage with error handling
 * @param {string} key - Storage key
 * @returns {string|null} Stored value or null if not found/error
 */
export const getLocalStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Failed to read from localStorage:', error);
    return null;
  }
};

/**
 * Save data with dual storage strategy (localStorage + cookies)
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified if object)
 */
export const saveData = (key, value) => {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  setLocalStorage(key, stringValue);
  setCookie(key, stringValue);
};

/**
 * Load data with dual storage fallback (localStorage first, then cookies)
 * @param {string} key - Storage key
 * @param {boolean} parseJson - Whether to parse as JSON (default: false)
 * @returns {any} Stored value or null if not found
 */
export const loadData = (key, parseJson = false) => {
  const value = getLocalStorage(key) || getCookie(key);
  if (!value) return null;

  if (parseJson) {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn(`Failed to parse stored data for key ${key}:`, error);
      return null;
    }
  }

  return value;
};
