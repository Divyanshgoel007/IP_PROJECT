const User = require('../models/user.model');
const smsService = require('../utils/sms.util');

/**
 * Get current user profile
 * @route GET /api/users/me
 * @access Private
 */
const getCurrentUser = async (req, res) => {
  try {
    // User is already available in req.user from the auth middleware
    res.json({
      success: true,
      user: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        isEmailVerified: req.user.isEmailVerified,
        isPhoneVerified: req.user.isPhoneVerified,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/users/me
 * @access Private
 */
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    // If trying to update phone, check if it's already in use
    if (phone && phone !== req.user.phone) {
      const phoneExists = await User.findOne({ phone, _id: { $ne: req.user._id } });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is already in use'
        });
      }
      
      // If changing phone, set isPhoneVerified to false
      req.user.isPhoneVerified = false;
      
      // Generate new OTP for verification
      const phoneOtp = req.user.generatePhoneOTP();
      
      // Send OTP via SMS
      await smsService.sendOTP({
        to: phone,
        otp: phoneOtp
      });
    }
    
    // Update fields if provided
    if (firstName) req.user.firstName = firstName;
    if (lastName) req.user.lastName = lastName;
    if (phone) req.user.phone = phone;
    
    // Save updated user
    await req.user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone,
        isPhoneVerified: req.user.isPhoneVerified
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

/**
 * Change password
 * @route PUT /api/users/change-password
 * @access Private
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Check if current password is correct
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

/**
 * Delete user account
 * @route DELETE /api/users/me
 * @access Private
 */
const deleteAccount = async (req, res) => {
  try {
    // Delete user
    await User.findByIdAndDelete(req.user._id);
    
    // Clear authentication cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error.message
    });
  }
};

module.exports = {
  getCurrentUser,
  updateProfile,
  changePassword,
  deleteAccount
}; 