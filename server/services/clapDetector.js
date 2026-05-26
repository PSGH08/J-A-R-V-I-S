// server/services/clapDetector.js
// Server-side handler for client clap detection events
let clapSocket = null;

function setClapSocket(socket) {
  clapSocket = socket;
}

function handleClapDetected() {
  // Client-side detection handles the wake-up logic
}

module.exports = {
  setClapSocket,
  handleClapDetected
};