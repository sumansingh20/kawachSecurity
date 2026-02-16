/**
 * KAVACH-INFINITY Backend Server
 * Enterprise Safety & Monitoring Platform
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const auditRoutes = require('./routes/audit');
const eventsRoutes = require('./routes/events');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const { initializeDatabase } = require('./config/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' }
});
app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend for all other routes (Express 5 syntax)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Initialize database and start server
let isInitialized = false;

async function initializeApp() {
  if (isInitialized) return;
  try {
    await connectDB();
    console.log('✓ MongoDB connected');
    await initializeDatabase();
    console.log('✓ Database initialized');
    isInitialized = true;
  } catch (error) {
    console.error('Initialization error:', error.message);
    throw error;
  }
}

// For local development
if (process.env.NODE_ENV !== 'production') {
  initializeApp().then(() => {
    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`  KAVACH-INFINITY Server`);
      console.log(`  http://localhost:${PORT}`);
      console.log(`========================================`);
      console.log(`\nDemo Accounts:`);
      console.log(`  Admin: admin@kavach.in / Kavach@123`);
      console.log(`  User:  user@kavach.in / User@123`);
      console.log(`\n`);
    });
  }).catch(err => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
}

// For Vercel serverless
module.exports = app;
module.exports.initializeApp = initializeApp;
