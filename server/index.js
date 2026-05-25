const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { parseFastCommand } = require("./core/fastCommands");
const { queryOllama } = require("./ai/ollamaClient");
const { SYSTEM_PROMPT } = require("./core/schema");
const { routeCommand } = require("./core/commandRouter");
const { startReminderChecker } = require("./commands/reminders");
const { getSystemStats } = require("./core/systemStats");
const { setMusicSocket, setMusicStateCallback } = require("./commands/music");
const clapDetector = require("./services/clapDetector");

const app = express();

const server = http.createServer(app);

// Add near the top with other requires
const conversationHistory = new Map(); // Store history per socket
const MAX_HISTORY = 10; // Keep last 10 exchanges

// Wake word state
let wakeWordActive = false;
let isMusicPlaying = false;  // NEW: Track if music is playing

function resetWakeWord() {
  wakeWordActive = false;
  console.log("Wake word reset - say Jarvis again");
}

// Add this function near the top
function setMusicPlaying(playing) {
  isMusicPlaying = playing;
  console.log(`🎵 Music playing state: ${isMusicPlaying ? "PLAYING" : "STOPPED"}`);
}

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

io.on("connection", (socket) => {

  setMusicSocket(io); // Use io to broadcast to all clients

  setMusicStateCallback(setMusicPlaying);

  socket.on("musicCommand", async (cmd) => {
    const { nextSong, previousSong, togglePause, stopMusic } = require("./commands/music");
    let result;
    
    switch (cmd) {
      case "next": result = await nextSong(); break;
      case "previous": result = await previousSong(); break;
      case "pause": result = await togglePause(); break;
      case "resume": result = await togglePause(); break;
      case "stop": 
        stopMusic();
        socket.emit("musicState", { playing: false });
        break;
    }
    
    if (result) {
      socket.emit("response", { text: result.speech });
    }
  });

  clapDetector.setClapSocket(socket);

  socket.on("clapWakeUp", async () => {
    // Only process if Jarvis is locked (same as wake word logic)
    if (!wakeWordActive) {
      console.log("👏👏 Double clap detected - waking Jarvis");
      
      // IMPORTANT: Tell frontend that Jarvis is waking up
      socket.emit("wake");
      
      // Set wake word active
      wakeWordActive = true;      
      
      // Use the EXACT SAME parseFastCommand to get the greeting
      const fastCommand = parseFastCommand("jarvis");
      
      if (fastCommand) {
        
        const result = await routeCommand(fastCommand, socket);
        
        socket.emit("response", {
          text: result.speech || "Done."
        });
        
      }
    } else {
      console.log("Clap detected but Jarvis already awake");
      // Optional: Send a quick "I'm already awake" response
      socket.emit("response", {
        text: "I'm already awake, sir."
      });
    }
  });

  startReminderChecker(socket);

  console.log("Client connected:", socket.id);

  const statsInterval = setInterval(async () => {
    try {
      const stats = await getSystemStats();
      socket.emit("systemStats", stats);
    } catch (err) {
      console.error("Stats error:", err.message);
    }
  }, 3000);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    clearInterval(statsInterval);
  });

  socket.on("resetWakeWord", () => {
    resetWakeWord();
    socket.emit("sleep"); // Make sure this is emitted
    socket.emit("response", { text: "Wake word reset sir. Say Jarvis when you need me." });
  });

  socket.on("command", async (text) => {

    console.log("Raw Text:", text);

    // WAKE WORD CHECK - blocks everything until activated
    const lowerText = text.toLowerCase().trim();
    const wakeWords = [
      'jarvis', 'hey jarvis', 'okay jarvis', 'hello jarvis',
      'wake up daddy\'s home', 'daddy\'s home', 'jarvis wake up',
      'jarvis you there', 'jarvis suit up', 'jarvis status report',
      'jarvis talk to me', 'jarvis i need you', 'jarvis come online',
      'jarvis report in', 'jarvis i\'m back', 'jarvis good to go'
    ];    
    const isWake = wakeWords.some(w => lowerText === w || lowerText.startsWith(w + ' '));

    if (isMusicPlaying && !isWake) {
      // ALL music commands that should work while music is playing
      const musicCommands = [
        // Play commands
        'play', 'play song', 'play music', 'put on',
        
        // Playlist commands
        'dad\'s playlist', 'dads playlist', 'dad playlist',
        'tony stark playlist', 'tony\'s playlist', 'my playlist',
        'the playlist', 'my music', 'shuffle playlist',
        
        // Navigation commands
        'next', 'next song', 'skip', 'skip this', 'skip song', 'play next',
        'previous', 'previous song', 'last song', 'go back', 'play previous',
        
        // Control commands
        'pause', 'pause music', 'pause song',
        'resume', 'resume music', 'unpause', 'continue music',
        'stop', 'stop music', 'close music', 'hide music',
        
        // Info commands
        'what\'s playing', 'what song', 'current song', 'song name', 'now playing',
        'what songs', 'list songs', 'my songs', 'what music', 'what\'s in my playlist'
      ];
      
      const isMusicCommand = musicCommands.some(cmd => 
        lowerText.includes(cmd) || lowerText === cmd
      );
      
      // Also check if it's a "play [song name]" command
      const isPlaySongCommand = lowerText.match(/^(?:play|put on)\s+(.+)/) && 
        !lowerText.includes('playlist') && 
        !lowerText.includes('music');
      
      if (!isMusicCommand && !isPlaySongCommand) {
        console.log(`🎵 Music playing - ignoring non-music command: "${text}"`);
        socket.emit("response", { 
          text: "Music is playing sir. I can only handle music commands right now. Say 'pause', 'next', 'stop music', or play a specific song."
        });
        return;
      }
    }
    
    if (!wakeWordActive && !isWake) {
      console.log("Wake word not active. Ignoring.");
      return;
    }
    
    if (isWake) {
      wakeWordActive = true;
      socket.emit("wake"); // Add this line
      console.log("Wake word activated!");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("COMMAND RECEIVED");
    console.log("Raw Text:", text);

    try {

      // =================================
      // FAST COMMANDS
      // =================================

      const fastCommand = parseFastCommand(text);

      if (fastCommand) {

      // Handle lock command directly
      if (fastCommand.type === "lock_jarvis") {
        wakeWordActive = false;
        socket.emit("sleep");
      }

        // PASS THE SOCKET HERE
        const result = await routeCommand(fastCommand, socket);

        socket.emit("response", {
          text: result.speech || "Done."
        });

        return;
      }

      // =================================
      // AI FALLBACK
      // =================================

      socket.emit("response", {
        text: "Thinking..."
      });

      // Get or create conversation history for this socket
      if (!conversationHistory.has(socket.id)) {
        conversationHistory.set(socket.id, []);
      }
      const history = conversationHistory.get(socket.id);
      
      // Build the prompt with history
      let promptWithHistory = SYSTEM_PROMPT + "\n\n";
      promptWithHistory += "Previous conversation:\n";
      
      // Add last few exchanges for context
      const recentHistory = history.slice(-6); // Last 3 exchanges (user + assistant)
      for (const entry of recentHistory) {
        promptWithHistory += `User: ${entry.user}\n`;
        promptWithHistory += `JARVIS: ${JSON.stringify(entry.assistant)}\n`;
      }
      
      promptWithHistory += `\nCurrent request: ${text}`;
      
      const aiResponse = await queryOllama(promptWithHistory);
      if (!aiResponse) {
        socket.emit("response", {
          text: "AI is thinking too long. Try again."
        });
        return;
      }

      if (!aiResponse) {

        socket.emit("response", {
          text: "AI unavailable."
        });

        return;
      }

      let command;

      try {
        command = JSON.parse(aiResponse);
      } catch (parseError) {
        
        let fixedJson = aiResponse.trim();
        
        // Add missing closing braces
        if (fixedJson.startsWith('{') && !fixedJson.endsWith('}')) {
          const openBraces = (fixedJson.match(/{/g) || []).length;
          const closeBraces = (fixedJson.match(/}/g) || []).length;
          const missingBraces = openBraces - closeBraces;
          fixedJson += '}'.repeat(missingBraces);
        }
        
        // Remove trailing commas before braces
        fixedJson = fixedJson.replace(/,(\s*})/g, '$1');
        
        try {
          command = JSON.parse(fixedJson);
        } catch (secondError) {
          // Last resort: extract text with regex
          const textMatch = aiResponse.match(/"text":\s*"([^"]+)"/);
          if (textMatch) {
            command = { type: "text_response", text: textMatch[1] };
          } else {
            socket.emit("response", { text: aiResponse });
            return;
          }
        }
      }

      // PASS THE SOCKET HERE TOO
      const result = await routeCommand(command, socket);

      socket.emit("response", {
        text: result.speech || "Done."
      });

      console.log("AI Response emitted");

      // SAVE TO CONVERSATION HISTORY
      history.push({
        user: text,
        assistant: command
      });
      
      // Trim history if too long
      while (history.length > MAX_HISTORY) {
        history.shift();
      }
      
    } catch (err) {

      console.error("BACKEND ERROR");
      console.error(err);

      socket.emit("response", {
        text: "Something went wrong."
      });

    }

  });

});

server.listen(3001, () => {
  console.log("Server running on port 3001");
});