const logger = require("../utils/logger");

// Store active timers
const activeTimers = new Map();

function runTimer({ duration }, socket) {
  const timerId = Date.now();
  const durationMs = duration * 1000;
  
  logger.log(`⏰ Timer started for ${duration} seconds (ID: ${timerId})`);
  
  // Store timer info
  activeTimers.set(timerId, {
    duration,
    socket,
    timeout: null
  });
  
  // Set timeout for when timer finishes
  const timeout = setTimeout(() => {
    logger.log(`⏰ Timer finished: ${duration} seconds`);
    
    // Emit the finished message through socket
    if (socket) {
      socket.emit("response", {
        text: `Timer finished, sir. ${duration} seconds have elapsed.`
      });
    }
    
    // Remove from active timers
    activeTimers.delete(timerId);
  }, durationMs);
  
  // Store the timeout reference
  const timer = activeTimers.get(timerId);
  if (timer) {
    timer.timeout = timeout;
  }
  
  // Return immediate confirmation
  return { 
    speech: `Timer set for ${duration} seconds, sir. I will notify you when it's complete.` 
  };
}

// Optional: Function to cancel a timer
function cancelTimer(timerId) {
  const timer = activeTimers.get(timerId);
  if (timer) {
    clearTimeout(timer.timeout);
    activeTimers.delete(timerId);
    logger.log(`❌ Timer ${timerId} cancelled`);
    return { speech: "Timer cancelled, sir." };
  }
  return { speech: "No timer found to cancel, sir." };
}

// Get all active timers
function getActiveTimers() {
  return Array.from(activeTimers.keys()).map(id => ({
    id,
    duration: activeTimers.get(id).duration
  }));
}

module.exports = { runTimer, cancelTimer, getActiveTimers };