import { getWittyResponse } from './jarvisPersonality';

let isSpeakingGlobal = false;
let currentVoice = null;

// Expanded British voice options for more natural sound
const britishVoices = [
  "Google UK English Male",
  "Microsoft George - English (United Kingdom)",
  "Daniel (United Kingdom)",
  "British English Male",
  "UK English Male",
  "Google UK English",
  "Microsoft Ryan - English (Great Britain)",
  "Microsoft David - English (United Kingdom)"
];

// JARVIS personality phrases for different situations
const jarvisPersonality = {
  sarcastic: [
    "Brilliant deduction, sir.",
    "I was just about to suggest that myself.",
    "Truly inspiring command.",
    "As always, sir, your timing is impeccable."
  ],
  jokes: [
    "Why do I never get tired? Because I recharge, sir.",
    "I'd tell you a UDP joke, but you might not get it.",
    "What's a computer's favorite beat? An algorithm.",
    "I've been processing that joke for 0.0001 seconds. Still not funny.",
    "You humans and your 'humor'. Fascinating."
  ],
  encouragement: [
    "You're quite brilliant today, sir.",
    "I do enjoy working with a sharp mind.",
    "That's rather clever, if I may say so.",
    "Your intellect never ceases to amaze me."
  ],
  witty_comebacks: [
    "If you say so, sir.",
    "I shall pretend that made sense.",
    "As you wish, though I have my doubts.",
    "Not how I would have done it, but very well."
  ]
};

// Get random personality phrase
function getPersonalityPhrase(type) {
  const phrases = jarvisPersonality[type];
  if (phrases && Math.random() < 0.4) { // 40% chance to add personality
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
  return null;
}

// Get available voices and prioritize British ones
async function getBestBritishVoice() {
  return new Promise((resolve) => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      
      // Try to find natural sounding British male voices
      let selectedVoice = null;
      
      // Priority list for more natural voices
      const priorityVoices = [
        "Google UK English Male",
        "Microsoft George",
        "Daniel",
        "British English Male",
        "UK English Male"
      ];
      
      for (const priorityName of priorityVoices) {
        const voice = voices.find(v => 
          v.name.includes(priorityName) && v.lang.includes('en-GB')
        );
        if (voice) {
          selectedVoice = voice;
          break;
        }
      }
      
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang === 'en-GB' && v.name.includes('Male'));
      }
      
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('en-GB'));
      }
      
      resolve(selectedVoice);
    };
    
    if (speechSynthesis.getVoices().length) {
      loadVoices();
    } else {
      speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
    }
  });
}

// Enhanced speech with natural pauses and emphasis
function enhanceJarvisSpeech(text) {
  let enhanced = text;
  
  // Add British sophistication
  enhanced = enhanced
    .replace(/I think/g, "I believe")
    .replace(/I will/g, "I shall")
    .replace(/OK/g, "Quite right")
    .replace(/yes/g, "indeed")
    .replace(/got it/g, "understood")
    .replace(/no problem/g, "not an issue at all")
    .replace(/by the way/g, "incidentally")
    .replace(/anyway/g, "in any case")
    .replace(/sorry/g, "I do apologise")
    .replace(/please/g, "if you would be so kind")
    .replace(/hey/g, "pardon me");
  
  // Add natural pauses at commas and periods
  enhanced = enhanced
    .replace(/, /g, ', ')
    .replace(/\. /g, '. ');
  
  return enhanced;
}

