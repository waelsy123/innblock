class TransactionStorage {
  constructor(maxSize = 10000) {
    this.transactions = [];
    this.maxSize = maxSize;
    this.addressStats = new Map(); // Track address activity
  }

  addTransaction(tx) {
    // Add to beginning of array (newest first)
    this.transactions.unshift(tx);

    // Update address stats
    this.updateAddressStats(tx);

    // Keep only maxSize transactions
    if (this.transactions.length > this.maxSize) {
      const removed = this.transactions.pop();
      this.decrementAddressStats(removed);
    }
  }

  addTransactions(txs) {
    txs.forEach(tx => this.addTransaction(tx));
  }

  updateAddressStats(tx) {
    // Update sender stats
    if (!this.addressStats.has(tx.from)) {
      this.addressStats.set(tx.from, {
        address: tx.from,
        sentCount: 0,
        receivedCount: 0,
        lastActivity: 0,
        totalMessages: 0
      });
    }
    const senderStats = this.addressStats.get(tx.from);
    senderStats.sentCount++;
    senderStats.totalMessages++;
    senderStats.lastActivity = Math.max(senderStats.lastActivity, tx.timestamp);

    // Update recipient stats
    if (!this.addressStats.has(tx.to)) {
      this.addressStats.set(tx.to, {
        address: tx.to,
        sentCount: 0,
        receivedCount: 0,
        lastActivity: 0,
        totalMessages: 0
      });
    }
    const recipientStats = this.addressStats.get(tx.to);
    recipientStats.receivedCount++;
    recipientStats.totalMessages++;
    recipientStats.lastActivity = Math.max(recipientStats.lastActivity, tx.timestamp);
  }

  decrementAddressStats(tx) {
    // When removing old transactions, decrement stats
    if (this.addressStats.has(tx.from)) {
      const stats = this.addressStats.get(tx.from);
      stats.sentCount = Math.max(0, stats.sentCount - 1);
      stats.totalMessages = Math.max(0, stats.totalMessages - 1);
      if (stats.totalMessages === 0) {
        this.addressStats.delete(tx.from);
      }
    }
    if (this.addressStats.has(tx.to)) {
      const stats = this.addressStats.get(tx.to);
      stats.receivedCount = Math.max(0, stats.receivedCount - 1);
      stats.totalMessages = Math.max(0, stats.totalMessages - 1);
      if (stats.totalMessages === 0) {
        this.addressStats.delete(tx.to);
      }
    }
  }

  getLatestTransactions(limit = 100) {
    return this.transactions.slice(0, Math.min(limit, this.transactions.length));
  }

  getHotAddresses(limit = 50) {
    const now = Date.now() / 1000; // Current time in seconds

    // Calculate hotness score for each address
    const addressesWithScore = Array.from(this.addressStats.values()).map(stats => {
      // Recency factor: higher score for more recent activity
      const hoursSinceActivity = (now - stats.lastActivity) / 3600;
      const recencyMultiplier = Math.max(0.1, 1 / (1 + hoursSinceActivity / 24)); // Decay over 24 hours

      // Hotness = message count * recency multiplier
      const hotness = stats.totalMessages * recencyMultiplier;

      return {
        ...stats,
        hotness: hotness.toFixed(2),
        hoursAgo: hoursSinceActivity.toFixed(1)
      };
    });

    // Sort by hotness score descending
    addressesWithScore.sort((a, b) => b.hotness - a.hotness);

    return addressesWithScore.slice(0, limit);
  }

  getStats() {
    return {
      totalTransactions: this.transactions.length,
      maxSize: this.maxSize,
      uniqueAddresses: this.addressStats.size,
      oldestTimestamp: this.transactions.length > 0
        ? this.transactions[this.transactions.length - 1].timestamp
        : null,
      newestTimestamp: this.transactions.length > 0
        ? this.transactions[0].timestamp
        : null
    };
  }

  clear() {
    this.transactions = [];
    this.addressStats.clear();
  }
}

module.exports = TransactionStorage;
