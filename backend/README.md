# FreshThreads Authentication Backend API

This is a production-ready authentication backend API built with Node.js and Express that provides a comprehensive authentication system supporting traditional email/password login, SMS verification, and social logins. It's designed to connect seamlessly with existing frontend login and sign-up pages.

## Key Features

- **Multiple Authentication Methods**:
  - Email/Password login with JWT tokens
  - Social login via Google and Facebook OAuth
  - Phone verification via SMS OTP

- **Comprehensive Verification Flow**:
  - Email verification with secure tokens
  - Phone verification using Twilio Verify API
  - Step-by-step verification process

- **Production-Ready Email Service**:
  - Environment-aware configuration (Ethereal in dev, SMTP in prod)
  - Responsive HTML email templates
  - Template rendering with variable substitution

- **Security Features**:
  - JWT authentication with access and refresh tokens
  - Password hashing with bcrypt
  - Rate limiting for auth endpoints
  - Secure HTTP headers with Helmet
  - CORS protection
  - Input validation with express-validator

- **Development Convenience**:
  - Automatic Ethereal SMTP account creation in development
  - Mock SMS service for development
  - Debug endpoints for testing configurations
  - Comprehensive error handling

- **Well-Structured Codebase**:
  - Clear MVC architecture
  - Middleware-based approach
  - JSDoc documentation
  - Environment configuration with dotenv

## Detailed Features

## Features

- Complete authentication system with JWT (access and refresh tokens)
- Email verification via unique token
- Phone verification via OTP (One-Time Password)
- Password hashing and security best practices
- Rate limiting to prevent abuse
- Input validation
- Error handling
- MongoDB database integration
- RESTful API architecture

## Tech Stack

