# Innblock Transaction Pool Microservice

A real-time transaction pooling service that monitors Ethereum blockchain for human-readable messages.

## Features

- 🔄 **Real-time Block Polling**: Automatically fetches new blocks every 10 seconds
- 💬 **Human Message Detection**: Filters transactions to find only human-readable messages
- 🔥 **Hot Address Ranking**: Tracks and ranks addresses by message activity
- 💾 **In-Memory Storage**: Fast access to latest 100,000 transactions
- 📊 **REST API**: Easy integration with frontend applications

## Installation

```bash
cd microservice
npm install
```

## Configuration

Edit `.env` file:

```env
ETHERSCAN_API_KEY=your_api_key_here
PORT=3001
POLL_INTERVAL=10000
MAX_TRANSACTIONS=100000
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Get Latest Transactions
```
GET /api/transactions?limit=100&from=0x...&to=0x...&human=true
```

Returns the most recent transactions with optional filtering.

**Query Parameters:**
- `limit` (number, default: 100): Maximum number of transactions to return
- `from` (string, optional): Filter by sender address (case-insensitive)
- `to` (string, optional): Filter by recipient address (case-insensitive)
- `human` (boolean, default: true): Filter human-readable messages only

**Examples:**
```
GET /api/transactions?limit=50
GET /api/transactions?from=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
GET /api/transactions?to=0x0000000000000000000000000000000000000000
GET /api/transactions?from=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb&limit=10
```

**Response:**
```json
{
  "success": true,
  "count": 100,
  "filters": {
    "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  },
  "data": [
    {
      "hash": "0x...",
      "from": "0x...",
      "to": "0x...",
      "blockNumber": 12345678,
      "timestamp": 1234567890,
      "message": "hello world",
      "value": "0.000000",
      "timestampFormatted": "1/1/2024, 12:00:00 PM"
    }
  ]
}
```

### Get Hot Addresses
```
GET /api/hot-addresses?limit=50
```

Returns addresses ranked by message activity (recency + volume).

**Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "address": "0x...",
      "sentCount": 10,
      "receivedCount": 5,
      "lastActivity": 1234567890,
      "totalMessages": 15,
      "hotness": "12.50",
      "hoursAgo": "2.3"
    }
  ]
}
```

### Get Statistics
```
GET /api/stats
```

Returns service statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTransactions": 1523,
    "maxSize": 100000,
    "uniqueAddresses": 456,
    "oldestTimestamp": 1234567890,
    "newestTimestamp": 1234567999,
    "lastProcessedBlock": 12345678,
    "uptime": 3600,
    "pollInterval": 10000
  }
}
```

### Health Check
```
GET /health
```

## How It Works

1. **Block Polling**: Service queries Etherscan API every 10 seconds for the latest block number
2. **Transaction Fetching**: For each new block, fetches all transactions
3. **Message Filtering**: Decodes transaction input data and filters for human-readable content
4. **Storage**: Adds valid transactions to in-memory store (FIFO, max 100k)
5. **Address Tracking**: Updates activity statistics for sender and recipient addresses
6. **Ranking**: Calculates "hotness" score based on message count and recency

## Hotness Algorithm

```javascript
hoursAgo = (now - lastActivity) / 3600
recencyMultiplier = max(0.1, 1 / (1 + hoursAgo / 24))
hotness = totalMessages * recencyMultiplier
```

Addresses with recent activity get higher scores, decaying over 24 hours.

## Notes

- Requires valid Etherscan API key
- Rate limited by Etherscan (5 calls/sec for free tier)
- Stores transactions in memory (not persistent)
- Automatically filters out non-human messages (code, binary data, etc.)
