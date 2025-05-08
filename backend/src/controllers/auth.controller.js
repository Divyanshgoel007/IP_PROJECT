const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const EmailService = require('../services/EmailService');
const emailService = new EmailService();
const smsService = require('../utils/sms.util');
const tokenUtil = require('../utils/token.util');

/**
 * Register a new user
 * @route POST /api/auth/signup
 * @access Public
 */
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // Check if email or phone already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already registered'
      });
    }

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();

    // Save user with verification token
    await user.save();

    // Send email verification
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await emailService.sendVerificationEmail({
      email: user.email,
      name: user.firstName,
      url: verificationUrl,
      requestId: req.id
    });

    // Send SMS verification code via Twilio Verify
    await smsService.sendOTP({
      to: user.phone
    });

    // Create tokens (but don't set cookies until verification)
    const accessToken = user.generateAccessToken();

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email and phone number.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      },
      token: accessToken
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Verify email address
 * @route POST /api/auth/verify-email
 * @access Public
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    // Hash the token from params
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with the token and check if token is still valid
    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Set email as verified and remove verification fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    // Send welcome email
    await emailService.sendWelcomeEmail({
      email: user.email,
      name: user.firstName,
      requestId: req.id
    });

    // Return success response
    res.json({
      success: true,
      message: 'Email verified successfully!',
      isEmailVerified: true,
      isPhoneVerified: user.isPhoneVerified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
};

/**
 * Verify phone number with OTP
 * @route POST /api/auth/verify-phone
 * @access Public
 */
const verifyPhone = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Find user by phone
    const user = await User.findOne({ phone });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this phone number'
      });
    }
    
    // If already verified
    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already verified'
      });
    }

    // Verify OTP using Twilio Verify
    const verificationResult = await smsService.verifyOTP({
      to: phone,
      code: otp
    });

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Set phone as verified
    user.isPhoneVerified = true;
    user.phoneOtp = undefined;
    user.phoneOtpExpires = undefined;

    await user.save();

    // Send success SMS
    await smsService.sendVerificationSuccess({
      to: user.phone
    });

    // If both email and phone are verified, create and set tokens
    if (user.isEmailVerified && user.isPhoneVerified) {
      const tokens = tokenUtil.createAndSetTokens(res, user);

      return res.json({
        success: true,
        message: 'Phone verified successfully! Your account is now fully activated.',
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: true,
        tokens: {
          accessToken: tokens.accessToken,
          expiresIn: tokens.accessExpires
        }
      });
    }

    // Return success response (email not verified yet)
    res.json({
      success: true,
      message: 'Phone verified successfully! Please verify your email to activate your account.',
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Phone verification failed',
      error: error.message
    });
  }
};

/**
 * Resend email verification
 * @route POST /api/auth/resend-email
 * @access Public
 */
const resendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    // If already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await emailService.sendVerificationEmail({
      email: user.email,
      name: user.firstName,
      url: verificationUrl,
      requestId: req.id
    });

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
      error: error.message
    });
  }
};

/**
 * Resend phone OTP
 * @route POST /api/auth/resend-otp
 * @access Public
 */
const resendPhoneOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    // Find user by phone
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this phone number'
      });
    }

    // If already verified
    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already verified'
      });
    }

    // Send new OTP via Twilio Verify
    const otpResult = await smsService.sendOTP({
      to: user.phone
    });

    if (!otpResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code'
      });
    }

    // Return success response
    res.json({
      success: true,
      message: 'Verification code sent successfully!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code',
      error: error.message
    });
  }
};

/**
 * User login
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email (include password field)
    const user = await User.findOne({ email }).select('+password');

    // If user doesn't exist or password is incorrect
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // If email and phone are not verified
    if (!user.isEmailVerified || !user.isPhoneVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email and phone before logging in',
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        userId: user._id
      });
    }

    // Update last login time
    user.lastLogin = Date.now();
    await user.save();

    // Create and set tokens in cookies
    const tokens = tokenUtil.createAndSetTokens(res, user);

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.accessExpires
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * User logout
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = (req, res) => {
  try {
    // Clear auth cookies
    tokenUtil.clearTokenCookies(res);

    // Clear refresh token in DB if user is available
    if (req.user) {
      req.user.refreshToken = undefined;
      req.user.save();
    }

    // Return success response
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
const refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookies
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Find user by ID and check refreshToken in DB
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = tokenUtil.createAndSetTokens(res, user);

    // Return success response
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.accessExpires
      }
    });
  } catch (error) {
    // Clear cookies on error
    tokenUtil.clearTokenCookies(res);

    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/me
 * @access Private
 */
const getMe = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
      error: error.message
    });
  }
};

/**
 * Handle Google OAuth callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const googleCallback = (req, res) => {
  try {
    // User is set by passport middleware
    const user = req.user;
    
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=Authentication failed`);
    }

    // Create tokens
    const tokens = tokenUtil.createAndSetTokens(res, user);

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/social-auth-success?token=${tokens.accessToken}`);
  } catch (error) {
    console.error('Google auth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=Server error during authentication`);
  }
};

/**
 * Handle Facebook OAuth callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const facebookCallback = (req, res) => {
  try {
    // User is set by passport middleware
    const user = req.user;
    
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=Authentication failed`);
    }

    // Create tokens
    const tokens = tokenUtil.createAndSetTokens(res, user);

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/social-auth-success?token=${tokens.accessToken}`);
  } catch (error) {
    console.error('Facebook auth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=Server error during authentication`);
  }
};

module.exports = {
  register,
  verifyEmail,
  verifyPhone,
  resendEmailVerification,
  resendPhoneOTP,
  login,
  logout,
  refreshToken,
  getMe,
  googleCallback,
  facebookCallback
}; 