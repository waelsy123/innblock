'use client';

import { useState, useEffect } from 'react';
import './hot-chatters.css';

export default function HotChatters() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    fetchHotAddresses();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHotAddresses, 30000);
    return () => clearInterval(interval);
  }, [limit]);

  const fetchHotAddresses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/hot-addresses?limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch hot addresses');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setAddresses(data.data);
        setError(null);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching hot addresses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (address) => {
    navigator.clipboard.writeText(address);
  };

  return (
    <div className="hot-chatters-container">
      <div className="hot-chatters-header">
        <h1>🔥 Hot Chatters</h1>
        <p className="subtitle">Top addresses ranked by message activity and recency</p>
      </div>

      <div className="controls">
        <div className="limit-control">
          <label>Show top:</label>
          <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))}>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchHotAddresses}>
          Refresh
        </button>
      </div>

      {loading && addresses.length === 0 && (
        <div className="loading">Loading hot chatters...</div>
      )}

      {error && (
        <div className="error">
          <p>Error: {error}</p>
          <p className="error-hint">Make sure the microservice is running on port 3001</p>
        </div>
      )}

      {!loading && addresses.length === 0 && !error && (
        <div className="no-data">
          <p>No hot chatters found yet.</p>
          <p>The microservice is collecting data from the blockchain.</p>
        </div>
      )}

      {addresses.length > 0 && (
        <div className="addresses-list">
          <div className="list-header">
            <div className="rank-col">Rank</div>
            <div className="address-col">Address</div>
            <div className="stats-col">Messages</div>
            <div className="activity-col">Activity</div>
            <div className="hotness-col">Hotness</div>
          </div>

          {addresses.map((addr, index) => (
            <div key={addr.address} className="address-row">
              <div className="rank-col">
                <span className={`rank ${index < 3 ? 'top-three' : ''}`}>
                  #{index + 1}
                </span>
              </div>

              <div className="address-col">
                <span
                  className="address-text"
                  title={addr.address}
                  onClick={() => copyToClipboard(addr.address)}
                >
                  {formatAddress(addr.address)}
                </span>
                <a
                  href={`https://etherscan.io/address/${addr.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="etherscan-link"
                >
                  ↗
                </a>
              </div>

              <div className="stats-col">
                <div className="stat-item">
                  <span className="stat-label">Sent:</span>
                  <span className="stat-value">{addr.sentCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Received:</span>
                  <span className="stat-value">{addr.receivedCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value highlight">{addr.totalMessages}</span>
                </div>
              </div>

              <div className="activity-col">
                <span className="hours-ago">{addr.hoursAgo}h ago</span>
              </div>

              <div className="hotness-col">
                <div className="hotness-bar-container">
                  <div
                    className="hotness-bar"
                    style={{ width: `${Math.min(100, (addr.hotness / addresses[0].hotness) * 100)}%` }}
                  />
                  <span className="hotness-value">{addr.hotness}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="info-box">
        <h3>About Hotness Score</h3>
        <p>
          Addresses are ranked by their "hotness" score, which combines message count and recency.
          Recent activity is weighted more heavily, with scores decaying over 24 hours.
        </p>
        <p className="formula">
          Hotness = Total Messages × Recency Multiplier
        </p>
      </div>
    </div>
  );
}
