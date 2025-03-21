/**
 * Logger utility for Fireshare
 * 
 * Centralized logging utility that can be disabled in production.
 * Usage:
 *   import { logger } from '../common/logger';
 *   logger.debug('Component mounted', data);
 */

// Is logging enabled? Default to true in development, false in production
// To disable ALL logs (including in development), set this to false
const isLoggingEnabled = process.env.NODE_ENV === 'development'; // Enable in development by default

// Check if window has a special flag to force enable/disable logging
// This allows toggling logging from browser console:
// window.FIRESHARE_ENABLE_LOGGING = true/false;
const checkLoggingFlag = () => {
  if (typeof window !== 'undefined') {
    return window.FIRESHARE_ENABLE_LOGGING;
  }
  return undefined;
};

// Log levels
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace'
};

/**
 * Get the timestamp for the log entry
 * @returns {string} Formatted timestamp
 */
const getTimestamp = () => {
  const now = new Date();
  return `${now.toISOString().slice(11, 23)}`;
};

/**
 * Format a log message with contextual information
 * @param {string} level - Log level
 * @param {string} context - Log context (usually component name)
 * @param {string} message - Main log message
 * @returns {string} Formatted log message
 */
const formatLogMessage = (level, context, message) => {
  const timestamp = getTimestamp();
  return `[${timestamp}][${level.toUpperCase()}][${context}] ${message}`;
};

/**
 * The main logger object with methods for different log levels
 */
export const logger = {
  /**
   * Log an error message
   * @param {string} context - Log context (usually component name)
   * @param {string} message - Log message
   * @param {any} [data] - Optional data to log
   */
  error: (context, message, data) => {
    console.error(formatLogMessage(LOG_LEVELS.ERROR, context, message), data !== undefined ? data : '');
  },

  /**
   * Log a warning message
   * @param {string} context - Log context (usually component name)
   * @param {string} message - Log message
   * @param {any} [data] - Optional data to log
   */
  warn: (context, message, data) => {
    if (checkLoggingFlag() !== false) {
      console.warn(formatLogMessage(LOG_LEVELS.WARN, context, message), data !== undefined ? data : '');
    }
  },

  /**
   * Log an informational message
   * @param {string} context - Log context (usually component name)
   * @param {string} message - Log message
   * @param {any} [data] - Optional data to log
   */
  info: (context, message, data) => {
    // Info logs are shown in both dev and prod, but can be turned off
    if (checkLoggingFlag() !== false) {
      console.info(formatLogMessage(LOG_LEVELS.INFO, context, message), data !== undefined ? data : '');
    }
  },

  /**
   * Log a debug message (only in development)
   * @param {string} context - Log context (usually component name)
   * @param {string} message - Log message
   * @param {any} [data] - Optional data to log
   */
  debug: (context, message, data) => {
    // Check explicit override first
    const flag = checkLoggingFlag();
    if (flag === true || (flag !== false && isLoggingEnabled)) {
      console.log(formatLogMessage(LOG_LEVELS.DEBUG, context, message), data !== undefined ? data : '');
    }
  },

  /**
   * Log a trace message (very detailed, only in development with flag)
   * @param {string} context - Log context (usually component name)
   * @param {string} message - Log message
   * @param {any} [data] - Optional data to log
   */
  trace: (context, message, data) => {
    // Only log if explicitly enabled with the window flag
    if (checkLoggingFlag() === true) {
      console.debug(formatLogMessage(LOG_LEVELS.TRACE, context, message), data !== undefined ? data : '');
    }
  },

  /**
   * Log a group of messages (useful for detailed debugging)
   * @param {string} context - Log context (usually component name)
   * @param {string} label - Group label
   * @param {Function} callback - Callback function with log statements
   */
  group: (context, label, callback) => {
    // Check explicit override first
    const flag = checkLoggingFlag();
    if (flag === true || (flag !== false && isLoggingEnabled)) {
      const groupLabel = formatLogMessage(LOG_LEVELS.DEBUG, context, label);
      console.group(groupLabel);
      callback();
      console.groupEnd();
    }
  }
};

// Export log levels for reference
export const LOG_LEVEL = LOG_LEVELS;