/**
 * @file sms.util.js
 * @description SMS service for sending OTP and notification messages
 */
const twilioClient = require('./twilioClient');

/**
 * SMS Service class for sending various text messages
 */
class SMSService {
  constructor() {
    this.verifySid = process.env.TWILIO_VERIFY_SID;
    this.from = process.env.TWILIO_PHONE_NUMBER;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Send OTP for phone verification using Twilio Verify
   * @param {Object} options - Options for the message
   * @param {String} options.to - Recipient phone number (E.164 format)
   * @returns {Promise<Object>} - Result of the verification request
   */
  async sendOTP({ to }) {
    try {
      // Remove any spaces from phone number
      const formattedPhone = to.replace(/\s/g, '');
      
      // Using Twilio Verify API
      const verification = await twilioClient.verify.services(this.verifySid)
        .verifications.create({
          to: formattedPhone,
          channel: 'sms'
        });
      
      console.log(`📱 [SMSService] OTP sent to ${formattedPhone}`);
      
      return {
        success: true,
        sid: verification.sid,
        status: verification.status
      };
    } catch (error) {
      console.error('📱 [SMSService] Failed to send OTP:', error);
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }
  
  /**
   * Verify OTP entered by user
   * @param {Object} options - Options for verification
   * @param {String} options.to - Phone number to verify (E.164 format)
   * @param {String} options.code - OTP code entered by user
   * @returns {Promise<Object>} - Result of the verification check
   */
  async verifyOTP({ to, code }) {
    try {
      // Remove any spaces from phone number
      const formattedPhone = to.replace(/\s/g, '');
      
      // Verify the code using Twilio Verify API
      const verificationCheck = await twilioClient.verify.services(this.verifySid)
        .verificationChecks.create({
          to: formattedPhone,
          code
        });
      
      console.log(`📱 [SMSService] OTP verification for ${formattedPhone}: ${verificationCheck.status}`);
      
      return {
        success: verificationCheck.status === 'approved',
        status: verificationCheck.status
      };
    } catch (error) {
      console.error('📱 [SMSService] Failed to verify OTP:', error);
      throw new Error(`Failed to verify OTP: ${error.message}`);
    }
  }

  /**
   * Send a verification success message
   * @param {Object} options - Options for the message
   * @param {String} options.to - Recipient phone number (E.164 format)
   * @returns {Promise<Object>} - Result of the SMS send
   */
  async sendVerificationSuccess({ to }) {
    if (this.isDevelopment) {
      console.log(`📱 [SMSService] Mock verification success message to ${to}`);
      return { success: true };
    }
    
    try {
      // Here we use direct SMS instead of Verify for this notification
      const message = await twilioClient.messages.create({
        body: 'Your phone number has been successfully verified with FreshThreads. Welcome aboard!',
        from: this.from,
        to
      });
      
      console.log(`📱 [SMSService] Verification success message sent to ${to}`);
      
      return {
        success: true,
        sid: message.sid
      };
    } catch (error) {
      console.error('📱 [SMSService] Failed to send verification success message:', error);
      // We don't throw here since this is a non-critical notification
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SMSService(); 