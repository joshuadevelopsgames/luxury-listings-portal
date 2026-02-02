/**
 * Safe Date Formatting Utilities
 * 
 * Prevents "Invalid time value" errors by validating dates before formatting.
 */

import { format, parseISO, isValid } from 'date-fns';

/**
 * Safely parse a date from various input types
 * @param {any} dateValue - Can be string, Date, Firestore Timestamp, or number
 * @returns {Date|null} - Valid Date object or null if invalid
 */
export function safeParseDate(dateValue) {
  if (!dateValue) return null;
  
  try {
    let date;
    
    // Handle Firestore Timestamp
    if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    }
    // Handle ISO string
    else if (typeof dateValue === 'string') {
      // Try parseISO first for ISO strings
      date = parseISO(dateValue);
      // If invalid, try regular Date constructor
      if (!isValid(date)) {
        date = new Date(dateValue);
      }
    }
    // Handle number (timestamp)
    else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    }
    // Handle Date object
    else if (dateValue instanceof Date) {
      date = dateValue;
    }
    // Handle object with seconds (Firestore Timestamp-like)
    else if (dateValue?.seconds) {
      date = new Date(dateValue.seconds * 1000);
    }
    else {
      date = new Date(dateValue);
    }
    
    // Validate the date
    return isValid(date) ? date : null;
  } catch (error) {
    console.warn('Failed to parse date:', dateValue, error);
    return null;
  }
}

/**
 * Safely format a date with fallback
 * @param {any} dateValue - The date value to format
 * @param {string} formatString - date-fns format string
 * @param {string} fallback - Fallback string if date is invalid (default: 'N/A')
 * @returns {string} - Formatted date or fallback
 */
export function safeFormatDate(dateValue, formatString = 'MMM d, yyyy', fallback = 'N/A') {
  const date = safeParseDate(dateValue);
  
  if (!date) return fallback;
  
  try {
    return format(date, formatString);
  } catch (error) {
    console.warn('Failed to format date:', dateValue, formatString, error);
    return fallback;
  }
}

/**
 * Format date range safely
 * @param {any} startDate - Start date value
 * @param {any} endDate - End date value
 * @param {string} formatString - date-fns format string
 * @param {string} separator - Separator between dates (default: ' - ')
 * @returns {string} - Formatted date range or 'Invalid dates'
 */
export function safeFormatDateRange(startDate, endDate, formatString = 'MMM d, yyyy', separator = ' - ') {
  const start = safeFormatDate(startDate, formatString, null);
  const end = safeFormatDate(endDate, formatString, null);
  
  if (!start && !end) return 'Invalid dates';
  if (!start) return `? ${separator} ${end}`;
  if (!end) return `${start} ${separator} ?`;
  
  return `${start}${separator}${end}`;
}

/**
 * Check if a value can be parsed as a valid date
 * @param {any} dateValue - The value to check
 * @returns {boolean}
 */
export function isValidDate(dateValue) {
  return safeParseDate(dateValue) !== null;
}

export default {
  safeParseDate,
  safeFormatDate,
  safeFormatDateRange,
  isValidDate
};
