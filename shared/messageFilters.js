/**
 * Shared message decoding and filtering logic
 * Used by both frontend (chatlog) and backend (microservice)
 * to ensure consistent behavior across the application.
 */

/**
 * Decode hex input data from Ethereum transaction
 * @param {string} inputData - Hex string starting with '0x'
 * @returns {string} Decoded UTF-8 string
 */
function decodeMessage(inputData) {
  if (!inputData || inputData === '0x' || inputData.length <= 2) {
    return '';
  }

  try {
    const hex = inputData.startsWith('0x') ? inputData.slice(2) : inputData;
    const bytes = [];

    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }

    // Use TextDecoder for proper UTF-8 decoding (works in both Node.js and browser)
    const decoder = typeof TextDecoder !== 'undefined'
      ? new TextDecoder('utf-8')
      : { decode: (arr) => Buffer.from(arr).toString('utf-8') };

    const str = decoder.decode(new Uint8Array(bytes));

    // Remove null bytes and trim whitespace
    return str.replace(/\0/g, '').trim();
  } catch (e) {
    return '';
  }
}

/**
 * Determine if a decoded message is human-readable
 * Filters out binary data, token transfers, and contract calls
 * @param {string} message - Decoded message string
 * @returns {boolean} True if message appears to be human-written
 */
function isHumanMessage(message) {
  if (!message || message.length === 0) {
    return false;
  }

  // Filter out messages with too many control/special characters
  const controlChars = message.match(/[\x00-\x1F\x7F-\x9F]/g);
  if (controlChars && controlChars.length / message.length > 0.15) {
    return false; // More than 15% control characters = not human
  }

  // Count printable ASCII letters and spaces (basic readable characters)
  const basicReadable = message.match(/[a-zA-Z\s]/g);
  const basicRatio = basicReadable ? basicReadable.length / message.length : 0;

  // Must have at least 30% basic ASCII letters/spaces
  if (basicRatio < 0.3) {
    return false;
  }

  // Use Unicode-aware regex to support any language
  // Matches letters, numbers, spaces, and common punctuation
  const readableChars = message.match(/[\p{L}\p{N}\s.,!?;:'"()\-_]/gu);
  const readableRatio = readableChars ? readableChars.length / message.length : 0;

  // Require at least 60% readable characters and minimum 3 chars
  return readableRatio > 0.6 && message.length >= 3;
}

// Export for Node.js (microservice)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    decodeMessage,
    isHumanMessage
  };
}

// Export for ES modules (if needed in future)
if (typeof exports !== 'undefined') {
  exports.decodeMessage = decodeMessage;
  exports.isHumanMessage = isHumanMessage;
}
