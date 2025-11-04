// Import shared filter logic to ensure consistency with frontend
const { isHumanMessage, decodeMessage } = require('../shared/messageFilters');

module.exports = {
  isHumanMessage,
  decodeMessage
};
