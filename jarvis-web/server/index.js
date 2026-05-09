const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { parseFastCommand } = require("./core/fastCommands");
const { queryOllama } = require("./ai/ollamaClient");
const { SYSTEM_PROMPT } = require("./core/schema");
const { routeCommand } = require("./core/commandRouter");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

io.on("connection", (socket) => {

  console.log("⚡ Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

  socket.on("command", async (text) => {

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("COMMAND RECEIVED");
    console.log("Raw Text:", text);

    try {

      // =================================
      // FAST COMMANDS
      // =================================

      console.log("⚡ Running fast parser...");

      const fastCommand = parseFastCommand(text);

      console.log("⚡ Fast parser result:", fastCommand);

      if (fastCommand) {

        console.log("Executing fast command...");

        // PASS THE SOCKET HERE
        const result = await routeCommand(fastCommand, socket);

        console.log("✅ Route result:", result);

        console.log("📤 Sending response to frontend...");

        socket.emit("response", {
          text: result.speech || "Done."
        });

        console.log("✅ Response emitted");

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        return;
      }

      // =================================
      // AI FALLBACK
      // =================================

      console.log("🦙 No fast command found");
      socket.emit("response", {
        text: "Thinking..."
      });
      const aiResponse = await queryOllama(SYSTEM_PROMPT + text);

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