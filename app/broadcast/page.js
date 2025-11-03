'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import './broadcast.css';

function BroadcastReelContent() {
  const DEFAULT_ADDRESS = '0x506d1f9efe24f0d47853adca907eb8d89ae03207';
  const API_KEY = '1NGDFCYIU1DA4HZAUIA755N7HBCNYJ6BHG';

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const addressParam = searchParams.get('address');

  const [targetAddress, setTargetAddress] = useState(addressParam || DEFAULT_ADDRESS);
  const [searchAddress, setSearchAddress] = useState(addressParam || DEFAULT_ADDRESS);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ensNames, setEnsNames] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);

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

    addresses = addresses.filter((addr) => addr.address !== address);

    addresses.unshift({
      address,
      timestamp: Date.now(),
      ensName: ensNames[address] || null,
    });

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

  const isHumanMessage = (input) => {
    if (!input || input === '0x') return false;

    try {
      const decoded = input.startsWith('0x') ? input.slice(2) : input;
      const text = decoded.match(/.{1,2}/g)?.map(byte => {
        const code = parseInt(byte, 16);
        return code >= 32 && code <= 126 ? String.fromCharCode(code) : '';
      }).join('') || '';

      const cleanText = text.replace(/\0/g, '').trim();
      if (cleanText.length < 3) return false;

      const printableChars = cleanText.replace(/[^a-zA-Z0-9\s.,!?;:'"()\-]/g, '').length;
      return printableChars / cleanText.length > 0.7;
    } catch (e) {
      return false;
    }
  };

  const decodeMessage = (input) => {
    if (!input || input === '0x') return '';

    try {
      const decoded = input.startsWith('0x') ? input.slice(2) : input;
      const text = decoded.match(/.{1,2}/g)?.map(byte =>
        String.fromCharCode(parseInt(byte, 16))
      ).join('') || '';

      return text.replace(/\0/g, '').trim();
    } catch (e) {
      return '';
    }
  };

  const fetchBroadcasts = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch(
        `https://api.etherscan.io/api?module=account&action=txlist&address=${targetAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === '1' && Array.isArray(data.result)) {
        // Filter: only transactions sent FROM this wallet with human messages
        const sentWithMessages = data.result
          .filter(tx => {
            const isSentByWallet = tx.from.toLowerCase() === targetAddress.toLowerCase();
            const hasHumanMessage = isHumanMessage(tx.input);
            return isSentByWallet && hasHumanMessage;
          })
          .map(tx => ({
            ...tx,
            message: decodeMessage(tx.input),
            timestamp: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString(),
            timestampRaw: tx.timeStamp,
            value: (parseInt(tx.value) / 1e18).toFixed(6)
          }));

        setBroadcasts(sentWithMessages);

        // Fetch ENS names for all recipients
        const recipients = sentWithMessages.map(tx => tx.to);
        await fetchENSNames([targetAddress, ...recipients]);

      } else {
        throw new Error(data.message || 'Failed to fetch transactions');
      }
    } catch (err) {
      if (!silent) {
        setError(err.message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  // Auto-load broadcasts if address is provided in query params
  useEffect(() => {
    if (addressParam) {
      fetchBroadcasts();
    }
  }, []);

  // Update URL with current state
  const updateURL = (address) => {
    const params = new URLSearchParams();
    if (address) {
      params.set('address', address);
    }
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  // Update URL when address changes
  useEffect(() => {
    if (broadcasts.length > 0) {
      updateURL(targetAddress);
    }
  }, [targetAddress, broadcasts.length]);

  // Auto-refresh broadcasts every 10 seconds
  useEffect(() => {
    if (broadcasts.length === 0) return;

    const interval = setInterval(() => {
      fetchBroadcasts(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [broadcasts.length, targetAddress]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchAddress.trim()) {
      const address = searchAddress.trim();
      setTargetAddress(address);
      setBroadcasts([]);
      saveAddress(address);
      setTimeout(() => fetchBroadcasts(), 0);
    }
  };

  const selectSavedAddress = (address) => {
    setSearchAddress(address);
    setTargetAddress(address);
    setBroadcasts([]);
    setTimeout(() => fetchBroadcasts(), 0);
  };

  const AddressDisplay = ({ address }) => {
    const ensName = ensNames[address];
    const displayAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

    return (
      <div className="address-display">
        {ensName && <div className="address-ens">{ensName}</div>}
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
    <div className="broadcast-container">
      {isRefreshing && (
        <div className="refresh-indicator">
          <div className="refresh-pulse"></div>
        </div>
      )}

      <div className="broadcast-header">
        <h1 className="broadcast-title">Broadcast Reel</h1>
        <p className="broadcast-subtitle">View all messages sent from this wallet</p>

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
          Broadcasting from:
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

        {error && <div className="error-msg">{error}</div>}

        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading broadcasts...</p>
          </div>
        )}
      </div>

      {!loading && broadcasts.length > 0 && (
        <div className="broadcasts-grid">
          <div className="broadcasts-count">
            {broadcasts.length} broadcast{broadcasts.length !== 1 ? 's' : ''} found
          </div>
          {broadcasts.map((tx, idx) => (
            <div key={idx} className="broadcast-card">
              <div className="broadcast-message">{tx.message}</div>
              <div className="broadcast-meta">
                <div className="broadcast-to">
                  <span className="meta-label">To:</span>
                  <AddressDisplay address={tx.to} />
                </div>
                <div className="broadcast-time">{tx.timestamp}</div>
                <div className="broadcast-value">
                  {parseFloat(tx.value) > 0 && (
                    <span>{tx.value} ETH</span>
                  )}
                </div>
                <a
                  href={`https://etherscan.io/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="broadcast-tx-link"
                >
                  View TX
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && broadcasts.length === 0 && targetAddress && (
        <div className="no-broadcasts">
          <p>No broadcasts found for this address.</p>
          <p className="hint">Only messages sent FROM this wallet are shown.</p>
        </div>
      )}
    </div>
  );
}

export default function BroadcastReelPage() {
  return (
    <Suspense fallback={<div className="broadcast-container"><div className="loading-container"><div className="spinner"></div><p>Loading...</p></div></div>}>
      <BroadcastReelContent />
    </Suspense>
  );
}