- Node.js & Express.js - Backend framework
- MongoDB & Mongoose - Database and ODM
- JWT (jsonwebtoken) - Authentication
- Nodemailer - Email sending
- Twilio - SMS sending
- bcryptjs - Password hashing
- express-validator - Input validation
- express-rate-limit - Rate limiting
- cors - CORS support
- dotenv - Environment variable management
- helmet - Security headers

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js** (v14.x or higher) - [Download Node.js](https://nodejs.org/)
- **npm** (v6.x or higher) - Comes with Node.js
- **MongoDB** (v4.x or higher) - [Download MongoDB](https://www.mongodb.com/try/download/community) or use MongoDB Atlas
- A code editor (like VS Code, Sublime Text, etc.)

## Installation

1. Make sure you have Node.js and npm installed:

   ```bash
   node --version
   npm --version
   ```
   
   If they are not installed, download and install from [Node.js website](https://nodejs.org/).

2. Clone the repository or navigate to the project folder:

   ```bash
   # If cloning
   git clone <repository-url>
   
   # Navigate to backend directory
   cd backend
   ```

3. Initialize a new package.json file (if not already present):

   ```bash
   npm init -y
   ```

4. Install dependencies:

   ```bash
   npm install bcryptjs cors dotenv express express-rate-limit express-validator jsonwebtoken mongoose nodemailer twilio helmet cookie-parser morgan uuid
   ```

5. For development, install nodemon:

   ```bash
   npm install --save-dev nodemon
   ```

6. Create a `.env` file in the root of the backend directory by copying the `.env.example` file:
   
   ```bash
   # On Windows
   copy .env.example .env
   
   # On macOS/Linux
   cp .env.example .env
   ```

7. Update the `.env` file with your actual configuration values.

## Configuration

Update the `.env` file with the following information:

- MongoDB connection URI
- JWT secret and expiry times
- Email service credentials
- Twilio credentials
- Frontend URL for CORS and email verification links

## Running the Server

Add the following scripts to your package.json (if not already present):

```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js"
}
```

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## API Endpoints

### Authentication

#### Register User

```
POST /api/auth/signup
```

Request body:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "password": "StrongP@ss123",
  "confirmPassword": "StrongP@ss123"
}
```

#### Verify Email

```
POST /api/auth/verify-email
```

Request body:
```json
{
  "token": "email_verification_token"
}
```

#### Verify Phone with OTP

```
POST /api/auth/verify-phone
```

Request body:
```json
{
  "phone": "+1234567890",
  "otp": "123456"
}
```

#### Resend Email Verification

```
POST /api/auth/resend-email
```

Request body:
```json
{
  "email": "john.doe@example.com"
}
```

#### Resend Phone OTP

```
POST /api/auth/resend-otp
```

Request body:
```json
{
  "phone": "+1234567890"
}
```

#### Login

```
POST /api/auth/login
```

Request body:
```json
{
  "email": "john.doe@example.com",
  "password": "StrongP@ss123"
}
```

#### Logout

```
POST /api/auth/logout
```

Requires: Authorization header or Cookie with JWT

#### Refresh Token

```
POST /api/auth/refresh-token
```

Requires: Cookie with refresh token

### User Management

All endpoints below require authentication (JWT).

#### Get User Profile

```
GET /api/users/me
```

#### Update User Profile

```
PUT /api/users/me
```

Request body:
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "phone": "+1987654321"
}
```

#### Change Password

```
PUT /api/users/change-password
```

Request body:
```json
{
  "currentPassword": "OldStrongP@ss123",
  "newPassword": "NewStrongP@ss456",
  "confirmPassword": "NewStrongP@ss456"
}
```

#### Delete Account

```
DELETE /api/users/me
```

## Integration with Frontend

To integrate with the frontend:

1. Set the correct `FRONTEND_URL` in the `.env` file
2. Use the API endpoints from your frontend application
3. Store tokens securely (HTTP-only cookies are set automatically)
4. Implement the verification flows in your frontend:
   - Email verification page to handle the token from the email link
   - Phone verification form to enter the OTP received via SMS

### Example Frontend Verification Flow

1. User registers
2. Frontend shows a message to check email
3. User clicks verification link in email
4. Frontend captures token from URL and sends to `/api/auth/verify-email`
5. If email verified, show phone verification form
6. User enters OTP received via SMS
7. Frontend sends OTP to `/api/auth/verify-phone`
8. If both verifications are successful, allow login

## Security Features

- Passwords are hashed using bcrypt
- JWT with short expiry for access tokens
- HTTP-only cookies for token storage
- Rate limiting to prevent brute force
- Validation of all inputs
- CORS configuration
- Security HTTP headers with Helmet
- Email verification with unique tokens
- Phone verification with OTP
- Environment variable separation

## Testing

The system can be tested using Postman or similar API testing tools. 

For email and SMS functionality:
1. In development, console logs will show email content and SMS OTPs
2. Set up actual email provider and Twilio for production

## Deployment Considerations

1. Use HTTPS in production
2. Set `NODE_ENV=production` for optimized performance
3. Configure a proper MongoDB instance (Atlas recommended)
4. Set up a professional email service
5. Register for Twilio or similar SMS service
6. Configure proper CORS settings for your frontend domain
7. Monitor server logs and performance

## License

This project is proprietary software of FreshThreads.

## Author

FreshThreads Development Team 

## Email Service Configuration

The application includes a production-ready email service that automatically adapts to your environment.

### Environment-aware Email Service

- **Development Mode**: Automatically creates an Ethereal test account for email previewing
- **Production Mode**: Uses configured SMTP credentials for sending real emails

### Configuration Options

In your `.env` file, set the following variables:

```bash
# Email Configuration

# Environment selection (development/production)
NODE_ENV=development

# For production SMTP (required in production)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-password
EMAIL_FROM=FreshThreads <noreply@freshthreads.com>

# Optional DKIM configuration for better deliverability
EMAIL_DKIM_DOMAIN=yourdomain.com
EMAIL_DKIM_KEY=your-private-key
EMAIL_DKIM_SELECTOR=default
```

### How It Works

1. **Development Mode**:
   - If `NODE_ENV !== 'production'` and no `EMAIL_HOST` is provided, the service automatically creates an Ethereal test account
   - Email preview URLs are logged to the console for easy testing
   - You can access `GET /api/auth/debug/email-config` to verify the email configuration

2. **Production Mode**:
   - When `NODE_ENV === 'production'`, the service uses the SMTP credentials from environment variables
   - DKIM signing is supported for better email deliverability
   - TLS security is automatically applied based on the port (465 for SSL, others for STARTTLS)

### Email Templates

The system includes responsive HTML email templates for:

- Email verification
- Password reset
- Welcome emails

All templates support variable substitution using handlebars-style syntax (`{{ variableName }}`).

### Testing Email Configuration

To verify your email configuration is working:

```bash
# In development
curl http://localhost:5000/api/auth/debug/email-config

# Look for Ethereal test account information in console logs
```

### Custom Templates

Email templates are stored in `src/templates/email/*.html`. To create a new template:

1. Add a new HTML file in the templates directory
2. Use the `{{ variableName }}` syntax for dynamic content
3. Use inline CSS for email client compatibility 

## SMS Verification Configuration

The application includes a production-ready SMS verification service using Twilio Verify.

### Environment-aware SMS Service

- **Development Mode**: Automatically creates mock SMS verification when `USE_SMS_MOCK=true`
- **Production Mode**: Uses Twilio Verify for sending and verifying OTP codes

### Configuration Options

In your `.env` file, set the following variables:

```bash
# Twilio Configuration (for SMS)

# For real Twilio service
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
# For Twilio Verify (OTP verification)
TWILIO_VERIFY_SID=your_twilio_verify_service_sid

# For development testing without Twilio
USE_SMS_MOCK=true
```

### How It Works

1. **Development Mode**:
   - If `USE_SMS_MOCK=true`, the system uses a mock implementation that logs OTP codes to the console
   - Any code ending in "123" is considered valid for testing purposes
   - You can access `GET /api/auth/debug/sms-config` to verify the SMS configuration

2. **Production Mode**:
   - When using real Twilio credentials, the system sends actual SMS verification codes
   - OTP verification is handled through Twilio's Verify API
   - Secure and reliable OTP delivery and validation

### Setting Up Twilio Verify

1. Sign up for a [Twilio account](https://www.twilio.com/try-twilio)
2. Create a Verify Service in the Twilio Console
3. Get your Account SID, Auth Token, and Verify Service SID
4. Add these credentials to your `.env` file

### Testing SMS Verification

To test the SMS verification:

```bash
# In development with USE_SMS_MOCK=true
curl http://localhost:5000/api/auth/debug/sms-config

# Look for mock OTP information in console logs
# Use any code ending in "123" to successfully verify
```

## Social Login Configuration

The application includes OAuth 2.0 social login support for Google and Facebook.

### Setting Up Social Login

1. **Google OAuth**:
   - Create a project in the [Google Developer Console](https://console.developers.google.com/)
   - Configure the OAuth consent screen
   - Create OAuth 2.0 credentials (Client ID and Client Secret)
   - Add authorized redirect URIs: `http://localhost:5000/api/auth/google/callback` (for development)
   - Add these credentials to your `.env` file

2. **Facebook OAuth**:
   - Create an app in the [Facebook Developer Portal](https://developers.facebook.com/)
   - Set up Facebook Login product
   - Configure Valid OAuth Redirect URIs: `http://localhost:5000/api/auth/facebook/callback` (for development)
   - Copy your App ID and App Secret to your `.env` file

### Configuration Options

In your `.env` file, set the following variables:

```bash
# Social Login Configuration
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# API Base URL (for callbacks)
API_BASE_URL=http://localhost:5000
```

### Social Login Endpoints

#### Google Login

```
GET /api/auth/google
```

This initiates the Google OAuth flow and redirects to Google's authentication page.

#### Facebook Login

```
GET /api/auth/facebook
```

This initiates the Facebook OAuth flow and redirects to Facebook's authentication page.

### How It Works

1. User clicks a social login button on your frontend
2. Frontend redirects to `/api/auth/google` or `/api/auth/facebook`
3. User authenticates with the social provider
4. Provider redirects back to your callback URL
5. Backend creates or links a user account
6. User is redirected to your frontend with a JWT token

### Testing Social Login

To verify your social login configuration:

```bash
# In development
curl http://localhost:5000/api/auth/debug/social-config
```

### Frontend Integration

Add social login buttons to your login page that redirect to these endpoints:

```html
<a href="http://localhost:5000/api/auth/google">Login with Google</a>
<a href="http://localhost:5000/api/auth/facebook">Login with Facebook</a>
``` 