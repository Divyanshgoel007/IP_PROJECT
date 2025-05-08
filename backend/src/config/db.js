const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * @returns {Promise} MongoDB connection
 */
const connectDB = async () => {
  try {
    // MongoDB connection options
    const options = {
      // No longer need useNewUrlParser and useUnifiedTopology in Mongoose 6+
      autoIndex: true, // Build indexes
      minPoolSize: 5, // Maintain up to 5 socket connections
      maxPoolSize: 10, // Maximum 10 socket connections
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4 // Use IPv4, skip IPv6
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`.red.bold);
    process.exit(1); // Exit with failure
  }
};

/**
 * Close MongoDB connection
 * @returns {Promise} Closed connection status
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed'.yellow);
    return true;
  } catch (error) {
    console.error(`Error closing MongoDB connection: ${error.message}`.red);
    return false;
  }
};

/**
 * Get MongoDB connection state
 * @returns {Object} Connection state information
 */
const getConnectionState = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };

  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    dbName: mongoose.connection.name,
    host: mongoose.connection.host,
    models: Object.keys(mongoose.models)
  };
};

module.exports = { connectDB, closeDB, getConnectionState }; 