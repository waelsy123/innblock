// Human message detection (same logic as broadcast page)
function isHumanMessage(message) {
  if (!message || message.length === 0) {
    return false;
  }

  // Exclude messages with too many non-ASCII or control characters
  const nonAsciiCount = (message.match(/[^\x20-\x7E]/g) || []).length;
  const nonAsciiRatio = nonAsciiCount / message.length;

  // Reject if more than 20% non-ASCII characters (garbled text)
  if (nonAsciiRatio > 0.2) {
    return false;
  }

  // Exclude messages that look like code
  const codePatterns = [
    /function\s*\(/i,
    /const\s+\w+\s*=/i,
    /let\s+\w+\s*=/i,
    /var\s+\w+\s*=/i,
    /=>\s*{/,
    /useEffect|useState|useCallback/i,
    /import\s+.*from/i,
    /export\s+(default|const)/i,
    /<\w+.*>/,  // HTML/JSX tags
    /^\s*[\d\s+\-*/]+\s*$/,  // Just numbers and operators
    /\w+\.\w+\(/,  // Method calls like console.log(
  ];

  if (codePatterns.some(pattern => pattern.test(message))) {
    return false;
  }

  // Count alphanumeric characters (letters and numbers)
  const alphanumericCount = (message.match(/[a-zA-Z0-9]/g) || []).length;
  const alphanumericRatio = alphanumericCount / message.length;

  // Require at least 50% alphanumeric characters
  if (alphanumericRatio < 0.5) {
    return false;
  }

  // Check for reasonable character ratio
  const readableChars = message.match(/[a-zA-Z0-9\s.,!?;:'"()\-]/g);
  const readableRatio = readableChars ? readableChars.length / message.length : 0;

  // More strict: require 80% readable characters
  return readableRatio > 0.8 && message.length >= 3;
}

function decodeMessage(input) {
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
}

module.exports = {
  isHumanMessage,
  decodeMessage
};
