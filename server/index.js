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

const app = express();

const server = http.createServer(app);

// Add near the top with other requires
const conversationHistory = new Map(); // Store history per socket
const MAX_HISTORY = 10; // Keep last 10 exchanges

// Wake word state
let wakeWordActive = false;

function resetWakeWord() {
  wakeWordActive = false;
  console.log("Wake word reset - say Jarvis again");
}

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

io.on("connection", (socket) => {

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
    
    if (!wakeWordActive && !isWake) {
      console.log("Wake word not active. Ignoring.");
      return;
    }
    
    if (isWake) {
      wakeWordActive = true;
      console.log("Wake word activated!");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("COMMAND RECEIVED");
    console.log("Raw Text:", text);

    try {

      // =================================
      // FAST COMMANDS
      // =================================

      console.log("Running fast parser...");

      const fastCommand = parseFastCommand(text);

      console.log("Fast parser result:", fastCommand);

      if (fastCommand) {

        console.log("Executing fast command...");

      // Handle lock command directly
      if (fastCommand.type === "lock_jarvis") {
        wakeWordActive = false;
        socket.emit("sleep");
        console.log("Wake word reset via lock command");
      }

        // PASS THE SOCKET HERE
        const result = await routeCommand(fastCommand, socket);

        console.log("Route result:", result);

        console.log("Sending response to frontend...");

        socket.emit("response", {
          text: result.speech || "Done."
        });

        console.log("Response emitted");

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        return;
      }

      // =================================
      // AI FALLBACK
      // =================================

      console.log("No fast command found");
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

      console.log("AI RAW:", aiResponse);

      if (!aiResponse) {

        socket.emit("response", {
          text: "AI unavailable."
        });

        return;
      }

      let command;

      try {
        command = JSON.parse(aiResponse);
        console.log("Parsed AI JSON:", command);
      } catch (parseError) {
        console.log("Attempting to fix malformed JSON...");
        
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
          console.log("Fixed JSON:", command);
        } catch (secondError) {
          // Last resort: extract text with regex
          const textMatch = aiResponse.match(/"text":\s*"([^"]+)"/);
          if (textMatch) {
            command = { type: "text_response", text: textMatch[1] };
            console.log("Extracted text:", command);
          } else {
            socket.emit("response", { text: aiResponse });
            return;
          }
        }
      }

      console.log("Routing AI command...");

      // PASS THE SOCKET HERE TOO
      const result = await routeCommand(command, socket);

      console.log("AI Route Result:", result);

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
      
      console.log(`History: ${history.length} exchanges stored`);

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    } catch (err) {

      console.error("BACKEND ERROR");
      console.error(err);

      socket.emit("response", {
        text: "Something went wrong."
      });

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    }

  });

});

server.listen(3001, () => {
  console.log("Server running on port 3001");
});