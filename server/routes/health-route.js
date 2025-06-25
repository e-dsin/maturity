const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// Simple health check for ECS
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running' });
});

// Basic health check
router.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Maturity Backend API is operational',
    environment: process.env.NODE_ENV || 'unknown',
  });
});

// Database health check
router.get('/api/health/database', async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || process.env.DB_PASSWORD_FALLBACK,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT),
      ssl: { rejectUnauthorized: false },
    });

    // Test query to verify database connectivity
    await connection.execute('SELECT 1');
    await connection.end();

    res.status(200).json({
      status: 'OK',
      message: 'Database connection successful',
      database: process.env.DB_NAME,
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

// Detailed health check
router.get('/api/health/detailed', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    status: 'OK',
    message: 'Detailed health check',
    environment: process.env.NODE_ENV || 'unknown',
    uptimeSeconds: Math.floor(uptime),
    memoryUsage: {
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    },
    timestamp: new Date().toISOString(),
  });
});

// CORS test endpoint
router.get('/api/test-cors', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'CORS test successful',
    headers: req.headers.origin ? { origin: req.headers.origin } : 'No origin header',
  });
});

module.exports = router;