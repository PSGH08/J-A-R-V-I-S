const fs = require("fs").promises;
const path = require("path");

const REMINDERS_FILE = path.join(__dirname, "..", "data", "reminders.json");
let checkInterval = null;

async function initReminders() {
  try {
    await fs.mkdir(path.dirname(REMINDERS_FILE), { recursive: true });
    await fs.access(REMINDERS_FILE);
  } catch {
    await fs.writeFile(REMINDERS_FILE, JSON.stringify([]));
  }
}

function parseTime(timeStr, text) {
  // "remind me to call mom at 3pm" or "remind me in 10 minutes to call mom"
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
  await initReminders();
  
  const cleanText = text.replace(/^(?:jarvis\s+)?(?:remind me to|remind me|reminder\s+)/i, '').trim();
  const reminderTime = parseTime(null, text);
  
  if (!reminderTime) {
    return { success: false, speech: "I couldn't understand the time. Try 'remind me to call mom at 3pm' or 'remind me in 10 minutes to check the oven'." };
  }
  
  const reminders = JSON.parse(await fs.readFile(REMINDERS_FILE, "utf-8"));
  const reminder = {
    id: Date.now(),
    text: cleanText,
    time: reminderTime.toISOString(),
    triggered: false
  };
  reminders.push(reminder);
  await fs.writeFile(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
  
  const timeStr = reminderTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { success: true, speech: `Reminder set for ${timeStr}: "${cleanText}"` };
}

function startReminderChecker(socket) {
  if (checkInterval) clearInterval(checkInterval);
  
  checkInterval = setInterval(async () => {
    try {
      await initReminders();
      const reminders = JSON.parse(await fs.readFile(REMINDERS_FILE, "utf-8"));
      const now = new Date();
      let changed = false;
      
      for (const r of reminders) {
        if (!r.triggered && new Date(r.time) <= now) {
          r.triggered = true;
          changed = true;
          if (socket) {
            socket.emit("response", { text: `Reminder sir: ${r.text}` });
          }
        }
      }
      
      if (changed) {
        // Remove triggered reminders older than 1 hour
        const clean = reminders.filter(r => !r.triggered || (now - new Date(r.time)) < 3600000);
        await fs.writeFile(REMINDERS_FILE, JSON.stringify(clean, null, 2));
      }
    } catch (err) {
      // Silently fail
    }
  }, 10000); // Check every 10 seconds
}

async function listReminders() {
  await initReminders();
  const reminders = JSON.parse(await fs.readFile(REMINDERS_FILE, "utf-8"));
  const pending = reminders.filter(r => !r.triggered);
  if (pending.length === 0) return { success: true, speech: "No pending reminders, sir." };
  
  const list = pending.map((r, i) => {
    const time = new Date(r.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${i + 1}: ${r.text} at ${time}`;
  }).join(". ");
  
  return { success: true, speech: `You have ${pending.length} reminders. ${list}` };
}

module.exports = { addReminder, listReminders, startReminderChecker };