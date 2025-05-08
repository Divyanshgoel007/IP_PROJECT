/**
 * Utility for handling tokens, cookies, and related security functions
 */

/**
 * Set secure cookie in response
 * @param {Object} res - Express response object
 * @param {String} name - Cookie name
 * @param {String} value - Cookie value
 * @param {Number} maxAge - Cookie max age in milliseconds
 */
const setTokenCookie = (res, name, value, maxAge) => {
  const cookieOptions = {
    httpOnly: true, // Prevents client-side JS from reading the cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: maxAge || 24 * 60 * 60 * 1000, // Default 24 hours
    path: '/' // Available on all paths
  };

  res.cookie(name, value, cookieOptions);
};

/**
 * Create and set JWT cookies in response
 * @param {Object} res - Express response object
 * @param {Object} user - User object
 * @returns {Object} - Object with token info
 */
const createAndSetTokens = (res, user) => {
  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Calculate expiration times based on .env variables
  const accessExpires = parseTokenExpiry(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h');
  const refreshExpires = parseTokenExpiry(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d');

  // Set cookies
  setTokenCookie(res, 'accessToken', accessToken, accessExpires);
  setTokenCookie(res, 'refreshToken', refreshToken, refreshExpires);

  return {
    accessToken,
    refreshToken,
    accessExpires,
    refreshExpires
  };
};

/**
 * Clear authentication cookies
 * @param {Object} res - Express response object
 */
const clearTokenCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

/**
 * Parse token expiry string to milliseconds
 * @param {String} expiry - Expiry string (e.g. '1h', '7d')
 * @returns {Number} - Expiry in milliseconds
 */
const parseTokenExpiry = (expiry) => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 24 * 60 * 60 * 1000; // Default 24 hours
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000; // seconds to ms
    case 'm':
      return value * 60 * 1000; // minutes to ms
    case 'h':
      return value * 60 * 60 * 1000; // hours to ms
    case 'd':
      return value * 24 * 60 * 60 * 1000; // days to ms
    default:
      return 24 * 60 * 60 * 1000; // Default 24 hours
  }
};

module.exports = {
  setTokenCookie,
  createAndSetTokens,
  clearTokenCookies,
  parseTokenExpiry
}; 