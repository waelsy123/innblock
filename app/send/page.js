'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import './send.css';

export default function SendMessagePage() {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const API_KEY = '1NGDFCYIU1DA4HZAUIA755N7HBCNYJ6BHG';

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendTransaction, data: hash, isPending, error: sendError } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [recipient, setRecipient] = useState(ZERO_ADDRESS);
  const [message, setMessage] = useState('');
  const [ethAmount, setEthAmount] = useState('0');
  const [ensNames, setEnsNames] = useState({});

  const resolveENS = async (address) => {
    if (!address || address === ZERO_ADDRESS) return null;
    if (ensNames[address]) return ensNames[address];

    try {
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

  // Fetch ENS for connected wallet address
  useEffect(() => {
    if (address) {
      resolveENS(address).then(ens => {
        if (ens) {
          setEnsNames(prev => ({ ...prev, [address]: ens }));
        }
      });
    }
  }, [address]);

  // Fetch ENS for recipient address
  useEffect(() => {
    if (recipient && recipient !== ZERO_ADDRESS) {
      resolveENS(recipient).then(ens => {
        if (ens) {
          setEnsNames(prev => ({ ...prev, [recipient]: ens }));
        }
      });
    }
  }, [recipient]);

  const encodeMessage = (text) => {
    return '0x' + Array.from(text)
      .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      const data = encodeMessage(message);

      sendTransaction({
        to: recipient,
        value: parseEther(ethAmount || '0'),
        data: data
      });
    } catch (error) {
      console.error('Error sending transaction:', error);
    }
  };

  const resetForm = () => {
    setMessage('');
    setEthAmount('0');
    setRecipient(ZERO_ADDRESS);
  };

  return (
    <div className="send-container">
      <div className="send-header">
        <h1 className="send-title">Send Message</h1>
        <p className="send-subtitle">Broadcast your message on-chain</p>

        {!isConnected ? (
          <div className="connect-section">
            <p className="connect-prompt">Connect your wallet to send messages</p>
            <div className="connectors-list">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  className="connector-btn"
                >
                  Connect {connector.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="wallet-info">
            <div className="connected-address">
              <span className="address-label">Connected:</span>
              {ensNames[address] && (
                <span className="ens-name">{ensNames[address]}</span>
              )}
              <code className="address-code">{address}</code>
            </div>
            <button onClick={() => disconnect()} className="disconnect-btn">
              Disconnect
            </button>
          </div>
        )}
      </div>

      {isConnected && (
        <div className="send-form-container">
          <form onSubmit={handleSendMessage} className="send-form">
            <div className="form-group">
              <label htmlFor="recipient" className="form-label">
                Recipient Address
              </label>
              <input
                id="recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="form-input"
              />
              {ensNames[recipient] && recipient !== ZERO_ADDRESS && (
                <p className="form-ens">📛 {ensNames[recipient]}</p>
              )}
              <p className="form-hint">
                {recipient === ZERO_ADDRESS ? 'Zero address (burn address)' : 'Enter recipient address'}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="message" className="form-label">
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={5}
                className="form-textarea"
                required
              />
              <p className="form-hint">{message.length} characters</p>
            </div>

            <div className="form-group">
              <label htmlFor="amount" className="form-label">
                ETH Amount (optional)
              </label>
              <input
                id="amount"
                type="text"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                placeholder="0.0"
                className="form-input"
              />
              <p className="form-hint">Amount of ETH to send with message</p>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                disabled={isPending || isConfirming}
                className="send-btn"
              >
                {isPending ? 'Confirming...' : isConfirming ? 'Sending...' : 'Send Message'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="reset-btn"
              >
                Reset
              </button>
            </div>
          </form>

          {sendError && (
            <div className="error-msg">
              Error: {sendError.message}
            </div>
          )}

          {hash && (
            <div className="success-msg">
              <p className="success-title">Transaction Submitted!</p>
              <a
                href={`https://etherscan.io/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                View on Etherscan: {hash.slice(0, 16)}...
              </a>
              {isConfirming && <p className="confirming-text">Waiting for confirmation...</p>}
              {isSuccess && (
                <p className="success-text">✓ Transaction confirmed!</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
