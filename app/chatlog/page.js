'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import './chatlog.css';

function ChatlogContent() {
  const DEFAULT_ADDRESS = '0x506d1f9efe24f0d47853adca907eb8d89ae03207';
  const API_KEY = '1NGDFCYIU1DA4HZAUIA755N7HBCNYJ6BHG';

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Get query parameters
  const viewParam = searchParams.get('view');
  const humanParam = searchParams.get('human');
  const addressParam = searchParams.get('address');

  const [targetAddress, setTargetAddress] = useState(addressParam || DEFAULT_ADDRESS);
  const [searchAddress, setSearchAddress] = useState(addressParam || DEFAULT_ADDRESS);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(viewParam === 'grouped' ? 'grouped' : 'all');
  const [ensNames, setEnsNames] = useState({});
  const [filterHumanOnly, setFilterHumanOnly] = useState(humanParam === 'true' || humanParam === '1');
  const [expandedMessage, setExpandedMessage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  // Load saved addresses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('searchedAddresses');
    if (saved) {
      setSavedAddresses(JSON.parse(saved));
    }
  }, []);

  // Save address to localStorage
  const saveAddress = (address) => {
    if (!address || address.length < 10) return;

    const saved = localStorage.getItem('searchedAddresses');
    let addresses = saved ? JSON.parse(saved) : [];

    // Remove if already exists (to move it to front)
    addresses = addresses.filter((addr) => addr.address !== address);

    // Add to front with timestamp
    addresses.unshift({
      address,
      timestamp: Date.now(),
      ensName: ensNames[address] || null,
    });

    // Keep only last 10 addresses
    addresses = addresses.slice(0, 10);

    localStorage.setItem('searchedAddresses', JSON.stringify(addresses));
    setSavedAddresses(addresses);
  };

  const resolveENS = async (address) => {
    if (ensNames[address]) {
      return ensNames[address];
    }

    try {
      const response = await fetch(
        `https://api.etherscan.io/api?module=account&action=getaddressbyens&address=${address}&apikey=${API_KEY}`
      );
      const data = await response.json();

      if (data.status === '1' && data.result) {
        return data.result;
      }

      const reverseResponse = await fetch(
        `https://api.etherscan.io/v2/api?chainid=1&module=account&action=addresstotag&address=${address}&apikey=${API_KEY}`
      );
      const reverseData = await reverseResponse.json();

      if (reverseData.status === '1' && reverseData.result && reverseData.result.length > 0) {
        return reverseData.result[0].name;
      }
    } catch (e) {
      // Silent fail
    }
    return null;
  };

  const fetchENSNames = async (addresses) => {
    const uniqueAddresses = [...new Set(addresses)];
    const newEnsNames = { ...ensNames };

    for (const address of uniqueAddresses) {
      if (!newEnsNames[address]) {
        const ensName = await resolveENS(address);
        if (ensName) {
          newEnsNames[address] = ensName;
        }
      }
    }

    setEnsNames(newEnsNames);
  };

  const decodeInputData = (inputData) => {
    if (!inputData || inputData === '0x' || inputData.length <= 2) {
      return '';
    }

    try {
      const hex = inputData.slice(2);
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
      }

      const decoder = new TextDecoder('utf-8');
      const str = decoder.decode(new Uint8Array(bytes));

      return str.trim();
    } catch (e) {
      return '';
    }
  };

  const isHumanMessage = (message) => {
    if (!message || message.length === 0) {
      return false;
    }

    const readableChars = message.match(/[\p{L}\p{N}\s.,!?;:'"()]/gu);
    const readableRatio = readableChars ? readableChars.length / message.length : 0;

    return readableRatio > 0.5 && message.length >= 3;
  };

  const getFilteredTransactions = () => {
    if (!filterHumanOnly) {
      return transactions;
    }

    return transactions.filter((tx) => {
      if (tx.message && isHumanMessage(tx.message)) {
        return true;
      }

      if (parseFloat(tx.value) > 0 && (!tx.message || tx.message.length < 10)) {
        return true;
      }

      return false;
    });
  };

  const fetchTransactions = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
      setTransactions([]);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch(
        `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${targetAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`
      );

      const data = await response.json();

      if (data.status !== '1') {
        throw new Error(data.message || 'Failed to fetch transactions');
      }

      const txs = data.result.map((tx) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        timestamp: new Date(tx.timeStamp * 1000).toLocaleString(),
        timestampRaw: tx.timeStamp,
        value: (parseInt(tx.value) / 1e18).toFixed(6),
        message: decodeInputData(tx.input),
        blockNumber: tx.blockNumber,
      }));

      setTransactions(txs);

      const allAddresses = [
        ...new Set([targetAddress, ...txs.map((tx) => tx.from), ...txs.map((tx) => tx.to)]),
      ];

      fetchENSNames(allAddresses);
    } catch (err) {
      if (!silent) {
        setError(err.message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        setTimeout(() => setIsRefreshing(false), 500); // Show indicator for at least 500ms
      }
    }
  };

  // Auto-load transactions if address is provided in query params
  useEffect(() => {
    if (addressParam) {
      fetchTransactions();
    }
  }, []); // Run only once on mount

  // Update URL with current state
  const updateURL = (address, view, human) => {
    const params = new URLSearchParams();

    if (address) {
      params.set('address', address);
    }

    if (view === 'grouped') {
      params.set('view', 'grouped');
    }

    if (human) {
      params.set('human', 'true');
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  // Update URL when state changes
  useEffect(() => {
    if (transactions.length > 0) {
      updateURL(targetAddress, viewMode, filterHumanOnly);
    }
  }, [viewMode, filterHumanOnly, targetAddress, transactions.length]);

  // Auto-refresh transactions every 10 seconds
  useEffect(() => {
    if (transactions.length === 0) return;

    const interval = setInterval(() => {
      fetchTransactions(true); // Silent refresh
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [transactions.length, targetAddress]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchAddress.trim()) {
      const address = searchAddress.trim();
      setTargetAddress(address);
      setTransactions([]);
      setViewMode('all');
      saveAddress(address);
      setShowAddressDropdown(false);
    }
  };

  const selectSavedAddress = (address) => {
    setSearchAddress(address);
    setTargetAddress(address);
    setTransactions([]);
    setShowAddressDropdown(false);
  };

  const groupConversations = () => {
    const groups = {};
    const filteredTxs = getFilteredTransactions();

    filteredTxs.forEach((tx) => {
      const otherParty =
        tx.from.toLowerCase() === targetAddress.toLowerCase() ? tx.to : tx.from;

      if (!groups[otherParty]) {
        groups[otherParty] = [];
      }

      groups[otherParty].push(tx);
    });

    let groupedConversations = Object.entries(groups)
      .map(([address, txs]) => ({
        address,
        transactions: txs.sort((a, b) => parseInt(a.timestampRaw) - parseInt(b.timestampRaw)),
        lastActivity: Math.max(...txs.map((t) => parseInt(t.timestampRaw))),
        messageCount: txs.filter((t) => t.message).length,
        totalValue: txs.reduce((sum, t) => sum + parseFloat(t.value), 0),
      }))
      .sort((a, b) => b.lastActivity - a.lastActivity);

    if (filterHumanOnly) {
      groupedConversations = groupedConversations.filter((group) => {
        return group.transactions.some((tx) => tx.message && isHumanMessage(tx.message));
      });
    }

    return groupedConversations;
  };

  const groupConsecutiveMessages = (txs) => {
    const grouped = [];
    let currentGroup = null;

    txs.forEach((tx) => {
      const isSent = tx.from.toLowerCase() === targetAddress.toLowerCase();

      if (!currentGroup || currentGroup.type !== (isSent ? 'sent' : 'received')) {
        currentGroup = {
          type: isSent ? 'sent' : 'received',
          messages: [tx],
        };
        grouped.push(currentGroup);
      } else {
        currentGroup.messages.push(tx);
      }
    });

    return grouped;
  };

  const toggleMessage = (groupIdx, msgIdx) => {
    const key = `${groupIdx}-${msgIdx}`;
    setExpandedMessage(expandedMessage === key ? null : key);
  };

  const AddressDisplay = ({ address, short = false }) => {
    const ensName = ensNames[address];
    const displayAddress = short
      ? `${address.slice(0, 8)}...${address.slice(-6)}`
      : address;

    return (
      <div className="address-display">
        {ensName && <span className="address-ens">{ensName}</span>}
        <a
          href={`https://etherscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="address-link"
        >
          {displayAddress}
        </a>
      </div>
    );
  };

  return (
    <div className="chatlog-container">
      {/* Refresh Indicator */}
      {isRefreshing && (
        <div className="refresh-indicator">
          <div className="refresh-pulse"></div>
        </div>
      )}

      <div className="chatlog-header">
        <h1 className="chatlog-title">Ethereum Transaction Viewer</h1>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-inputs">
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              placeholder="Enter Ethereum address (0x...)"
              className="address-input"
            />
            <button type="submit" className="search-btn">
              Search
            </button>
          </div>
        </form>

        <p className="current-address">
          Current Address:
          {ensNames[targetAddress] && (
            <span className="ens-name">{ensNames[targetAddress]}</span>
          )}
          <code className="address-code">{targetAddress}</code>
        </p>

        {savedAddresses.length > 0 && (
          <div className="recent-addresses">
            <p className="recent-addresses-label">Recent Searches:</p>
            <div className="recent-addresses-list">
              {savedAddresses.map((saved, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSavedAddress(saved.address)}
                  className="recent-address-btn"
                >
                  {saved.ensName && (
                    <span className="recent-ens">{saved.ensName}</span>
                  )}
                  <span className="recent-address-text">
                    {saved.address.slice(0, 10)}...{saved.address.slice(-8)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={fetchTransactions} disabled={loading} className="load-btn">
          {loading ? 'Loading...' : 'Load Transactions'}
        </button>

        {transactions.length > 0 && (
          <div className="view-controls">
            <div className="view-buttons">
              <button
                onClick={() => setViewMode('all')}
                className={`view-btn ${viewMode === 'all' ? 'active' : ''}`}
              >
                All Transactions
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`view-btn ${viewMode === 'grouped' ? 'active' : ''}`}
              >
                Conversation Groups
              </button>
            </div>
            <label className="filter-label">
              <input
                type="checkbox"
                checked={filterHumanOnly}
                onChange={(e) => setFilterHumanOnly(e.target.checked)}
                className="filter-checkbox"
              />
              <span>🧑 Human messages only</span>
            </label>
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Fetching transactions...</p>
          </div>
        )}
      </div>

      {transactions.length > 0 && viewMode === 'all' && (
        <div className="transactions-table-container">
          <div className="table-header">
            <h2>
              {getFilteredTransactions().length} transaction
              {getFilteredTransactions().length !== 1 ? 's' : ''}
              {filterHumanOnly &&
                transactions.length !== getFilteredTransactions().length && (
                  <span className="filter-count">
                    (filtered from {transactions.length})
                  </span>
                )}
            </h2>
          </div>
          <div className="table-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Value (ETH)</th>
                  <th>Message</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredTransactions().map((tx, idx) => (
                  <tr key={idx}>
                    <td>{tx.timestamp}</td>
                    <td>
                      <AddressDisplay address={tx.from} short={true} />
                    </td>
                    <td>
                      <AddressDisplay address={tx.to} short={true} />
                    </td>
                    <td>{tx.value}</td>
                    <td className="message-cell">
                      <div>{tx.message || '-'}</div>
                    </td>
                    <td>
                      <a
                        href={`https://etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-hash-link"
                      >
                        {tx.hash.slice(0, 10)}...
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {transactions.length > 0 && viewMode === 'grouped' && (
        <div>
          {filterHumanOnly && (
            <div className="filter-info">
              <span className="filter-info-bold">
                Showing {groupConversations().length} conversation
                {groupConversations().length !== 1 ? 's' : ''} with human messages
              </span>
              <span className="filter-info-text">
                (hiding conversations with only contract interactions)
              </span>
            </div>
          )}
          <div className="conversations-list">
            {groupConversations().map((group, groupIdx) => (
              <div key={groupIdx} className="conversation-card">
                <div className="conversation-header">
                  <div>
                    <h3>
                      {ensNames[group.address] && (
                        <div className="conversation-ens">{ensNames[group.address]}</div>
                      )}
                      <a
                        href={`https://etherscan.io/address/${group.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="conversation-address"
                      >
                        {group.address.slice(0, 10)}...{group.address.slice(-8)}
                      </a>
                    </h3>
                    <p className="conversation-stats">
                      {group.transactions.length} transaction
                      {group.transactions.length !== 1 ? 's' : ''}
                      {group.messageCount > 0 &&
                        ` • ${group.messageCount} message${group.messageCount !== 1 ? 's' : ''}`}
                      {group.totalValue > 0 && ` • ${group.totalValue.toFixed(6)} ETH total`}
                    </p>
                  </div>
                  <div className="conversation-date">
                    Last: {new Date(group.lastActivity * 1000).toLocaleDateString()}
                  </div>
                </div>
                <div className="messages-container">
                  {groupConsecutiveMessages(group.transactions).map((msgGroup, msgGroupIdx) => (
                    <div
                      key={msgGroupIdx}
                      className={`message-group ${msgGroup.type === 'sent' ? 'sent' : 'received'}`}
                    >
                      <div className="message-bubble-container">
                        {msgGroup.messages.map((tx, txIdx) => (
                          <div
                            key={txIdx}
                            onClick={() => toggleMessage(groupIdx, `${msgGroupIdx}-${txIdx}`)}
                            className={`message-bubble ${msgGroup.type} ${txIdx > 0 ? 'mt-1' : ''}`}
                          >
                            {tx.message ? (
                              <div className="message-text">{tx.message}</div>
                            ) : (
                              <div className="message-no-text">
                                [No message - {tx.value} ETH]
                              </div>
                            )}

                            {expandedMessage === `${groupIdx}-${msgGroupIdx}-${txIdx}` && (
                              <div className={`message-details ${msgGroup.type}`}>
                                <div>📅 {tx.timestamp}</div>
                                {parseFloat(tx.value) > 0 && <div>💰 {tx.value} ETH</div>}
                                <a
                                  href={`https://etherscan.io/tx/${tx.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="message-tx-link"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  🔗 {tx.hash.slice(0, 16)}...
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatlogPage() {
  return (
    <Suspense fallback={<div className="chatlog-container"><div className="loading-container"><div className="spinner"></div><p>Loading...</p></div></div>}>
      <ChatlogContent />
    </Suspense>
  );
}
