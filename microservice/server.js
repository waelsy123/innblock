require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TransactionStorage = require('./storage');
const BlockPoller = require('./poller');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.ETHERSCAN_API_KEY;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 10000;
const MAX_TRANSACTIONS = parseInt(process.env.MAX_TRANSACTIONS) || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize storage and poller
const storage = new TransactionStorage(MAX_TRANSACTIONS);
const poller = new BlockPoller(storage, API_KEY);

// API Endpoints

// Get latest transactions
app.get('/api/transactions', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const transactions = storage.getLatestTransactions(limit);

  res.json({
    success: true,
    count: transactions.length,
    data: transactions
  });
});

// Get hot addresses
app.get('/api/hot-addresses', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const hotAddresses = storage.getHotAddresses(limit);

  res.json({
    success: true,
    count: hotAddresses.length,
    data: hotAddresses
  });
});

// Get service statistics
app.get('/api/stats', (req, res) => {
  const stats = storage.getStats();

  res.json({
    success: true,
    data: {
      ...stats,
      lastProcessedBlock: poller.lastProcessedBlock,
      uptime: process.uptime(),
      pollInterval: POLL_INTERVAL
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'innblock-tx-pool',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Innblock Transaction Pool Service',
    version: '1.0.0',
    endpoints: {
      '/api/transactions?limit=100': 'Get latest transactions',
      '/api/hot-addresses?limit=50': 'Get hot addresses by activity',
      '/api/stats': 'Get service statistics',
      '/health': 'Health check'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Innblock TX Pool Service running on port ${PORT}`);
  console.log(`📊 Max transactions in memory: ${MAX_TRANSACTIONS}`);
  console.log(`⏱️  Poll interval: ${POLL_INTERVAL}ms`);
  console.log(`🔗 Endpoints:`);
  console.log(`   - http://localhost:${PORT}/api/transactions`);
  console.log(`   - http://localhost:${PORT}/api/hot-addresses`);
  console.log(`   - http://localhost:${PORT}/api/stats`);
  console.log(`\n🔄 Starting block polling...\n`);

  // Start polling for new blocks
  poller.startPolling(POLL_INTERVAL);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Shutting down gracefully...');
  poller.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Shutting down gracefully...');
  poller.stopPolling();
  process.exit(0);
});
