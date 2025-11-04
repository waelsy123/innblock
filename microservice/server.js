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
  const filters = {};

  // Add filters from query params
  if (req.query.from) {
    filters.from = req.query.from;
  }
  if (req.query.to) {
    filters.to = req.query.to;
  }
  if (req.query.human !== undefined) {
    filters.human = req.query.human === 'true' || req.query.human === '1';
  }

  const transactions = storage.getLatestTransactions(limit, filters);

  res.json({
    success: true,
    count: transactions.length,
    filters: filters,
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
    version: '1.1.0',
    endpoints: {
      '/api/transactions': 'Get latest transactions (params: limit, from, to, human)',
      '/api/hot-addresses': 'Get hot addresses by activity (params: limit)',
      '/api/stats': 'Get service statistics',
      '/health': 'Health check'
    },
    filters: {
      limit: 'Number of results to return (default: 100)',
      from: 'Filter by sender address (case-insensitive)',
      to: 'Filter by recipient address (case-insensitive)',
      human: 'Filter human-readable messages (true/false, default: true)'
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
