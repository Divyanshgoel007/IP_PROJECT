const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Middleware to protect routes - verifies the JWT token
 * Sets req.user if the token is valid
 */
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers or cookies
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Get token from header (Bearer token)
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    // Get token from cookie
    token = req.cookies.accessToken;
  }

  // If no token found
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by id from decoded token
    const user = await User.findById(decoded.id).select('-password');

    // If user not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found with this token'
      });
    }

    // Check if email and phone are verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before accessing this resource',
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      });
    }

    // For social login users, we don't require phone verification
    if (!user.isPhoneVerified && !user.isSocialLogin) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your phone number before accessing this resource',
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      });
    }

    // Set user in request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Not authorized',
      error: error.message
    });
  }
};

/**
 * Middleware to verify JWT token without requiring verification
 * Used for verification routes and partial access
 */
const verifyToken = async (req, res, next) => {
  let token;

  // Check if token exists in headers or cookies
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Get token from header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    // Get token from cookie
    token = req.cookies.accessToken;
  }

  // If no token found, continue without user in req
  if (!token) {
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by id
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next();
    }

    // Set user in request object
    req.user = user;
    next();
  } catch (error) {
    // Continue without user info
    next();
  }
};

/**
 * Check if user is admin
 * To be used after protect middleware
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized as an admin'
    });
  }
};

module.exports = { protect, verifyToken, admin }; 