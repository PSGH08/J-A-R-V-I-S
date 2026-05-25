// server/services/clapDetector.js
// This is a SERVER-SIDE file - NO React imports!

let clapSocket = null;

function setClapSocket(socket) {
  clapSocket = socket;
}

function handleClapDetected() {
  // Optional: Add logging if needed
  // console.log("Clap detected by client");
}

module.exports = {
  setClapSocket,
  handleClapDetected
};