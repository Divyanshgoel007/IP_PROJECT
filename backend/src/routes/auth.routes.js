const express = require('express');
const router = express.Router();
const passport = require('passport');

// Import controllers
const {
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
} = require('../controllers/auth.controller');

// Import middlewares
const { protect, verifyToken } = require('../middlewares/auth.middleware');
const {
  validateRequest,
  signupValidationRules,
  loginValidationRules,
  emailVerificationRules,
  phoneVerificationRules,
  resendEmailRules,
  resendOtpRules
} = require('../middlewares/validation.middleware');
const {
  authLimiter,
  verificationLimiter
} = require('../middlewares/rateLimit.middleware');

// Auth routes
// POST /api/auth/signup - Register a new user
router.post(
  '/signup',
  authLimiter,
  signupValidationRules,
  validateRequest,
  register
);

// POST /api/auth/verify-email - Verify email address
router.post(
  '/verify-email',
  verificationLimiter,
  emailVerificationRules,
  validateRequest,
  verifyEmail
);

// GET /api/auth/verify-email - Verify email with token in query param
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No verification token provided'
      });
    }
    // Update req.body for the controller
    req.body = { token };
    // Call the controller
    await verifyEmail(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
});

// POST /api/auth/verify-phone - Verify phone number with OTP
router.post(
  '/verify-phone',
  verificationLimiter,
  phoneVerificationRules,
  validateRequest,
  verifyPhone
);

// POST /api/auth/resend-email - Resend email verification
router.post(
  '/resend-email',
  verificationLimiter,
  resendEmailRules,
  validateRequest,
  resendEmailVerification
);

// POST /api/auth/resend-otp - Resend phone OTP
router.post(
  '/resend-otp',
  verificationLimiter,
  resendOtpRules,
  validateRequest,
  resendPhoneOTP
);

// POST /api/auth/login - User login
router.post(
  '/login',
  authLimiter,
  loginValidationRules,
  validateRequest,
  login
);

// POST /api/auth/logout - User logout (requires auth)
router.post('/logout', verifyToken, logout);

// POST /api/auth/refresh-token - Refresh access token
router.post('/refresh-token', refreshToken);

// GET /api/auth/me - Get current user profile (requires auth)
router.get('/me', verifyToken, getMe);

// Social login routes
// GET /api/auth/google - Google login
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// GET /api/auth/google/callback - Google login callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  googleCallback
);

// GET /api/auth/facebook - Facebook login
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

// GET /api/auth/facebook/callback - Facebook login callback
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login', session: false }),
  facebookCallback
);

// Debug routes (only available in development)
if (process.env.NODE_ENV !== 'production') {
  // Email config verification endpoint
  router.get('/debug/email-config', async (req, res) => {
    try {
      const EmailService = require('../services/EmailService');
      const emailService = new EmailService();
      
      await emailService.verifyConfig();
      
      res.json({
        success: true,
        message: 'Email configuration is valid',
        emailMode: process.env.NODE_ENV !== 'production' ? 'development' : 'production',
        usingEthereal: !process.env.EMAIL_HOST
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Email configuration verification failed',
        error: error.message
      });
    }
  });
  
  // SMS config verification endpoint
  router.get('/debug/sms-config', async (req, res) => {
    try {
      const smsService = require('../utils/sms.util');
      const twilioClient = require('../utils/twilioClient');
      
      res.json({
        success: true,
        message: 'SMS configuration loaded',
        smsMode: process.env.USE_SMS_MOCK === 'true' ? 'mock' : 'production',
        twilioVerifySid: process.env.TWILIO_VERIFY_SID ? 'configured' : 'missing',
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'SMS configuration verification failed',
        error: error.message
      });
    }
  });
  
  // Social login config verification endpoint
  router.get('/debug/social-config', (req, res) => {
    res.json({
      success: true,
      message: 'Social login configuration',
      google: {
        configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        clientId: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'missing',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'configured' : 'missing'
      },
      facebook: {
        configured: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
        appId: process.env.FACEBOOK_APP_ID ? 'configured' : 'missing',
        appSecret: process.env.FACEBOOK_APP_SECRET ? 'configured' : 'missing'
      }
    });
  });
}

module.exports = router; 