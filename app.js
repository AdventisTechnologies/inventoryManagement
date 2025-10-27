require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const stockRoutes = require('./routes/stock');
const productRoutes = require('./routes/product');

const app = express();

// =============================
// Middleware
// =============================
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// =============================
// Enhanced MongoDB Connection
// =============================
// const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inventory';
const MONGODB_URI = process.env.MONGO_URI;

// Updated mongoose options without deprecated options
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 1,
};

// Connection with retry logic
const connectWithRetry = () => {
  console.log('🔄 Attempting MongoDB connection...');
  
  mongoose.connect(MONGODB_URI, mongooseOptions)
    .then(() => {
      console.log('✅ MongoDB connected successfully');
    })
    .catch((error) => {
      console.error('❌ MongoDB connection error:', error.message);
      console.log('🔄 Retrying connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('📊 MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('💥 MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// =============================
// API Routes
// =============================
app.use('/api/stocks', stockRoutes);
app.use('/api/user/products', productRoutes);


// =============================
// Health Check with DB status
// =============================
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({ 
    status: dbStatus === 1 ? 'OK' : 'DB_ERROR',
    database: statusMap[dbStatus] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// =============================
// API Home Route
// =============================


// =============================
// Serve Angular Frontend
// =============================
const angularDistPath = path.join(__dirname, 'inventory', 'browser');
app.use(express.static(angularDistPath));

// =============================
// Catch-All for Angular App
// =============================
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  const angularIndex = path.join(angularDistPath, 'index.html');

  if (fs.existsSync(angularIndex)) {
    res.sendFile(angularIndex);
  } else {
    res.json({
      message: 'Inventory Management API is running',
      note: 'Angular frontend not built yet.',
      endpoints: {
        api: '/api',
        health: '/health',
        products: '/api/products',
        stocks: '/api/stocks'
      }
    });
  }
});

// =============================
// 404 Handler for API Routes
// =============================
app.use(/^\/api(\/.*)?$/, (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// =============================
// Global Error Handler
// =============================
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.message);
  
  // Handle MongoDB timeout errors specifically
  if (err.name === 'MongoTimeoutError' || err.message.includes('buffering timed out')) {
    return res.status(503).json({
      success: false,
      message: 'Database timeout - please try again',
      error: 'Service temporarily unavailable'
    });
  }
  
  if (err.name === 'MongoNetworkError') {
    return res.status(503).json({
      success: false,
      message: 'Database connection error',
      error: 'Service temporarily unavailable'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

module.exports = app;