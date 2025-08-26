// src/utils/dateUtils.js

/**
 * Calculates the number of days from today until a given date string.
 * @param {string} dateStr - The target date in 'YYYY-MM-DD' format.
 * @returns {number} The difference in days. Negative if the date is in the past.
 */
export const daysUntil = (dateStr) => {
  if (!dateStr) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date to midnight

  const expiryDate = new Date(dateStr + "T00:00:00Z"); // Treat expiry as UTC midnight
  
  const diffTime = expiryDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Determines the status of a document based on its expiry date.
 * @param {string} dateStr - The expiry date in 'YYYY-MM-DD' format.
 * @returns {{text: string}} An object with the status text.
 */
export const getDocumentStatus = (dateStr) => {
  const days = daysUntil(dateStr);

  if (days < 0) {
    return { text: 'Expired' };
  }
  if (days <= 30) {
    return { text: 'Expiring Soon' };
  }
  return { text: 'Active' };
};