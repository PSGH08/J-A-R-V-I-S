export function containsWakeWord(text) {
  const lowerText = text.toLowerCase().trim();
  
  // Tony Stark / Iron Man inspired wake words and phrases
  const ironManPhrases = [
    // Standard wake words
    'jarvis',
    'hey jarvis',
    'okay jarvis',
    
    // Tony Stark style wake phrases
    'wake up daddy\'s home',
    'daddy\'s home',
    'jarvis wake up',
    'jarvis you there',
    'rise and shine jarvis',
    'time to work jarvis',
    'suit up jarvis',
    'jarvis suit up',
    'jarvis we got work to do',
    'jarvis status report',
    'jarvis talk to me',
    'let\'s go jarvis',
    'jarvis let\'s go',
    'jarvis i need you',
    'jarvis hit it',
    'jarvis do your thing',
    'jarvis fire up',
    'jarvis get ready',
    'wakey wakey jarvis',
    'jarvis it\'s showtime',
    'jarvis we\'re live',
    'jarvis engage',
    'jarvis activate',
    'jarvis system check',
    'jarvis power up',
    'jarvis lock and load',
    'jarvis let\'s do this',
    'jarvis game time',
    'jarvis we\'re up',
    'jarvis on me',
    'jarvis roll out',
    'jarvis initiate',
    'jarvis boot up',
    'jarvis come online',
    'jarvis report in',
    'jarvis i\'m back',
    'jarvis good to go',
  ];
  
  // Check if the full text ends with "jarvis" (allows "hello jarvis", etc.)
  if (lowerText.endsWith('jarvis')) {
    return true;
  }
  
  // Check exact matches from the phrases list
  if (ironManPhrases.includes(lowerText)) {
    return true;
  }
  
  // Check if text starts with any of these followed by a space
  const shortPhrases = [
    'jarvis',
    'hey jarvis',
    'okay jarvis',
    'jarvis wake up',
    'jarvis you there',
    'jarvis i need',
    'jarvis do your',
    'jarvis let\'s',
    'jarvis hit it',
    'jarvis fire up',
    'jarvis get ready',
    'jarvis it\'s',
    'jarvis we\'re',
    'jarvis engage',
    'jarvis activate',
    'jarvis system',
    'jarvis power up',
    'jarvis lock and',
    'jarvis on me',
    'jarvis roll out',
    'jarvis initiate',
    'jarvis boot up',
    'jarvis come online',
    'jarvis report',
    'jarvis i\'m back',
    'jarvis good to go',
    'let\'s go jarvis',
  ];
  
  return shortPhrases.some(phrase => lowerText.startsWith(phrase + ' '));
}

export function extractCommand(text) {
  const lowerText = text.toLowerCase().trim();
  
  // Handle "wake up daddy's home" and similar complete phrases
  const completePhrases = [
    'wake up daddy\'s home',
    'daddy\'s home',
    'jarvis wake up',
    'jarvis you there',
    'rise and shine jarvis',
    'time to work jarvis',
    'suit up jarvis',
    'jarvis suit up',
    'jarvis we got work to do',
    'jarvis status report',
    'jarvis talk to me',
    'let\'s go jarvis',
    'jarvis let\'s go',
    'jarvis i need you',
    'jarvis hit it',
    'jarvis do your thing',
    'jarvis fire up',
    'jarvis get ready',
    'wakey wakey jarvis',
    'jarvis it\'s showtime',
    'jarvis we\'re live',
    'jarvis engage',
    'jarvis activate',
    'jarvis system check',
    'jarvis power up',
    'jarvis lock and load',
    'jarvis let\'s do this',
    'jarvis game time',
    'jarvis we\'re up',
    'jarvis on me',
    'jarvis roll out',
    'jarvis initiate',
    'jarvis boot up',
    'jarvis come online',
    'jarvis report in',
    'jarvis i\'m back',
    'jarvis good to go',
  ];
  
  // If the entire text is just a wake phrase, return empty string
  if (completePhrases.includes(lowerText)) {
    return '';
  }
  
  // If text is just "jarvis" (or ends with jarvis), return empty string
  if (lowerText === 'jarvis' || lowerText === 'hey jarvis' || lowerText === 'okay jarvis') {
    return '';
  }
  
  let command = lowerText;
  
  // Remove known wake word prefixes
  const prefixesToRemove = [
    /^jarvis\s+/i,
    /^hey\s+jarvis\s+/i,
    /^okay\s+jarvis\s+/i,
    /^wake\s+up\s+daddy'?s\s+home\s+/i,
    /^daddy'?s\s+home\s+/i,
    /^jarvis\s+wake\s+up\s+/i,
    /^jarvis\s+you\s+there\s+/i,
    /^rise\s+and\s+shine\s+jarvis\s+/i,
    /^time\s+to\s+work\s+jarvis\s+/i,
    /^suit\s+up\s+jarvis\s+/i,
    /^jarvis\s+suit\s+up\s+/i,
    /^jarvis\s+we\s+got\s+work\s+to\s+do\s+/i,
    /^jarvis\s+status\s+report\s+/i,
    /^jarvis\s+talk\s+to\s+me\s+/i,
    /^let'?s\s+go\s+jarvis\s+/i,
    /^jarvis\s+let'?s\s+go\s+/i,
    /^jarvis\s+i\s+need\s+you\s+/i,
    /^jarvis\s+hit\s+it\s+/i,
    /^jarvis\s+do\s+your\s+thing\s+/i,
    /^jarvis\s+fire\s+up\s+/i,
    /^jarvis\s+get\s+ready\s+/i,
    /^wakey\s+wakey\s+jarvis\s+/i,
    /^jarvis\s+it'?s\s+showtime\s+/i,
    /^jarvis\s+we'?re\s+live\s+/i,
    /^jarvis\s+engage\s+/i,
    /^jarvis\s+activate\s+/i,
    /^jarvis\s+system\s+check\s+/i,
    /^jarvis\s+power\s+up\s+/i,
    /^jarvis\s+lock\s+and\s+load\s+/i,
    /^jarvis\s+let'?s\s+do\s+this\s+/i,
    /^jarvis\s+game\s+time\s+/i,
    /^jarvis\s+we'?re\s+up\s+/i,
    /^jarvis\s+on\s+me\s+/i,
    /^jarvis\s+roll\s+out\s+/i,
    /^jarvis\s+initiate\s+/i,
    /^jarvis\s+boot\s+up\s+/i,
    /^jarvis\s+come\s+online\s+/i,
    /^jarvis\s+report\s+in\s+/i,
    /^jarvis\s+i'?m\s+back\s+/i,
    /^jarvis\s+good\s+to\s+go\s+/i,
  ];
  
  for (const prefix of prefixesToRemove) {
    command = command.replace(prefix, '');
  }
  
  return command.trim();
}

// ADD THESE MISSING FUNCTIONS:
export function resetWakeWord() {
  // Simple reset function
  return;
}

export function isWakeWordDetected() {
  return false;
}