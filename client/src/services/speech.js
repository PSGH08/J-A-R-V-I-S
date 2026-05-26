// services/speech.js
// J.A.R.V.I.S. speech synthesis service with British voice personality
import { getWittyResponse } from './jarvisPersonality';

let isSpeakingGlobal = false;
let onSpeakingChange = null;

export function setSpeakingCallback(callback) {
  onSpeakingChange = callback;
}

// JARVIS personality phrases for different situations
const jarvisPersonality = {
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

const PERSONALITY_CHANCE = 0.4;

// Get random personality phrase with configurable probability
function getPersonalityPhrase(type) {
  const phrases = jarvisPersonality[type];
  if (phrases && Math.random() < PERSONALITY_CHANCE) {
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
  return null;
}

// Priority list of natural sounding British male voices
const BRITISH_VOICE_PRIORITY = [
  "Google UK English Male",
  "Microsoft George",
  "Daniel",
  "British English Male",
  "UK English Male"
];

// Get available voices and prioritize British ones
async function getBestBritishVoice() {
  return new Promise((resolve) => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      let selectedVoice = null;
      
      // Search priority list first
      for (const priorityName of BRITISH_VOICE_PRIORITY) {
        const voice = voices.find(v => 
          v.name.includes(priorityName) && v.lang.includes('en-GB')
        );
        if (voice) {
          selectedVoice = voice;
          break;
        }
      }
      
      // Fallback: any British male voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang === 'en-GB' && v.name.includes('Male'));
      }
      
      // Last resort: any British voice
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

// Enhance text with British sophistication and natural pauses
function enhanceJarvisSpeech(text) {
  return text
    .replace(/I think/g, "I believe")
    .replace(/OK/g, "Quite right")
    .replace(/yes/g, "indeed")
    .replace(/got it/g, "understood")
    .replace(/no problem/g, "not an issue at all")
    .replace(/sorry/g, "I do apologise")
    .replace(/please/g, "if you would be so kind")
    .replace(/hey/g, "pardon me");
}

// Speak with personality and natural cadence
export async function speak(text, onStart, onEnd, options = {}) {
  speechSynthesis.cancel();
  
  let finalText = text;
  
  // Add personality based on context keywords
  if (options.addPersonality !== false) {
    let personalityType = null;
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('joke') || lowerText.includes('funny')) {
      personalityType = 'jokes';
    } else if (lowerText.includes('good job') || lowerText.includes('well done')) {
      personalityType = 'encouragement';
    } else if (lowerText.includes('stupid') || lowerText.includes('dumb')) {
      personalityType = 'witty_comebacks';
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
  
  const enhancedText = options.enhance !== false ? enhanceJarvisSpeech(finalText) : finalText;
  
  const utterance = new SpeechSynthesisUtterance(enhancedText);
  utterance.rate = options.rate || 0.88;
  utterance.pitch = options.pitch || 0.9;
  utterance.volume = options.volume || 1.0;
  
  // Slow down for longer sentences
  if (enhancedText.length > 50) {
    utterance.rate = 0.85;
  }
  
  const britishVoice = await getBestBritishVoice();
  if (britishVoice) {
    utterance.voice = britishVoice;
    console.log(`🎙️ Voice: ${britishVoice.name}`);
  }
  
  // Set speaking state callbacks
  utterance.onstart = () => {
    isSpeakingGlobal = true;
    if (onSpeakingChange) onSpeakingChange(true);
    onStart?.();
  };

  utterance.onend = () => {
    isSpeakingGlobal = false;
    if (onSpeakingChange) onSpeakingChange(false);
    onEnd?.();
  };

  utterance.onerror = (event) => {
    console.error("Speech error:", event);
    isSpeakingGlobal = false;
    if (onSpeakingChange) onSpeakingChange(false);
    onEnd?.();
  };
  
  speechSynthesis.speak(utterance);
  return utterance;
}

// Speak with dramatic pauses between sentences
export async function speakDramatically(text, options = {}) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  let delay = 0;
  
  for (const sentence of sentences) {
    setTimeout(async () => {
      await speak(sentence, null, null, options);
    }, delay);
    delay += (sentence.length / 10) * 1000 + 800;
  }
}

// Add a witty interjection before speaking
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

// Generate contextual response based on command and success state
export async function respondToCommand(command, success = true, additionalText = null) {
  let responseType;
  
  // Handle greetings with time-of-day awareness
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