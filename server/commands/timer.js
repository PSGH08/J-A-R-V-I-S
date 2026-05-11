const logger = require("../utils/logger");

// Store active timers
const activeTimers = new Map();

// Convert seconds to human-readable format
function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
  
  if (parts.length === 0) return "0 seconds";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts[0]}, ${parts[1]}, and ${parts[2]}`;
}

// Get remaining time for a timer
function getTimeRemaining(timerId) {
  const timer = activeTimers.get(timerId);
  if (!timer) return "No timer found";
  
  const elapsed = Date.now() - timer.startTime;
  const remaining = Math.max(0, timer.duration * 1000 - elapsed);
  const remainingSeconds = Math.ceil(remaining / 1000);
  
  return formatDuration(remainingSeconds);
}

function runTimer({ duration }, socket) {
  const timerId = Date.now();
  const durationMs = duration * 1000;
  const formattedDuration = formatDuration(duration);
  
  logger.log(`Timer started for ${formattedDuration} (ID: ${timerId})`);
  
  // Store timer info
  activeTimers.set(timerId, {
    duration,
    formattedDuration,
    startTime: Date.now(),
    socket,
    timeout: null
  });
  
  // Set timeout for when timer finishes
  const timeout = setTimeout(() => {
    logger.log(`Timer finished: ${formattedDuration}`);
    
    // Emit the finished message through socket
    if (socket) {
      socket.emit("response", {
        text: `Timer finished, sir. ${formattedDuration} has elapsed.`
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
  
  // Return immediate confirmation with human-readable time
  return { 
    speech: `Timer set for ${formattedDuration}, sir. I will notify you when it's complete.` 
  };
}

// Check how much time is left on a timer
function checkTimer(socket) {
  const timers = Array.from(activeTimers.entries());
  
  if (timers.length === 0) {
    return { speech: "No timers are currently running, sir." };
  }
  
  if (timers.length === 1) {
    const [id, timer] = timers[0];
    const remaining = getTimeRemaining(id);
    return { speech: `One timer running, sir. ${remaining} remaining.` };
  }
  
  // Multiple timers
  const timerDescriptions = timers.map(([id, timer]) => {
    const remaining = getTimeRemaining(id);
    return `${remaining} remaining`;
  });
  
  return { 
    speech: `${timers.length} timers running, sir. ${timerDescriptions.join('. ')}.` 
  };
}

// Optional: Function to cancel a timer
function cancelTimer(timerId) {
  const timer = activeTimers.get(timerId);
  if (timer) {
    const remaining = getTimeRemaining(timerId); // Get remaining BEFORE clearing
    clearTimeout(timer.timeout);
    activeTimers.delete(timerId);
    logger.log(`Timer ${timerId} cancelled`);
    return { speech: `Timer cancelled, sir. It had ${remaining} remaining.` };
  }
  return { speech: "No timer found to cancel, sir." };
}

// Get all active timers
function getActiveTimers() {
  return Array.from(activeTimers.entries()).map(([id, timer]) => ({
    id,
    duration: timer.duration,
    formattedDuration: timer.formattedDuration,
    remaining: getTimeRemaining(id)
  }));
}

module.exports = { runTimer, cancelTimer, getActiveTimers, checkTimer };