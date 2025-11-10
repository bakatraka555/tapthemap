// Retry utility for async operations

/**
 * Retry an async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in milliseconds (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 10000)
 * @param {number} options.multiplier - Delay multiplier (default: 2)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried
 * @param {Function} options.onRetry - Callback function called on each retry
 * @returns {Promise} Promise that resolves with function result
 */
async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    multiplier = 2,
    shouldRetry = (error) => {
      // Retry on network errors and 5xx errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') return true;
      if (error.statusCode >= 500 && error.statusCode < 600) return true;
      return false;
    },
    onRetry = null,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(error, attempt + 1, delay);
      }

      // Wait before retrying
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * multiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with fixed delay
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.delay - Fixed delay in milliseconds
 * @returns {Promise} Promise that resolves with function result
 */
async function retryWithFixedDelay(fn, options = {}) {
  const { maxRetries = 3, delay = 1000 } = options;
  return retry(fn, {
    ...options,
    initialDelay: delay,
    multiplier: 1, // No exponential backoff
  });
}

module.exports = {
  retry,
  retryWithFixedDelay,
  sleep,
};

