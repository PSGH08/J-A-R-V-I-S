// Simple in-memory conversation storage
const conversations = new Map();

function addToConversationHistory(sessionId, message, role = 'user') {
  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, []);
  }
  
  const history = conversations.get(sessionId);
  history.push({ role, content: message });
  
  // Keep only last 30 messages
  if (history.length > 30) {
    conversations.set(sessionId, history.slice(-30));
  }
}

function getConversationHistory(sessionId) {
  return conversations.get(sessionId) || [];
}

function clearConversationHistory(sessionId) {
  conversations.delete(sessionId);
}

function formatConversationForAI(sessionId) {
  const history = getConversationHistory(sessionId);
  let formatted = "Previous conversation:\n";
  
  for (const msg of history.slice(-10)) { // Last 10 messages for context
    formatted += `${msg.role === 'user' ? 'User' : 'JARVIS'}: ${msg.content}\n`;
  }
  
  return formatted;
}

module.exports = {
  addToConversationHistory,
  getConversationHistory,
  clearConversationHistory,
  formatConversationForAI
};