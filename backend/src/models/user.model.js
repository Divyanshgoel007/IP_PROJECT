const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    phone: {
      type: String,
      trim: true,
      sparse: true // Allow empty for social login
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false // Don't include password in query results by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    phoneOtp: String,
    phoneOtpExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    refreshTokens: [String], // Store active refresh tokens 
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date,
    // Social login fields
    google: {
      id: String,
      email: String,
      name: String
    },
    facebook: {
      id: String,
      email: String,
      name: String
    }
  },
  {
    timestamps: true
  }
);

// Virtual for fullName
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual to check if user registered via social login
userSchema.virtual('isSocialLogin').get(function() {
  return !!(this.google?.id || this.facebook?.id);
});

// Pre-save middleware: Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified or new
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT_ROUNDS) || 10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate access token (short-lived)
userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m'
    }
  );
};

// Method to generate refresh token (long-lived)
userSchema.methods.generateRefreshToken = function() {
  const refreshToken = jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d'
    }
  );
  
  // Store refresh token in user document for later invalidation
  if (!this.refreshTokens) {
    this.refreshTokens = [];
  }
  
  // Limit number of stored refresh tokens (e.g., from different devices)
  const MAX_REFRESH_TOKENS = 5;
  if (this.refreshTokens.length >= MAX_REFRESH_TOKENS) {
    this.refreshTokens.shift(); // Remove oldest token
  }
  
  this.refreshTokens.push(refreshToken);
  
  return refreshToken;
};

// Method to invalidate a refresh token
userSchema.methods.invalidateRefreshToken = function(tokenToInvalidate) {
  if (!this.refreshTokens) return false;
  
  const tokenIndex = this.refreshTokens.indexOf(tokenToInvalidate);
  if (tokenIndex !== -1) {
    this.refreshTokens.splice(tokenIndex, 1);
    return true;
  }
  
  return false; // Token not found
};

// Method to invalidate all refresh tokens (logout from all devices)
userSchema.methods.invalidateAllRefreshTokens = function() {
  this.refreshTokens = [];
  return true;
};

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  // Create a random token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Hash and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  // Set token expiry (24 hours by default)
  const expiryTime = process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES || '24h';
  this.emailVerificationExpires = getExpiryTime(expiryTime);
  
  return verificationToken;
};

// Method to generate phone OTP
userSchema.methods.generatePhoneOTP = function() {
  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash and set to phoneOtp field
  this.phoneOtp = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');
  
  // Set OTP expiry (10 minutes by default)
  const expiryTime = process.env.PHONE_OTP_EXPIRES || '10m';
  this.phoneOtpExpires = getExpiryTime(expiryTime);
  
  return otp;
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = function() {
  // If lock has expired, reset attempts and lockUntil
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
    return;
  }
  
  // Increment attempts
  this.loginAttempts += 1;
  
  // Lock account if too many attempts (e.g., 5)
  if (this.loginAttempts >= 5 && !this.lockUntil) {
    // Lock for 1 hour
    this.lockUntil = new Date(Date.now() + 60 * 60 * 1000);
  }
};

// Method to check if account is locked
userSchema.methods.isAccountLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
};

// Helper function to convert time strings (like '24h', '10m') to milliseconds from now
function getExpiryTime(timeString) {
  const match = timeString.match(/^(\d+)([hdm])$/);
  if (!match) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000); // Default: 24 hours
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  let milliseconds = 0;
  switch (unit) {
    case 'h':
      milliseconds = value * 60 * 60 * 1000; // hours to ms
      break;
    case 'd':
      milliseconds = value * 24 * 60 * 60 * 1000; // days to ms
      break;
    case 'm':
      milliseconds = value * 60 * 1000; // minutes to ms
      break;
    default:
      milliseconds = 24 * 60 * 60 * 1000; // Default: 24 hours
  }

  return new Date(Date.now() + milliseconds);
}

const User = mongoose.model('User', userSchema);

module.exports = User; 