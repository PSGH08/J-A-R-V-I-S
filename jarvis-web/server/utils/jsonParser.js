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
    try {
      const extracted = extractJSON(text);
      if (!extracted) return null;

      return JSON.parse(extracted);
    } catch {
      return null;
    }
  }
}

module.exports = { safeParseJSON };