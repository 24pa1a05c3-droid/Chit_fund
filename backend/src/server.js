require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Ensure db initializes on startup
const db = require('./config/db');

// Route handlers
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const membersRoutes = require('./routes/members');
const groupsRoutes = require('./routes/groups');
const paymentsRoutes = require('./routes/payments');
const payoutsRoutes = require('./routes/payouts');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and body parsing
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Savings Group (Chit Fund) Manager API'
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/payouts', payoutsRoutes);
app.use('/api/reports', reportsRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// Start Express server
const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Savings Group (Chit Fund) Manager Backend running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`💼 SQLite Database initialized with sample demo records`);
  console.log('====================================================');
});

module.exports = { app, server };
