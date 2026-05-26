// server/commands/timer.js
// Timer management with multiple concurrent timers and human-readable time formatting
const logger = require("../utils/logger");

const activeTimers = new Map();

// Converts total seconds to human-readable format
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

// Calculates remaining time for a timer in human-readable format
function getTimeRemaining(timerId) {
  const timer = activeTimers.get(timerId);
  if (!timer) return "No timer found";
  
  const elapsed = Date.now() - timer.startTime;
  const remaining = Math.max(0, timer.duration * 1000 - elapsed);
  const remainingSeconds = Math.ceil(remaining / 1000);
  
  return formatDuration(remainingSeconds);
}

// Starts a new timer and returns confirmation with formatted duration
function runTimer({ duration }, socket) {
  const timerId = Date.now();
  const durationMs = duration * 1000;
  const formattedDuration = formatDuration(duration);
  
  logger.log(`Timer started for ${formattedDuration} (ID: ${timerId})`);
  
  activeTimers.set(timerId, {
    duration,
    formattedDuration,
    startTime: Date.now(),
    socket,
    timeout: null
  });
  
  const timeout = setTimeout(() => {
    logger.log(`Timer finished: ${formattedDuration}`);
    
    if (socket) {
      socket.emit("response", {
        text: `Timer finished, sir. ${formattedDuration} has elapsed.`
      });
    }
    
    activeTimers.delete(timerId);
  }, durationMs);
  
  // Store timeout reference for cancellation
  const timer = activeTimers.get(timerId);
  if (timer) {
    timer.timeout = timeout;
  }
  
  return { 
    speech: `Timer set for ${formattedDuration}, sir. I will notify you when it's complete.` 
  };
}

// Returns status of all active timers
function checkTimer(socket) {
  const timers = Array.from(activeTimers.entries());
  
  if (timers.length === 0) {
    return { speech: "No timers are currently running, sir." };
  }
  
  if (timers.length === 1) {
    const [id] = timers[0];
    const remaining = getTimeRemaining(id);
    return { speech: `One timer running, sir. ${remaining} remaining.` };
  }
  
  const timerDescriptions = timers.map(([id]) => {
    const remaining = getTimeRemaining(id);
    return `${remaining} remaining`;
  });
  
  return { 
    speech: `${timers.length} timers running, sir. ${timerDescriptions.join('. ')}.` 
  };
}

// Cancels a specific timer by ID
function cancelTimer(timerId) {
  const timer = activeTimers.get(timerId);
  if (timer) {
    const remaining = getTimeRemaining(timerId);
    clearTimeout(timer.timeout);
    activeTimers.delete(timerId);
    logger.log(`Timer ${timerId} cancelled`);
    return { speech: `Timer cancelled, sir. It had ${remaining} remaining.` };
  }
  return { speech: "No timer found to cancel, sir." };
}

// Returns all active timers with remaining time
function getActiveTimers() {
  return Array.from(activeTimers.entries()).map(([id, timer]) => ({
    id,
    duration: timer.duration,
    formattedDuration: timer.formattedDuration,
    remaining: getTimeRemaining(id)
  }));
}

module.exports = { runTimer, cancelTimer, getActiveTimers, checkTimer };