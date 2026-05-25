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

// Conversation history per socket
const conversationHistory = new Map();
const MAX_HISTORY = 20; // Keep last 20 exchanges for better context

// Wake word state
let wakeWordActive = false;
let isMusicPlaying = false;

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

// ============================================
// AI-POWERED WAKE WORD RESPONSE
// ============================================
async function getWakeGreeting(socket) {
  try {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    const prompt = `${SYSTEM_PROMPT}

User just said your wake word (like "Jarvis", "Hey Jarvis", "Wake up daddy's home", etc.)

Current time: ${hour}:00 (${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 22 ? 'evening' : 'night'})
Day: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}

Generate a SHORT, witty greeting as Jarvis. Keep it under 2 sentences. Be creative and varied.

Respond with ONLY this JSON:
{"type":"text_response","text":"your greeting here"}`;

    const aiResponse = await queryOllama(prompt);
    
    if (aiResponse) {
      try {
        const command = JSON.parse(aiResponse.trim());
        return command;
      } catch {
        // Extract text if JSON parsing fails
        const textMatch = aiResponse.match(/"text":\s*"([^"]+)"/);
        if (textMatch) {
          return { type: "text_response", text: textMatch[1] };
        }
      }
    }
    
    // Fallback greetings if AI fails
    const fallbacks = {
      earlyMorning: ["Still awake sir? I never sleep.", "Late night operations. My favorite."],
      morning: ["Good morning sir. Ready for today?", "Morning. Systems are green."],
      afternoon: ["Afternoon sir. What's the mission?", "Here and ready. What do you need?"],
      evening: ["Evening sir. Suit's on standby.", "Good evening. Ready for action."],
      night: ["Late night sir. Burning the midnight oil?", "Still working? I respect that."]
    };
    
    let timeCategory = "morning";
    if (hour < 5) timeCategory = "earlyMorning";
    else if (hour < 12) timeCategory = "morning";
    else if (hour < 17) timeCategory = "afternoon";
    else if (hour < 22) timeCategory = "evening";
    else timeCategory = "night";
    
    const greetings = fallbacks[timeCategory];
    return { 
      type: "text_response", 
      text: greetings[Math.floor(Math.random() * greetings.length)] 
    };
    
  } catch (err) {
    console.error("Wake greeting error:", err);
    return { type: "text_response", text: "At your service sir." };
  }
}

// ============================================
// PARSE AI RESPONSE TO JSON
// ============================================
function parseAIResponse(aiResponse) {
  if (!aiResponse) return null;
  
  // Try direct parse first
  try {
    return JSON.parse(aiResponse.trim());
  } catch (e) {
    // Try to extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        let json = jsonMatch[0];
        // Fix common JSON issues
        json = json.replace(/,(\s*})/g, '$1'); // Remove trailing commas
        json = json.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Quote unquoted keys
        return JSON.parse(json);
      } catch (e2) {
        // Extract text field with regex
        const textMatch = aiResponse.match(/"text"\s*:\s*"([^"]+)"/);
        if (textMatch) {
          return { type: "text_response", text: textMatch[1].replace(/\\"/g, '"') };
        }
      }
    }
    
    // Last resort: treat whole response as text
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

