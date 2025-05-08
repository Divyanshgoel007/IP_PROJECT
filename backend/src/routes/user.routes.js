const express = require('express');
const router = express.Router();

// Import controllers
const {
  getCurrentUser,
  updateProfile,
  changePassword,
  deleteAccount
} = require('../controllers/user.controller');

// Import middlewares
const { protect } = require('../middlewares/auth.middleware');
const { validateRequest } = require('../middlewares/validation.middleware');
const { body } = require('express-validator');
const { apiLimiter } = require('../middlewares/rateLimit.middleware');

// Profile validation rules
const profileUpdateRules = [
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

// Password change validation rules
const passwordChangeRules = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
    .withMessage('New password must include at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// All routes below this line require authentication
router.use(protect);

// GET /api/users/me - Get current user profile
router.get('/me', apiLimiter, getCurrentUser);

// PUT /api/users/me - Update user profile
router.put(
  '/me',
  apiLimiter,
  profileUpdateRules,
  validateRequest,
  updateProfile
);

// PUT /api/users/change-password - Change password
router.put(
  '/change-password',
  apiLimiter,
  passwordChangeRules,
  validateRequest,
  changePassword
);

// DELETE /api/users/me - Delete user account
router.delete('/me', apiLimiter, deleteAccount);

module.exports = router; 