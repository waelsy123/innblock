// Human message detection (matches chatlog page logic for consistency)
function isHumanMessage(message) {
  if (!message || message.length === 0) {
    return false;
  }

  // Use the same logic as chatlog page - more inclusive and supports Unicode
  // Matches letters, numbers, spaces, and common punctuation from any language
  const readableChars = message.match(/[\p{L}\p{N}\s.,!?;:'"()]/gu);
  const readableRatio = readableChars ? readableChars.length / message.length : 0;

  // Require at least 50% readable characters and minimum 3 chars
  return readableRatio > 0.5 && message.length >= 3;
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
