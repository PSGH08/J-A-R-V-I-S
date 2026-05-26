// server/commands/reminders.js
// Time-based reminder system with natural language time parsing and socket notifications
const fs = require("fs").promises;
const path = require("path");

const REMINDERS_FILE = path.join(__dirname, "..", "data", "reminders.json");
const CHECK_INTERVAL = 10000; // 10 seconds
const CLEANUP_AGE = 3600000; // 1 hour
let checkInterval = null;

// Ensures the reminders file and directory exist
async function initReminders() {
  try {
    await fs.mkdir(path.dirname(REMINDERS_FILE), { recursive: true });
    await fs.access(REMINDERS_FILE);
  } catch {
    await fs.writeFile(REMINDERS_FILE, JSON.stringify([]));
  }
}

// Reads and parses the reminders file
async function readReminders() {
  await initReminders();
  return JSON.parse(await fs.readFile(REMINDERS_FILE, "utf-8"));
}

// Writes reminders array to file
async function writeReminders(reminders) {
  await fs.writeFile(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
}

// Parses natural language time expressions from reminder text
function parseTime(timeStr, text) {
  // Parse absolute time: "at 3pm", "at 3:30pm"
  const timeMatch = text.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]) || 0;
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
    if (target < now) target.setDate(target.getDate() + 1);
    return target;
  }
  
  // Parse relative time: "in 10 minutes", "in 2 hours"
  const inMatch = text.match(/in\s+(\d+)\s+(minute|minutes|hour|hours|second|seconds)/i);
  if (inMatch) {
    const amount = parseInt(inMatch[1]);
    const unit = inMatch[2].toLowerCase();
    const now = new Date();
    
    if (unit.startsWith('minute')) return new Date(now.getTime() + amount * 60000);
    if (unit.startsWith('hour')) return new Date(now.getTime() + amount * 3600000);
    if (unit.startsWith('second')) return new Date(now.getTime() + amount * 1000);
  }
  
  return null;
}

async function addReminder(text, socket) {
  const cleanText = text.replace(/^(?:jarvis\s+)?(?:remind me to|remind me|reminder\s+)/i, '').trim();
  const reminderTime = parseTime(null, text);
  
  if (!reminderTime) {
    return { 
      success: false, 
      speech: "I couldn't understand the time. Try 'remind me to call mom at 3pm' or 'remind me in 10 minutes to check the oven'." 
    };
  }
  
  const reminders = await readReminders();
  const reminder = {
    id: Date.now(),
    text: cleanText,
    time: reminderTime.toISOString(),
    triggered: false
  };
  reminders.push(reminder);
  await writeReminders(reminders);
  
  const timeStr = reminderTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { success: true, speech: `Reminder set for ${timeStr}: "${cleanText}"` };
}

// Starts periodic checking for due reminders and emits socket events
function startReminderChecker(socket) {
  if (checkInterval) clearInterval(checkInterval);
  
  checkInterval = setInterval(async () => {
    try {
      const reminders = await readReminders();
      const now = new Date();
      let changed = false;
      
      // Check for due reminders
      for (const r of reminders) {
        if (!r.triggered && new Date(r.time) <= now) {
          r.triggered = true;
          changed = true;
          if (socket) {
            socket.emit("response", { text: `Reminder sir: ${r.text}` });
          }
        }
      }
      
      // Clean up triggered reminders older than 1 hour
      if (changed) {
        const clean = reminders.filter(r => !r.triggered || (now - new Date(r.time)) < CLEANUP_AGE);
        await writeReminders(clean);
      }
    } catch (err) {
      // Silently fail to prevent interval from stopping
    }
  }, CHECK_INTERVAL);
}

async function listReminders() {
  const reminders = await readReminders();
  const pending = reminders.filter(r => !r.triggered);
  
  if (pending.length === 0) return { success: true, speech: "No pending reminders, sir." };
  
  const list = pending.map((r, i) => {
    const time = new Date(r.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${i + 1}: ${r.text} at ${time}`;
  }).join(". ");
  
  return { success: true, speech: `You have ${pending.length} reminders. ${list}` };
}

module.exports = { addReminder, listReminders, startReminderChecker };