// ============================================
// SOCKET CONNECTION HANDLER
// ============================================
io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);
  
  // Initialize conversation history for this socket
  conversationHistory.set(socket.id, []);
  
  // Setup music
  setMusicSocket(io);
  setMusicStateCallback(setMusicPlaying);
  
  // Setup clap detector
  clapDetector.setClapSocket(socket);

  // ============================================
  // MUSIC COMMAND HANDLER (from frontend)
  // ============================================
  socket.on("musicCommand", async (cmd) => {
    const { nextSong, previousSong, togglePause, stopMusic } = require("./commands/music");
    let result;
    
    try {
      switch (cmd) {
        case "next": 
          result = await nextSong(); 
          break;
        case "previous": 
          result = await previousSong(); 
          break;
        case "pause": 
          result = await togglePause(); 
          break;
        case "resume": 
          result = await togglePause(); 
          break;
        case "stop": 
          stopMusic();
          socket.emit("musicState", { playing: false });
          socket.emit("response", { text: "Music stopped." });
          return;
      }
      
      if (result) {
        socket.emit("response", { text: result.speech });
      }
    } catch (err) {
      console.error("Music command error:", err);
      socket.emit("response", { text: "Music control failed." });
    }
  });

  // ============================================
  // CLAP WAKE UP
  // ============================================
  socket.on("clapWakeUp", async () => {
    if (!wakeWordActive) {
      console.log("👏👏 Double clap detected - waking Jarvis");
      
      wakeWordActive = true;
      socket.emit("wake");
      
      // Get AI-powered wake greeting
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

  // ============================================
  // START REMINDER CHECKER
  // ============================================
  startReminderChecker(socket);

  // ============================================
  // SYSTEM STATS INTERVAL
  // ============================================
  const statsInterval = setInterval(async () => {
    try {
      const stats = await getSystemStats();
      socket.emit("systemStats", stats);
    } catch (err) {
      // Silent fail for stats
    }
  }, 3000);

  // ============================================
  // DISCONNECT HANDLER
  // ============================================
  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    clearInterval(statsInterval);
    conversationHistory.delete(socket.id);
  });

  // ============================================
  // RESET WAKE WORD
  // ============================================
  socket.on("resetWakeWord", () => {
    resetWakeWord();
    socket.emit("sleep");
  });

  // ============================================
  // MAIN COMMAND HANDLER - EVERYTHING GOES TO AI
  // ============================================
  socket.on("command", async (text) => {
    const startTime = Date.now();
    console.log(`\n📝 [${new Date().toLocaleTimeString()}] Command: "${text}"`);

    const lowerText = text.toLowerCase().trim();
    
    // ============================================
    // WAKE WORD DETECTION
    // ============================================
    const wakeWords = [
      'jarvis', 'hey jarvis', 'okay jarvis', 'hello jarvis',
      'wake up daddy\'s home', 'daddy\'s home', 'jarvis wake up',
      'jarvis you there', 'jarvis suit up', 'jarvis status report',
      'jarvis talk to me', 'jarvis i need you', 'jarvis come online',
      'jarvis report in', 'jarvis i\'m back', 'jarvis good to go'
    ];
    
    const isWake = wakeWords.some(w => 
      lowerText === w || lowerText.startsWith(w + ' ')
    );

    // If music is playing, only allow music commands and wake word
    if (isMusicPlaying && !isWake) {
      const musicCommands = [
        'play', 'play song', 'play music', 'put on',
        'dad\'s playlist', 'dads playlist', 'dad playlist',
        'tony stark playlist', 'tony\'s playlist', 'my playlist',
        'the playlist', 'my music', 'shuffle playlist',
        'next', 'next song', 'skip', 'skip this', 'skip song', 'play next',
        'previous', 'previous song', 'last song', 'go back', 'play previous',
        'pause', 'pause music', 'pause song',
        'resume', 'resume music', 'unpause', 'continue music',
        'stop', 'stop music', 'close music', 'hide music',
        'what\'s playing', 'what song', 'current song', 'song name', 'now playing',
        'what songs', 'list songs', 'my songs', 'what music', 'what\'s in my playlist'
      ];
      
      const isMusicCommand = musicCommands.some(cmd => 
        lowerText.includes(cmd) || lowerText === cmd
      );
      
      const isPlaySongCommand = lowerText.match(/^(?:play|put on)\s+(.+)/) && 
        !lowerText.includes('playlist') && 
        !lowerText.includes('music');
      
      if (!isMusicCommand && !isPlaySongCommand) {
        console.log(`🎵 Music playing - ignoring: "${text}"`);
        socket.emit("response", { 
          text: "Music is playing sir. I can only handle music commands right now. Say 'pause', 'next', 'stop music', or play a specific song."
        });
        return;
      }
    }

    // ============================================
    // WAKE WORD HANDLING
    // ============================================
    if (!wakeWordActive && !isWake) {
      console.log("🔒 Not awake - ignoring command");
      return;
    }
    
    if (isWake) {
      wakeWordActive = true;
      socket.emit("wake");
      console.log("🌟 Wake word activated!");
      
      // If user ONLY said wake word, give greeting
      if (wakeWords.includes(lowerText)) {
        const wakeCommand = await getWakeGreeting(socket);
        const result = await routeCommand(wakeCommand, socket);
        socket.emit("response", {
          text: result.speech || "At your service sir.",
          time: Date.now() - startTime
        });
        return;
      }
      
      // If user said "Jarvis [command]", strip the wake word and process command
      if (lowerText.startsWith('jarvis ')) {
        text = text.substring(7).trim(); // Remove "jarvis "
        console.log(`📝 Command after wake word: "${text}"`);
      }
    }

    // ============================================
    // CHECK FOR LOCK/SLEEP COMMANDS (process fast)
    // ============================================
    if (lowerText.includes("lock jarvis") || 
        lowerText.includes("lock yourself") || 
        lowerText.includes("go to sleep") || 
        lowerText.includes("standby") || 
        lowerText.includes("later jarvis") ||
        lowerText.includes("jarvis lock")) {
      
      wakeWordActive = false;
      socket.emit("sleep");
      socket.emit("response", {
        text: "Going to sleep sir. Say my name when you need me."
      });
      return;
    }

    // ============================================
    // SEND EVERYTHING TO AI
    // ============================================
    try {
      // Show thinking indicator
      socket.emit("response");

      // Get conversation history
      const history = conversationHistory.get(socket.id) || [];
      
      // Build prompt with conversation context
      let fullPrompt = SYSTEM_PROMPT;
      
      if (history.length > 0) {
        fullPrompt += "\n\nPrevious conversation:\n";
        const recentHistory = history.slice(-10); // Last 5 exchanges
        for (const entry of recentHistory) {
          fullPrompt += `User: ${entry.user}\n`;
          fullPrompt += `JARVIS: ${JSON.stringify(entry.assistant)}\n`;
        }
      }
      
      fullPrompt += `\nCurrent time: ${new Date().toLocaleTimeString()}`;
      fullPrompt += `\n\nUser says: "${text}"\n\nRespond with ONLY valid JSON. No explanations, no markdown, just the JSON object.`;

      // Query AI
      const aiResponse = await queryOllama(fullPrompt);
      
      if (!aiResponse) {
        socket.emit("response", {
          text: "Sorry sir, I'm having trouble processing that. Can you try again?",
          time: Date.now() - startTime
        });
        return;
      }

      // Parse AI response to command
      const command = parseAIResponse(aiResponse);
      
      if (!command) {
        socket.emit("response", {
          text: "I didn't quite catch that. Can you rephrase?",
          time: Date.now() - startTime
        });
        return;
      }

      // Execute command
      const result = await routeCommand(command, socket);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ [${elapsed}ms] Response: "${result.speech?.substring(0, 80)}"`);

      // Send response
      socket.emit("response", {
        text: result.speech || "Done sir.",
        time: elapsed,
        commandType: command.type
      });

      // Save to conversation history
      history.push({
        user: text,
        assistant: command,
        timestamp: Date.now()
      });
      
      // Trim history
      while (history.length > MAX_HISTORY) {
        history.shift();
      }

    } catch (err) {
      console.error("❌ Command processing error:", err);
      socket.emit("response", {
        text: "Something went wrong on my end sir. Try again?",
        time: Date.now() - startTime
      });
    }
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║        JARVIS AI ASSISTANT           ║
║        Server running on port ${PORT}     ║
║        Using TinyLlama AI             ║
║        All commands go through AI     ║
╚════════════════════════════════════════╝
  `);
});