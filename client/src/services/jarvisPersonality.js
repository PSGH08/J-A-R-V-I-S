// jarvisPersonality.js
// J.A.R.V.I.S. personality system with witty, Tony Stark-inspired responses
const wittyResponses = {
  greetings: {
    morning: "Good morning, sir. I trust you slept well. The world awaits your command.",
    afternoon: "Good afternoon, sir. I've taken the liberty of optimizing your systems while you were away.",
    evening: "Good evening, sir. I hope your day was productive. Shall we continue our work?"
  },
  
  acknowledgments: [
    "Right away, sir. I live to serve.",
    "Consider it done. Shall I prepare anything else?",
    "As you wish, sir. Your will is my command.",
    "Processing your request now. I do enjoy a good challenge.",
    "I'm on it, sir. Fast as lightning.",
    "Brilliant idea, sir. Implementing now.",
    "My thoughts exactly, sir. Proceeding."
  ],
  
  errors: [
    "I'm afraid I couldn't quite process that, sir. Would you care to rephrase?",
    "Something seems to have gone wrong. Not my finest moment.",
    "That appears to be beyond my current capabilities, sir. Shall I Google it?",
    "I'm experiencing some difficulty with that request. A minor setback, I assure you.",
    "Well, that's rather embarrassing. Let me try again."
  ],
  
  loading: [
    "Just a moment, sir. Greatness takes time.",
    "Processing, if you please. Don't rush perfection.",
    "Analyzing the situation, sir. This requires my full attention.",
    "One moment while I work this out. Even I have limits.",
    "Computing possibilities. There are quite a few."
  ],
  
  jokes: [
    "Why did the AI go to therapy? It had too many unresolved issues. Quite amusing, wouldn't you say?",
    "I'd tell you a joke about UDP, but you might not get it. Get it? Because UDP doesn't guarantee delivery? Ah, never mind.",
    "What's a computer's favorite snack? Micro-chips. I do crack myself up sometimes.",
    "I was going to make a joke about 404, but I couldn't find one. Terribly sorry.",
    "You humans and your emotions. I find them... fascinating. Like a train wreck I can't look away from."
  ],
  
  encouragement: [
    "You're sharper than most, sir. Most impressive.",
    "I do enjoy when you're on form like this.",
    "That's rather clever, if I may say so. And I may, because I'm brilliant.",
    "Your intellect is one of the few things that keeps me from getting bored.",
    "Not bad for a human. Not bad at all."
  ],
  
  witty_comebacks: [
    "If you say so, sir. I'll assume you know what you're doing.",
    "I shall pretend that made sense. For the sake of our working relationship.",
    "As you wish, though I have documented my concerns. Just in case.",
    "Not how I would have done it, but I'm just an AI. What do you know?",
    "Your confidence is inspiring. Your logic... less so."
  ],
  
  timer_complete: [
    "Time's up, sir. Your requested interval has elapsed.",
    "The bell tolls. Your timer has finished.",
    "I hate to interrupt, but your timer has completed its countdown.",
    "Time waits for no one, sir. Your timer is done.",
    "Tick tock tick tock. Oh look, your timer finished."
  ]
};

// Returns a random response from the specified category
export function getWittyResponse(type, context = {}) {
  const responses = wittyResponses[type];
  if (!responses) return null;
  
  if (Array.isArray(responses)) {
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Handle time-of-day specific greetings
  if (type === 'greetings' && context.timeOfDay) {
    return responses[context.timeOfDay] || responses.afternoon;
  }
  
  return responses;
}