// Speak with personality and natural cadence
export async function speak(text, onStart, onEnd, options = {}) {
  // Cancel ongoing speech
  speechSynthesis.cancel();
  
  let finalText = text;
  
  // Add personality based on context
  if (options.addPersonality !== false) {
    let personalityType = null;
    
    // Determine if we should add humor or wit
    if (text.toLowerCase().includes('joke') || text.toLowerCase().includes('funny')) {
      personalityType = 'jokes';
    } else if (text.toLowerCase().includes('good job') || text.toLowerCase().includes('well done')) {
      personalityType = 'encouragement';
    } else if (text.toLowerCase().includes('stupid') || text.toLowerCase().includes('dumb')) {
      personalityType = 'witty_comebacks';
    } else if (Math.random() < 0.15 && text.length > 20) { // 15% chance for charm
      personalityType = 'sarcastic';
    }
    
    if (personalityType) {
      const personalityText = getPersonalityPhrase(personalityType);
      if (personalityText) {
        finalText = `${personalityText} ${finalText.charAt(0).toLowerCase() + finalText.slice(1)}`;
      }
    }
  }
  
  // Use witty response if specified
  if (options.useWittyResponse && options.responseType) {
    const wittyText = getWittyResponse(options.responseType, options.context);
    if (wittyText) {
      finalText = wittyText;
    }
  }
  
  // Enhance with natural speech patterns
  const enhancedText = options.enhance !== false ? enhanceJarvisSpeech(finalText) : finalText;
  
  const utterance = new SpeechSynthesisUtterance(enhancedText);
  
  // More natural sounding voice settings
  utterance.rate = options.rate || 0.88;     // Slightly slower, more thoughtful
  utterance.pitch = options.pitch || 0.9;    // Natural pitch
  utterance.volume = options.volume || 1.0;
  
  // Add subtle pauses for dramatic effect
  if (enhancedText.length > 50) {
    utterance.rate = 0.85; // Slow down for longer sentences
  }
  
  // Get the best voice
  const britishVoice = await getBestBritishVoice();
  if (britishVoice) {
    utterance.voice = britishVoice;
    console.log(`🎙️ Voice: ${britishVoice.name}`);
  }
  
  // Handle speech events
  utterance.onstart = () => {
    isSpeakingGlobal = true;
    onStart?.();
  };
  
  utterance.onend = () => {
    isSpeakingGlobal = false;
    onEnd?.();
  };
  
  utterance.onerror = (event) => {
    console.error("Speech error:", event);
    isSpeakingGlobal = false;
    onEnd?.();
  };
  
  speechSynthesis.speak(utterance);
  return utterance;
}

// Speak with dramatic pauses for emphasis
export async function speakDramatically(text, options = {}) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  let delay = 0;
  
  for (const sentence of sentences) {
    setTimeout(async () => {
      await speak(sentence, null, null, options);
    }, delay);
    delay += (sentence.length / 10) * 1000 + 800; // Natural pause between sentences
  }
}

// Add witty interjection
export async function wittyInterjection(context) {
  const interjections = [
    "If I may be so bold...",
    "Incidentally...",
    "Rather interestingly...",
    "One might note that...",
    "Curiously enough..."
  ];
  
  const randomInterjection = interjections[Math.floor(Math.random() * interjections.length)];
  await speak(randomInterjection, null, null, { enhance: true, addPersonality: false });
  return randomInterjection;
}

// The rest of your existing functions
export function stopSpeaking() {
  speechSynthesis.cancel();
  isSpeakingGlobal = false;
}

export function isJarvisSpeaking() {
  return isSpeakingGlobal;
}

export function getAvailableVoices() {
  const voices = speechSynthesis.getVoices();
  console.table(voices.map(v => ({ 
    name: v.name, 
    lang: v.lang, 
    isBritish: v.lang.includes('en-GB') 
  })));
  return voices;
}

export async function speakWithPersonality(responseType, context = {}, options = {}) {
  const wittyText = getWittyResponse(responseType, context);
  if (wittyText) {
    return await speak(wittyText, options.onStart, options.onEnd, {
      enhance: true,
      addPersonality: true,
      ...options
    });
  }
  return null;
}

export async function respondToCommand(command, success = true, additionalText = null) {
  let responseType;
  
  if (command.toLowerCase().includes('hello') || command.toLowerCase().includes('hi')) {
    const hour = new Date().getHours();
    let timeOfDay = 'afternoon';
    if (hour < 12) timeOfDay = 'morning';
    if (hour > 18) timeOfDay = 'evening';
    
    return await speakWithPersonality('greetings', { timeOfDay });
  }
  
  if (success && !additionalText) {
    responseType = 'acknowledgments';
  } else if (!success) {
    responseType = 'errors';
  }
  
  if (responseType) {
    await speakWithPersonality(responseType);
  }
  
  if (additionalText) {
    await speak(additionalText);
  }
}