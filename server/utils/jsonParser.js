// server/utils/jsonParser.js
// Safely extracts and parses JSON from text that may contain extra content
function extractJSON(text) {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) return null;

  return text.slice(firstBrace, lastBrace + 1);
}

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    const extracted = extractJSON(text);
    if (!extracted) return null;
    
    try {
      return JSON.parse(extracted);
    } catch {
      return null;
    }
  }
}

module.exports = { safeParseJSON };