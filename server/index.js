// server/index.js
// Main J.A.R.V.I.S. server - Socket.IO, AI integration, command routing, and system monitoring
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { queryOllama } = require("./ai/ollamaClient");
const { SYSTEM_PROMPT } = require("./core/schema");
const { routeCommand } = require("./core/commandRouter");
const { startReminderChecker } = require("./commands/reminders");
const { getSystemStats } = require("./core/systemStats");
const { setMusicSocket, setMusicStateCallback } = require("./commands/music");
const clapDetector = require("./services/clapDetector");

const app = express();
const server = http.createServer(app);

const PORT = 3001;
const MAX_HISTORY = 20;
const STATS_INTERVAL = 3000;

const conversationHistory = new Map();
let wakeWordActive = false;
let isMusicPlaying = false;

// Wake word trigger phrases
const WAKE_WORDS = [
  'jarvis', 'hey jarvis', 'okay jarvis', 'hello jarvis',
  'wake up daddy\'s home', 'daddy\'s home', 'jarvis wake up',
  'jarvis you there', 'jarvis suit up', 'jarvis status report',
  'jarvis talk to me', 'jarvis i need you', 'jarvis come online',
  'jarvis report in', 'jarvis i\'m back', 'jarvis good to go'
];

// Commands allowed while music is playing
const MUSIC_COMMANDS = [
  'play', 'play song', 'play music', 'put on',
  'next', 'next song', 'skip', 'skip this', 'skip song', 'play next',
  'previous', 'previous song', 'last song', 'go back', 'play previous',
  'pause', 'pause music', 'pause song',
  'resume', 'resume music', 'unpause', 'continue music',
  'stop', 'stop music', 'close music', 'hide music',
  'dad\'s playlist', 'dads playlist', 'dad playlist',
  'tony stark playlist', 'tony\'s playlist', 'my playlist',
  'the playlist', 'my music', 'shuffle playlist',
  'what\'s playing', 'what song', 'current song', 'song name', 'now playing',
  'what songs', 'list songs', 'my songs', 'what music', 'what\'s in my playlist',
  'volume', 'set volume', 'volume up', 'volume down',
  'louder', 'quieter', 'turn it up', 'turn it down',
  'increase volume', 'decrease volume', 'lower volume', 'raise volume',
  'mute', 'unmute', 'silence'
];

// Sleep/lock trigger phrases
const SLEEP_COMMANDS = [
  'lock jarvis', 'lock yourself', 'go to sleep', 
  'standby', 'later jarvis', 'jarvis lock'
];

// Fallback greetings by time of day
const FALLBACK_GREETINGS = {
  earlyMorning: ["Still awake sir? I never sleep.", "Late night operations. My favorite."],
  morning: ["Good morning sir. Ready for today?", "Morning. Systems are green."],
  afternoon: ["Afternoon sir. What's the mission?", "Here and ready. What do you need?"],
  evening: ["Evening sir. Suit's on standby.", "Good evening. Ready for action."],
  night: ["Late night sir. Burning the midnight oil?", "Still working? I respect that."]
};

function resetWakeWord() {
  wakeWordActive = false;
  console.log("🔒 Wake word reset - say Jarvis to activate");
}

function setMusicPlaying(playing) {
  isMusicPlaying = playing;
  console.log(`🎵 Music state: ${isMusicPlaying ? "PLAYING" : "STOPPED"}`);
}

