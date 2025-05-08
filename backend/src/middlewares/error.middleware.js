/**
 * Middleware for handling 404 errors (Not Found)
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Set status code (use error status code or 500 if not specified)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode);
  
  // Return error response
  res.json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    error: {
      name: err.name,
      ...(err.errors && { errors: err.errors })
    }
  });
};

module.exports = { notFound, errorHandler }; 