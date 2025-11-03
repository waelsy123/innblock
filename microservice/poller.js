const axios = require('axios');
const { isHumanMessage, decodeMessage } = require('./filters');

class BlockPoller {
  constructor(storage, apiKey) {
    this.storage = storage;
    this.apiKey = apiKey;
    this.lastProcessedBlock = null;
    this.isPolling = false;
    this.pollInterval = null;
  }

  async getLatestBlockNumber() {
    try {
      const response = await axios.get(`https://api.etherscan.io/v2/api`, {
        params: {
          chainid: 1,
          module: 'proxy',
          action: 'eth_blockNumber',
          apikey: this.apiKey
        }
      });

      if (response.data && response.data.result) {
        // Convert hex to decimal
        return parseInt(response.data.result, 16);
      }
    } catch (error) {
      console.error('Error fetching latest block:', error.message);
    }
    return null;
  }

  async getBlockTransactions(blockNumber) {
    try {
      const response = await axios.get(`https://api.etherscan.io/v2/api`, {
        params: {
          chainid: 1,
          module: 'proxy',
          action: 'eth_getBlockByNumber',
          tag: '0x' + blockNumber.toString(16),
          boolean: true,
          apikey: this.apiKey
        }
      });

      if (response.data && response.data.result && response.data.result.transactions) {
        return response.data.result.transactions;
      }
    } catch (error) {
      console.error(`Error fetching block ${blockNumber}:`, error.message);
    }
    return [];
  }

  processTransaction(tx, blockTimestamp) {
    // Skip if no input data
    if (!tx.input || tx.input === '0x') {
      return null;
    }

    // Decode the message
    const message = decodeMessage(tx.input);

    // Check if it's a human-readable message
    if (!isHumanMessage(message)) {
      return null;
    }

    // Convert hex values to readable format
    const value = parseInt(tx.value, 16) / 1e18;
    const timestamp = parseInt(blockTimestamp, 16);

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      blockNumber: parseInt(tx.blockNumber, 16),
      timestamp: timestamp,
      message: message,
      value: value.toFixed(6),
      timestampFormatted: new Date(timestamp * 1000).toLocaleString()
    };
  }

  async pollNewBlocks() {
    if (this.isPolling) {
      console.log('Already polling, skipping...');
      return;
    }

    this.isPolling = true;

    try {
      const latestBlock = await this.getLatestBlockNumber();

      if (!latestBlock) {
        console.log('Could not fetch latest block');
        this.isPolling = false;
        return;
      }

      // Initialize last processed block if first run
      if (this.lastProcessedBlock === null) {
        this.lastProcessedBlock = latestBlock - 1; // Start from previous block
        console.log(`Initialized at block ${this.lastProcessedBlock}`);
      }

      // Process new blocks
      const blocksToProcess = [];
      for (let block = this.lastProcessedBlock + 1; block <= latestBlock; block++) {
        blocksToProcess.push(block);
      }

      if (blocksToProcess.length === 0) {
        console.log(`No new blocks (current: ${latestBlock})`);
        this.isPolling = false;
        return;
      }

      console.log(`Processing ${blocksToProcess.length} new block(s): ${blocksToProcess[0]} to ${blocksToProcess[blocksToProcess.length - 1]}`);

      for (const blockNum of blocksToProcess) {
        const transactions = await this.getBlockTransactions(blockNum);

        if (transactions.length > 0) {
          const blockTimestamp = transactions[0].timestamp || '0x0';

          let humanMessages = 0;
          for (const tx of transactions) {
            const processedTx = this.processTransaction(tx, blockTimestamp);
            if (processedTx) {
              this.storage.addTransaction(processedTx);
              humanMessages++;
            }
          }

          if (humanMessages > 0) {
            console.log(`Block ${blockNum}: Found ${humanMessages} human message(s) out of ${transactions.length} transactions`);
          }
        }

        this.lastProcessedBlock = blockNum;
      }

      const stats = this.storage.getStats();
      console.log(`Storage: ${stats.totalTransactions} transactions, ${stats.uniqueAddresses} unique addresses`);

    } catch (error) {
      console.error('Error in pollNewBlocks:', error.message);
    }

    this.isPolling = false;
  }

  startPolling(intervalMs = 10000) {
    console.log(`Starting block polling every ${intervalMs}ms`);

    // Do initial poll immediately
    this.pollNewBlocks();

    // Then poll at interval
    this.pollInterval = setInterval(() => {
      this.pollNewBlocks();
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('Stopped block polling');
    }
  }
}

module.exports = BlockPoller;