const io = new Server(server, {
  cors: { origin: "*" },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.json());

// Returns time category string based on current hour
function getTimeCategory() {
  const hour = new Date().getHours();
  if (hour < 5) return "earlyMorning";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

// Generates AI-powered wake greeting with fallback
async function getWakeGreeting(socket) {
  try {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const prompt = `${SYSTEM_PROMPT}

User just said your wake word (like "Jarvis", "Hey Jarvis", "Wake up daddy's home", etc.)

Current time: ${hour}:00 (${getTimeCategory()})
Day: ${days[dayOfWeek]}

Generate a SHORT, witty greeting as Jarvis. Keep it under 2 sentences. Be creative and varied.

Respond with ONLY this JSON:
{"type":"text_response","text":"your greeting here"}`;

    const aiResponse = await queryOllama(prompt);
    
    if (aiResponse) {
      try {
        return JSON.parse(aiResponse.trim());
      } catch {
        const textMatch = aiResponse.match(/"text":\s*"([^"]+)"/);
        if (textMatch) {
          return { type: "text_response", text: textMatch[1] };
        }
      }
    }
    
    const greetings = FALLBACK_GREETINGS[getTimeCategory()];
    return { 
      type: "text_response", 
      text: greetings[Math.floor(Math.random() * greetings.length)] 
    };
    
  } catch (err) {
    console.error("Wake greeting error:", err);
    return { type: "text_response", text: "At your service sir." };
  }
}

// Parses AI response into a valid command JSON object
function parseAIResponse(aiResponse) {
  if (!aiResponse) return null;
  
  try {
    return JSON.parse(aiResponse.trim());
  } catch (e) {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        let json = jsonMatch[0];
        json = json.replace(/,(\s*})/g, '$1');
        json = json.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
        return JSON.parse(json);
      } catch (e2) {
        const textMatch = aiResponse.match(/"text"\s*:\s*"([^"]+)"/);
        if (textMatch) {
          return { type: "text_response", text: textMatch[1].replace(/\\"/g, '"') };
        }
      }
    }
    
    const cleanedText = aiResponse
      .replace(/^[^{]*/, '')
      .replace(/[^}]*$/, '')
      .trim();
    
    if (cleanedText.length > 0) {
      return { type: "text_response", text: cleanedText.substring(0, 500) };
    }
    
    return { type: "text_response", text: aiResponse.substring(0, 500) };
  }
}

// Checks if a command is a music-related command
function isMusicCommand(text) {
  const lowerText = text.toLowerCase().trim();
  
  if (MUSIC_COMMANDS.some(cmd => lowerText.includes(cmd) || lowerText === cmd)) {
    return true;
  }
  
  if (lowerText.match(/volume\s+\d+/) || 
      lowerText.match(/set volume to \d+/) ||
      lowerText.match(/volume to \d+/)) {
    return true;
  }
  
  if (lowerText.match(/^(?:play|put on)\s+(.+)/) && 
      !lowerText.includes('playlist') && 
      !lowerText.includes('music')) {
    return true;
  }
  
  return false;
}

// Checks if text matches any wake word
function isWakeWord(text) {
  const lowerText = text.toLowerCase().trim();
  return WAKE_WORDS.some(w => lowerText === w || lowerText.startsWith(w + ' '));
}

// Checks if text is a sleep/lock command
function isSleepCommand(text) {
  const lowerText = text.toLowerCase();
  return SLEEP_COMMANDS.some(cmd => lowerText.includes(cmd));
}

// Handles music control commands from frontend widget
async function handleMusicCommand(cmd, socket) {
  const { nextSong, previousSong, togglePause, stopMusic } = require("./commands/music");
  
  try {
    switch (cmd) {
      case "next": 
        return await nextSong();
      case "previous": 
        return await previousSong();
      case "pause": 
      case "resume": 
        return await togglePause();
      case "stop": 
        stopMusic();
        socket.emit("musicState", { playing: false });
        return { speech: "Music stopped." };
    }
  } catch (err) {
    console.error("Music command error:", err);
    return { speech: "Music control failed." };
  }
}

// Builds the AI prompt with conversation history
function buildPrompt(text, socketId) {
  const history = conversationHistory.get(socketId) || [];
  let fullPrompt = SYSTEM_PROMPT;
  
  if (history.length > 0) {
    fullPrompt += "\n\nPrevious conversation:\n";
    const recentHistory = history.slice(-10);
    for (const entry of recentHistory) {
      fullPrompt += `User: ${entry.user}\n`;
      fullPrompt += `JARVIS: ${JSON.stringify(entry.assistant)}\n`;
    }
  }
  
  fullPrompt += `\nCurrent time: ${new Date().toLocaleTimeString()}`;
  fullPrompt += `\n\nUser says: "${text}"\n\nRespond with ONLY valid JSON. No explanations, no markdown, just the JSON object.`;
  
  return fullPrompt;
}

