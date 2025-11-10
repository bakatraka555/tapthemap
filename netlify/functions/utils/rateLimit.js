// Rate limiting utility for Netlify Functions
// Uses in-memory store (resets on cold start, fine for serverless)

const store = new Map();

/**
 * Rate limiter - checks if request should be allowed
 * @param {string} key - Unique identifier (IP, user ID, etc.)
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} { allowed: boolean, remaining: number, resetAt: number }
 */
function rateLimit(key, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    // New window or expired
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count++;
  store.set(key, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Get client IP from Netlify event
 * @param {Object} event - Netlify event
 * @returns {string} IP address
 */
function getClientIP(event) {
  return (
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    'unknown'
  );
}

/**
 * Rate limit middleware for Netlify Functions
 * @param {Object} options - Rate limit options
 * @param {number} options.maxRequests - Max requests per window
 * @param {number} options.windowMs - Window size in milliseconds
 * @param {Function} options.getKey - Function to get rate limit key (default: IP)
 * @returns {Function} Middleware function
 */
function createRateLimiter(options = {}) {
  const {
    maxRequests = 100,
    windowMs = 60000, // 1 minute
    getKey = (event) => getClientIP(event),
  } = options;

  return (event) => {
    const key = getKey(event);
    const result = rateLimit(key, maxRequests, windowMs);

    if (!result.allowed) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
          'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        },
        body: JSON.stringify({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again after ${new Date(result.resetAt).toISOString()}`,
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
      };
    }

    return null; // No rate limit violation
  };
}

// Cleanup old entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

module.exports = {
  rateLimit,
  getClientIP,
  createRateLimiter,
};

