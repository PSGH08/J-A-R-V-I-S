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

console.log("🚀 Starting JARVIS backend...");

io.on("connection", (socket) => {

  console.log("⚡ Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });

  socket.on("command", async (text) => {

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🧠 COMMAND RECEIVED");
    console.log("📥 Raw Text:", text);

    try {

      // =================================
      // FAST COMMANDS
      // =================================

      console.log("⚡ Running fast parser...");

      const fastCommand = parseFastCommand(text);

      console.log("⚡ Fast parser result:", fastCommand);

      if (fastCommand) {

        console.log("🚀 Executing fast command...");

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
      console.log("🦙 Sending to Ollama...");
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

      console.log("🤖 AI RAW:", aiResponse);

      if (!aiResponse) {

        socket.emit("response", {
          text: "AI unavailable."
        });

        return;
      }

      let command;

      try {

        command = JSON.parse(aiResponse);

        console.log("🧩 Parsed AI JSON:", command);

      } catch {

        console.log("💬 Normal AI response");

        socket.emit("response", {
          text: aiResponse
        });

        return;
      }

      console.log("🚀 Routing AI command...");

      // PASS THE SOCKET HERE TOO
      const result = await routeCommand(command, socket);

      console.log("✅ AI Route Result:", result);

      socket.emit("response", {
        text: result.speech || "Done."
      });

      console.log("✅ AI Response emitted");

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    } catch (err) {

      console.error("❌ BACKEND ERROR");
      console.error(err);

      socket.emit("response", {
        text: "Something went wrong."
      });

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    }

  });

});

server.listen(3001, () => {
  console.log("🚀 Server running on port 3001");
});