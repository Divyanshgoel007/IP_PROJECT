const nodemailer = require('nodemailer');
const { promisify } = require('util');

/**
 * Email service class for sending various emails
 */
class EmailService {
  constructor() {
    this.from = process.env.EMAIL_FROM || 'FreshThreads <noreply@freshthreads.com>';
    this.setupTransporter();
  }

  /**
   * Set up the email transporter based on environment
   */
  setupTransporter() {
    // For development/testing with Ethereal
    if (process.env.EMAIL_SERVICE === 'ethereal') {
      this.createEtherealTransporter();
    } else {
      // For production with a real SMTP provider
      this.createSmtpTransporter();
    }
  }

  /**
   * Create a test/development transporter using Ethereal
   */
  async createEtherealTransporter() {
    try {
      // Generate ethereal account on first use
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        const testAccount = await nodemailer.createTestAccount();
        
        console.log('Ethereal Email account created:');
        console.log(`- Email: ${testAccount.user}`);
        console.log(`- Password: ${testAccount.pass}`);
        console.log('- Use these credentials in your .env file');
        
        // Set up transporter with ethereal credentials
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
      } else {
        // Use configured ethereal credentials
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
      }
      
      console.log('Ethereal email transporter set up for development');
    } catch (error) {
      console.error('Failed to create Ethereal test account:', error);
      throw new Error('Email service configuration failed');
    }
  }

  /**
   * Create a production SMTP transporter
   */
  createSmtpTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    console.log('SMTP email transporter set up for production');
  }

  /**
   * Format verification email template
   * @param {Object} options - Options for the email
   * @param {String} options.name - User's name
   * @param {String} options.email - User's email
   * @param {String} options.url - Verification URL with token
   * @returns {Object} - Email details
   */
  verificationEmailTemplate(options) {
    const year = new Date().getFullYear();
    
    return {
      from: this.from,
      to: options.email,
      subject: 'Verify Your Email Address - FreshThreads',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - FreshThreads</title>
          <style>
            body, html {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #9333ea;
              margin-bottom: 10px;
            }
            .card {
              background: linear-gradient(to bottom, #f3f0ff, #fff0f9, #fff5eb);
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .title {
              font-size: 22px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #9333ea;
            }
            .button {
              display: inline-block;
              background: linear-gradient(to right, #9333ea, #db2777);
              color: white;
              text-decoration: none;
              padding: 12px 25px;
              border-radius: 5px;
              font-weight: bold;
              margin: 25px 0;
            }
            .link {
              word-break: break-all;
              color: #9333ea;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .features {
              margin: 25px 0;
              padding: 15px;
              background-color: rgba(255, 255, 255, 0.5);
              border-radius: 5px;
            }
            .feature {
              margin-bottom: 10px;
              display: flex;
              align-items: center;
            }
            .feature-icon {
              margin-right: 10px;
              color: #9333ea;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">FreshThreads</div>
            </div>
            
            <div class="card">
              <div class="title">Verify Your Email Address</div>
              
              <p>Hello ${options.name},</p>
              
              <p>Thank you for signing up for FreshThreads! Please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${options.url}" class="button">Verify Email Address</a>
              </div>
              
              <p>Or copy and paste this link in your browser:</p>
              <p><a href="${options.url}" class="link">${options.url}</a></p>
              
              <p><strong>This link will expire in 24 hours.</strong></p>
              
              <div class="features">
                <p><strong>At FreshThreads, you'll enjoy:</strong></p>
                <div class="feature">
                  <span class="feature-icon">✓</span>
                  <span>24-hour Express Service</span>
                </div>
                <div class="feature">
                  <span class="feature-icon">✓</span>
                  <span>Eco-friendly cleaning</span>
                </div>
                <div class="feature">
                  <span class="feature-icon">✓</span>
                  <span>Free pickup & delivery</span>
                </div>
              </div>
              
              <p>If you did not create an account, please ignore this email.</p>
            </div>
            
            <div class="footer">
              <p>&copy; ${year} FreshThreads. All rights reserved.</p>
              <p>123 Laundry Lane, Clean City, CC 12345</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  /**
   * Format welcome email after successful verification
   * @param {Object} options - Options for the email
   * @param {String} options.name - User's name
   * @param {String} options.email - User's email
   * @returns {Object} - Email details
   */
  welcomeEmailTemplate(options) {
    const year = new Date().getFullYear();
    
    return {
      from: this.from,
      to: options.email,
      subject: 'Welcome to FreshThreads!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to FreshThreads</title>
          <style>
            body, html {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #9333ea;
              margin-bottom: 10px;
            }
            .card {
              background: linear-gradient(to bottom, #f3f0ff, #fff0f9, #fff5eb);
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .title {
              font-size: 22px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #9333ea;
            }
            .button {
              display: inline-block;
              background: linear-gradient(to right, #9333ea, #db2777);
              color: white;
              text-decoration: none;
              padding: 12px 25px;
              border-radius: 5px;
              font-weight: bold;
              margin: 25px 0;
            }
            .features {
              margin: 25px 0;
              padding: 15px;
              background-color: rgba(255, 255, 255, 0.5);
              border-radius: 5px;
            }
            .feature {
              margin-bottom: 10px;
              display: flex;
              align-items: center;
            }
            .feature-icon {
              margin-right: 10px;
              color: #9333ea;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">FreshThreads</div>
            </div>
            
            <div class="card">
              <div class="title">Welcome to FreshThreads!</div>
              
              <p>Hello ${options.name},</p>
              
              <p>Thank you for completing your email verification! Your account is now active and ready to use.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/signup.html" class="button">Login to Your Account</a>
              </div>
              
              <div class="features">
                <p><strong>As a member of FreshThreads, you now have access to:</strong></p>
                <div class="feature">
                  <span class="feature-icon">✓</span>
                  <span>Schedule pickups and deliveries</span>
                </div>
                <div class="feature">
                  <span class="feature-icon">✓</span>
                  <span>Track your orders in real-time</span>
                </div>
                <div class="feature">
                  <span class="feature-icon">✓</span>
                  <span>Manage your laundry preferences</span>
                </div>
                <div class="feature">
                  <span class="feature-icon">✓</span>
                  <span>Earn loyalty points with every order</span>
                </div>
              </div>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact our customer support team.</p>
              
              <p>We look forward to serving you!</p>
              
              <p>Best regards,<br>The FreshThreads Team</p>
            </div>
            
            <div class="footer">
              <p>&copy; ${year} FreshThreads. All rights reserved.</p>
              <p>123 Laundry Lane, Clean City, CC 12345</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  /**
   * Send an email using the configured transporter
   * @param {Object} mailOptions - Email options
   * @returns {Promise<Object>} - Send result
   */
  async sendMail(mailOptions) {
    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      // For Ethereal emails, provide preview URL
      if (process.env.EMAIL_SERVICE === 'ethereal') {
        console.log(`Email sent: ${info.messageId}`);
        console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send verification email
   * @param {Object} options - Options for the email
   * @returns {Promise<Object>} - Send result
   */
  async sendVerificationEmail(options) {
    try {
      const emailOptions = this.verificationEmailTemplate(options);
      const result = await this.sendMail(emailOptions);
      
      if (result.success) {
        console.log(`Verification email sent to ${options.email}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email after verification
   * @param {Object} options - Options for the email
   * @returns {Promise<Object>} - Send result
   */
  async sendWelcomeEmail(options) {
    try {
      const emailOptions = this.welcomeEmailTemplate(options);
      const result = await this.sendMail(emailOptions);
      
      if (result.success) {
        console.log(`Welcome email sent to ${options.email}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify transporter connection
   * @returns {Promise<Boolean>} - Connection status
   */
  async verifyConnection() {
    try {
      // Verify connection configuration
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Failed to verify email transporter:', error);
      return false;
    }
  }
}

module.exports = new EmailService(); 