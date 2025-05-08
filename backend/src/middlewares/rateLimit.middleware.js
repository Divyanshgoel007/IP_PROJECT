const rateLimit = require('express-rate-limit');

/**
 * Create a rate limiter to prevent abuse
 * @param {Number} windowMs - Time window in milliseconds
 * @param {Number} max - Maximum number of requests allowed in the time window
 * @param {String} message - Error message to send when limit is exceeded
 */
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || 15 * 60 * 1000, // Default: 15 minutes
    max: max || 100, // Default: limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      success: false,
      message: message || 'Too many requests, please try again later.',
    },
    skip: (req) => {
      // Skip rate limiting in development environment (optional)
      return process.env.NODE_ENV === 'development';
    },
  });
};

// General API rate limiter - applied to all routes
const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per 15 minutes
  'Too many requests. Please try again after 15 minutes.'
);

// Stricter rate limiter for auth routes
const authLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 requests per hour
  'Too many authentication attempts. Please try again after 1 hour.'
);

// Stricter rate limiter for verification routes (OTP, email verification)
const verificationLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  5, // 5 requests per hour
  'Too many verification attempts. Please try again after 1 hour.'
);

module.exports = {
  apiLimiter,
  authLimiter,
  verificationLimiter,
  createRateLimiter
}; 