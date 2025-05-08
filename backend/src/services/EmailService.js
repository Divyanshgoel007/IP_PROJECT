/**
 * @file EmailService.js
 * @description Production-ready email service that handles email sending with environment-aware configurations
 */
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');

/**
 * Custom error class for email-related errors
 */
class EmailError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Error} originalError - Original error that caused this
   */
  constructor(message, code = 'EMAIL_ERROR', originalError = null) {
    super(message);
    this.name = 'EmailError';
    this.code = code;
    this.originalError = originalError;
  }
}

/**
 * Production-ready email service with environment-aware configuration
 * Automatically uses Ethereal for development and real SMTP for production
 */
class EmailService {
  /**
   * Creates an instance of the EmailService
   * @param {Object} options - Configuration options
   * @param {string} options.from - Default sender email address
   * @param {string} options.templatesDir - Path to email templates directory
   */
  constructor(options = {}) {
    this.from = options.from || process.env.EMAIL_FROM || 'FreshThreads <noreply@freshthreads.com>';
    this.templatesDir = options.templatesDir || path.join(process.cwd(), 'src/templates/email');
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.transporter = null;
    this.testAccount = null;
    
    // Initialize transporter based on environment
    this.initialize();
  }

  /**
   * Initialize the email service and set up the appropriate transporter
   */
  async initialize() {
    try {
      if (this.isDevelopment && !process.env.EMAIL_HOST) {
        await this.setupEtherealTransporter();
      } else {
        this.setupProductionTransporter();
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      throw new EmailError(
        'Email service initialization failed',
        'EMAIL_INIT_FAILED',
        error
      );
    }
  }

  /**
   * Set up Ethereal test account for development environment
   * @private
   */
  async setupEtherealTransporter() {
    try {
      // Create test account
      this.testAccount = await nodemailer.createTestAccount();
      
      console.log('\n📧 [EmailService] Development mode: Using Ethereal test account');
      console.log(`📧 [EmailService] Login: ${this.testAccount.user}`);
      console.log(`📧 [EmailService] Password: ${this.testAccount.pass}`);
      
      // Create a transporter with the test account
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // TLS
        auth: {
          user: this.testAccount.user,
          pass: this.testAccount.pass
        },
        debug: this.isDevelopment
      });
    } catch (error) {
      console.error('Failed to create Ethereal test account:', error);
      throw new EmailError(
        'Failed to create Ethereal test account for development',
        'ETHEREAL_SETUP_FAILED',
        error
      );
    }
  }

  /**
   * Set up production SMTP transporter with environment variables
   * @private
   */
  setupProductionTransporter() {
    // Check if required environment variables are set
    const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new EmailError(
        `Missing required environment variables: ${missingVars.join(', ')}`,
        'MISSING_EMAIL_CONFIG'
      );
    }
    
    const transportConfig = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: parseInt(process.env.EMAIL_PORT, 10) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };
    
    // Add DKIM if configured
    if (process.env.EMAIL_DKIM_DOMAIN && process.env.EMAIL_DKIM_KEY && process.env.EMAIL_DKIM_SELECTOR) {
      transportConfig.dkim = {
        domainName: process.env.EMAIL_DKIM_DOMAIN,
        keySelector: process.env.EMAIL_DKIM_SELECTOR,
        privateKey: process.env.EMAIL_DKIM_KEY
      };
    }
    
    this.transporter = nodemailer.createTransport(transportConfig);
    
    console.log(`📧 [EmailService] Production mode: Using SMTP server ${process.env.EMAIL_HOST}`);
  }

  /**
   * Verify SMTP connection and configuration
   * @returns {Promise<boolean>} True if connection is successful
   * @throws {EmailError} If verification fails
   */
  async verifyConfig() {
    try {
      // Make sure transporter is initialized
      if (!this.transporter) {
        await this.initialize();
      }
      
      // Verify connection
      await this.transporter.verify();
      console.log('📧 [EmailService] SMTP configuration verified successfully');
      return true;
    } catch (error) {
      console.error('📧 [EmailService] SMTP verification failed:', error);
      throw new EmailError(
        `Email configuration verification failed: ${error.message}`,
        'SMTP_VERIFICATION_FAILED',
        error
      );
    }
  }

  /**
   * Render an email template with variables
   * @param {string} templateName - Name of the template (without extension)
   * @param {Object} variables - Variables to replace in the template
   * @returns {Promise<string>} Rendered HTML content
   * @private
   */
  async renderTemplate(templateName, variables = {}) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.html`);
      let templateContent = await fs.readFile(templatePath, 'utf8');
      
      // Replace variables in the template
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        templateContent = templateContent.replace(regex, value);
      });
      
      return templateContent;
    } catch (error) {
      throw new EmailError(
        `Failed to render email template '${templateName}': ${error.message}`,
        'TEMPLATE_RENDERING_FAILED',
        error
      );
    }
  }

  /**
   * Send an email with a template
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.templateName - Name of the template to use (without extension)
   * @param {Object} options.variables - Variables to replace in the template
   * @param {string} [options.from] - Sender email (defaults to service default)
   * @param {Array<Object>} [options.attachments] - Email attachments
   * @param {string} [options.requestId] - Request ID for logging
   * @returns {Promise<Object>} Information about the sent email including messageId
   * @throws {EmailError} If sending fails
   */
  async sendMail({ to, subject, templateName, variables, from, attachments, requestId }) {
    try {
      // Make sure transporter is initialized
      if (!this.transporter) {
        await this.initialize();
      }
      
      // Prepare log context
      const logContext = requestId ? `[${requestId}]` : '';
      
      // Render template if provided
      let html;
      if (templateName) {
        html = await this.renderTemplate(templateName, variables);
      } else if (variables && variables.html) {
        html = variables.html; // Direct HTML content
      } else {
        throw new EmailError('No template or HTML content provided');
      }
      
      // Prepare email options
      const mailOptions = {
        from: from || this.from,
        to,
        subject,
        html,
        attachments: attachments || []
      };
      
      // Log email being sent
      console.log(`📧 ${logContext} Sending email to ${to} with subject "${subject}"`);
      
      // Send the email
      const info = await this.transporter.sendMail(mailOptions);
      
      // For development, log the Ethereal preview URL
      if (this.isDevelopment) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`📧 ${logContext} Email preview URL: ${previewUrl}`);
      }
      
      console.log(`📧 ${logContext} Email sent: ${info.messageId}`);
      
      return {
        messageId: info.messageId,
        previewUrl: this.isDevelopment ? nodemailer.getTestMessageUrl(info) : null,
        envelope: info.envelope,
        response: info.response
      };
    } catch (error) {
      console.error(`📧 Email sending failed:`, error);
      throw new EmailError(
        `Failed to send email: ${error.message}`,
        'EMAIL_SENDING_FAILED',
        error
      );
    }
  }
  
  /**
   * Send a verification email to a user
   * @param {Object} options - User details
   * @param {string} options.email - User's email address
   * @param {string} options.name - User's name
   * @param {string} options.url - Verification URL
   * @param {string} [options.requestId] - Request ID for logging
   * @returns {Promise<Object>} Information about the sent email
   */
  async sendVerificationEmail({ email, name, url, requestId }) {
    return this.sendMail({
      to: email,
      subject: 'Verify Your Email Address - FreshThreads',
      templateName: 'verify',
      variables: {
        name,
        url,
        year: new Date().getFullYear().toString()
      },
      requestId
    });
  }
  
  /**
   * Send a welcome email after successful verification
   * @param {Object} options - User details
   * @param {string} options.email - User's email address
   * @param {string} options.name - User's name
   * @param {string} [options.requestId] - Request ID for logging
   * @returns {Promise<Object>} Information about the sent email
   */
  async sendWelcomeEmail({ email, name, requestId }) {
    return this.sendMail({
      to: email,
      subject: 'Welcome to FreshThreads!',
      templateName: 'welcome',
      variables: {
        name,
        year: new Date().getFullYear().toString()
      },
      requestId
    });
  }
  
  /**
   * Send a password reset email
   * @param {Object} options - User details
   * @param {string} options.email - User's email address
   * @param {string} options.name - User's name
   * @param {string} options.url - Reset URL
   * @param {string} [options.requestId] - Request ID for logging
   * @returns {Promise<Object>} Information about the sent email
   */
  async sendPasswordResetEmail({ email, name, url, requestId }) {
    return this.sendMail({
      to: email,
      subject: 'Reset Your Password - FreshThreads',
      templateName: 'reset-password',
      variables: {
        name,
        url,
        year: new Date().getFullYear().toString()
      },
      requestId
    });
  }
}

module.exports = EmailService; 