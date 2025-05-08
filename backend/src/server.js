const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const passport = require('passport');
const session = require('express-session');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

// Import Passport config
const configurePassport = require('./config/passport');

// Import error handling middleware
const { notFound, errorHandler } = require('./middlewares/error.middleware');

// Initialize express app
const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "unpkg.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:"],
      imgSrc: ["'self'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(morgan('dev'));

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Session configuration for Passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport strategies
configurePassport();

// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '../../')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Basic route for testing API
app.get('/api', (req, res) => {
  res.send('FreshThreads API is running...');
});

// Route handler for HTML files
app.get('/:file.html', (req, res) => {
  res.sendFile(path.join(__dirname, `../../${req.params.file}.html`));
});

// Fallback route - serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../laundary.html'));
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

module.exports = app; 