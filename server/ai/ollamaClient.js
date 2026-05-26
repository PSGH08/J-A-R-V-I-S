// server/ai/ollamaClient.js
// Ollama LLM integration for J.A.R.V.I.S. responses
const axios = require("axios");

const OLLAMA_URL = "http://localhost:11434/api/generate";
const REQUEST_TIMEOUT = 60000;

async function queryOllama(prompt) {
  try {
    console.log("🦙 Sending request to Ollama...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await axios.post(
      OLLAMA_URL,
      {
        model: "llama3",
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 80,
        },
      },
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    console.log("🦙 Ollama finished");
    return response.data.response;
  } catch (err) {
    console.error("❌ Ollama Error:", err.message);
    return null;
  }
}

module.exports = { queryOllama };