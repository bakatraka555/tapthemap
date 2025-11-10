// Structured logging utility for Netlify Functions

/**
 * Log levels
 */
const LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel = process.env.LOG_LEVEL || 'INFO';
const levelValue = LEVELS[currentLevel.toUpperCase()] || LEVELS.INFO;

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 * @returns {Object} Formatted log object
 */
function formatLog(level, message, data = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
    // Add request context if available
    ...(data.requestId && { requestId: data.requestId }),
    ...(data.function && { function: data.function }),
  };
}

/**
 * Log debug message
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 */
function debug(message, data = {}) {
  if (levelValue <= LEVELS.DEBUG) {
    console.log(JSON.stringify(formatLog('DEBUG', message, data)));
  }
}

/**
 * Log info message
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 */
function info(message, data = {}) {
  if (levelValue <= LEVELS.INFO) {
    console.log(JSON.stringify(formatLog('INFO', message, data)));
  }
}

/**
 * Log warning message
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 */
function warn(message, data = {}) {
  if (levelValue <= LEVELS.WARN) {
    console.warn(JSON.stringify(formatLog('WARN', message, data)));
  }
}

/**
 * Log error message
 * @param {string} message - Log message
 * @param {Object} error - Error object
 * @param {Object} data - Additional data
 */
function error(message, error = null, data = {}) {
  if (levelValue <= LEVELS.ERROR) {
    const logData = {
      ...data,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      }),
    };
    console.error(JSON.stringify(formatLog('ERROR', message, logData)));
  }
}

/**
 * Create logger with context
 * @param {Object} context - Logger context
 * @returns {Object} Logger instance
 */
function createLogger(context = {}) {
  return {
    debug: (message, data = {}) => debug(message, { ...context, ...data }),
    info: (message, data = {}) => info(message, { ...context, ...data }),
    warn: (message, data = {}) => warn(message, { ...context, ...data }),
    error: (message, error = null, data = {}) => error(message, error, { ...context, ...data }),
  };
}

module.exports = {
  debug,
  info,
  warn,
  error,
  createLogger,
  LEVELS,
};