// Processes a user command through AI and executes the result
async function processCommand(text, socket) {
  const startTime = Date.now();
  
  try {
    socket.emit("response");
    
    const fullPrompt = buildPrompt(text, socket.id);
    const aiResponse = await queryOllama(fullPrompt);
    
    if (!aiResponse) {
      socket.emit("response", {
        text: "Sorry sir, I'm having trouble processing that. Can you try again?",
        time: Date.now() - startTime
      });
      return;
    }

    const command = parseAIResponse(aiResponse);
    
    if (!command) {
      socket.emit("response", {
        text: "I didn't quite catch that. Can you rephrase?",
        time: Date.now() - startTime
      });
      return;
    }

    const result = await routeCommand(command, socket);
    const elapsed = Date.now() - startTime;
    console.log(`✅ [${elapsed}ms] Response: "${result.speech?.substring(0, 80)}"`);

    socket.emit("response", {
      text: result.speech || "Done sir.",
      time: elapsed,
      commandType: command.type
    });

    // Save to conversation history
    const history = conversationHistory.get(socket.id) || [];
    history.push({ user: text, assistant: command, timestamp: Date.now() });
    
    while (history.length > MAX_HISTORY) {
      history.shift();
    }
    
    conversationHistory.set(socket.id, history);

  } catch (err) {
    console.error("❌ Command processing error:", err);
    socket.emit("response", {
      text: "Something went wrong on my end sir. Try again?",
      time: Date.now() - startTime
    });
  }
}

// ============================================
// SOCKET CONNECTION HANDLER
// ============================================
io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);
  
  conversationHistory.set(socket.id, []);
  
  setMusicSocket(io);
  setMusicStateCallback(setMusicPlaying);
  clapDetector.setClapSocket(socket);

  // Frontend music widget controls
  socket.on("musicCommand", async (cmd) => {
    const result = await handleMusicCommand(cmd, socket);
    if (result && cmd !== "stop") {
      socket.emit("response", { text: result.speech });
    }
  });

  // Double clap wake-up
  socket.on("clapWakeUp", async () => {
    if (!wakeWordActive) {
      console.log("👏👏 Double clap detected - waking Jarvis");
      
      wakeWordActive = true;
      socket.emit("wake");
      
      const wakeCommand = await getWakeGreeting(socket);
      const result = await routeCommand(wakeCommand, socket);
      
      socket.emit("response", {
        text: result.speech || "At your service sir."
      });
    } else {
      socket.emit("response", {
        text: "I'm already awake sir. No need to clap."
      });
    }
  });

  startReminderChecker(socket);

  // Periodic system stats emission
  const statsInterval = setInterval(async () => {
    try {
      const stats = await getSystemStats();
      socket.emit("systemStats", stats);
    } catch (err) {
      // Silent fail for stats
    }
  }, STATS_INTERVAL);

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    clearInterval(statsInterval);
    conversationHistory.delete(socket.id);
  });

  socket.on("resetWakeWord", () => {
    resetWakeWord();
    socket.emit("sleep");
  });

  // Main command processing
  socket.on("command", async (text) => {
    const startTime = Date.now();
    console.log(`\n📝 [${new Date().toLocaleTimeString()}] Command: "${text}"`);

    const lowerText = text.toLowerCase().trim();
    
    // Block non-music commands while music is playing
    if (isMusicPlaying && !isWakeWord(lowerText) && !isMusicCommand(text)) {
      console.log(`🎵 Music playing - ignoring non-music command: "${text}"`);
      socket.emit("response", { 
        text: "Music is playing sir. I can only handle music and volume commands right now. Say 'pause', 'next', 'volume 50', or 'stop music'."
      });
      return;
    }

    // Require wake word if not active
    if (!wakeWordActive && !isWakeWord(lowerText)) {
      console.log("🔒 Not awake - ignoring command");
      return;
    }
    
    // Handle wake word activation
    if (isWakeWord(lowerText)) {
      wakeWordActive = true;
      socket.emit("wake");
      console.log("🌟 Wake word activated!");
      
      // If user only said wake word, give greeting
      if (WAKE_WORDS.includes(lowerText)) {
        const wakeCommand = await getWakeGreeting(socket);
        const result = await routeCommand(wakeCommand, socket);
        socket.emit("response", {
          text: result.speech || "At your service sir.",
          time: Date.now() - startTime
        });
        return;
      }
      
      // Strip "jarvis " prefix and process the command
      if (lowerText.startsWith('jarvis ')) {
        text = text.substring(7).trim();
        console.log(`📝 Command after wake word: "${text}"`);
      }
    }

    // Fast path for sleep/lock commands
    if (isSleepCommand(lowerText)) {
      wakeWordActive = false;
      socket.emit("sleep");
      socket.emit("response", {
        text: "Going to sleep sir. Say my name when you need me."
      });
      return;
    }

    await processCommand(text, socket);
  });
});

// ============================================
// START SERVER
// ============================================
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║        JARVIS AI ASSISTANT           ║
║        Server running on port ${PORT}     ║
║        Using Ollama AI               ║
║        All commands go through AI     ║
╚════════════════════════════════════════╝
  `);
});