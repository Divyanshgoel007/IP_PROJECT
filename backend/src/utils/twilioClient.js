/**
 * @file twilioClient.js
 * @description Twilio client configuration for SMS verification
 */
const twilio = require('twilio');

// Create twilio client with environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

// Check for required environment variables
if (!accountSid || !authToken) {
  console.warn('⚠️ [TwilioClient] Missing Twilio credentials. SMS verification will not work.');
}

// Create a mock client for development if specified
if (process.env.USE_SMS_MOCK === 'true') {
  console.log('📱 [TwilioClient] Using mock SMS service for development');
  
  // Mock implementation for development
  module.exports = {
    verify: {
      services: (sid) => ({
        verifications: {
          create: async ({ to, channel }) => {
            console.log(`📱 [TwilioClient] Mock SMS verification sent to ${to} via ${channel}`);
            // Generate a random 6-digit OTP
            const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`📱 [TwilioClient] Mock OTP: ${mockOtp}`);
            return { sid: 'mock-verification-sid', to, channel, status: 'pending' };
          }
        },
        verificationChecks: {
          create: async ({ to, code }) => {
            // In development, any code ending with '123' is considered valid for testing
            const isValid = code.endsWith('123');
            console.log(`📱 [TwilioClient] Mock OTP verification for ${to}: ${isValid ? 'approved' : 'rejected'}`);
            return { 
              sid: 'mock-verification-check-sid', 
              to, 
              status: isValid ? 'approved' : 'pending' 
            };
          }
        }
      })
    }
  };
} else {
  // Create production Twilio client
  try {
    const client = twilio(accountSid, authToken);
    
    if (!verifySid) {
      console.warn('⚠️ [TwilioClient] Missing TWILIO_VERIFY_SID. SMS verification will not work correctly.');
    }
    
    console.log('📱 [TwilioClient] Twilio client initialized');
    module.exports = client;
  } catch (error) {
    console.error('❌ [TwilioClient] Failed to initialize Twilio client:', error);
    
    // Export a dummy client that logs errors
    module.exports = {
      verify: {
        services: () => ({
          verifications: {
            create: async () => {
              throw new Error('Twilio client initialization failed');
            }
          },
          verificationChecks: {
            create: async () => {
              throw new Error('Twilio client initialization failed');
            }
          }
        })
      }
    };
  }
} 