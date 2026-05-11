const fs = require("fs").promises;
const path = require("path");

// Schedule data storage
const SCHEDULE_FILE = path.join(__dirname, "..", "data", "schedule.json");

// Default schedule based on your routine
const defaultSchedule = {
  Saturday: [
    { time: "9:30", activity: "School starts" },
    { time: "14:00", activity: "School ends. Free time and lunch" },
    { time: "15:00", activity: "First study session" },
    { time: "16:10", activity: "Break" },
    { time: "16:30", activity: "Second study session" },
    { time: "17:40", activity: "Break" },
    { time: "18:00", activity: "Third study session" },
    { time: "19:10", activity: "Break" },
    { time: "19:20", activity: "Fourth study session" },
    { time: "20:30", activity: "Free time, exercise, and dinner" },
    { time: "22:00", activity: "Sleep time. Phone off" }
  ],
  Sunday: [
    { time: "9:30", activity: "School starts" },
    { time: "14:00", activity: "School ends. Free time and lunch" },
    { time: "15:00", activity: "First study session" },
    { time: "16:10", activity: "Break" },
    { time: "16:30", activity: "Second study session" },
    { time: "17:40", activity: "Break" },
    { time: "18:00", activity: "Third study session" },
    { time: "19:10", activity: "Break" },
    { time: "19:20", activity: "Fourth study session" },
    { time: "20:30", activity: "Free time and dinner" },
    { time: "22:00", activity: "Sleep time. Phone off" }
  ],
  Monday: [
    { time: "8:30", activity: "School starts" },
    { time: "14:00", activity: "School ends. Free time and lunch" },
    { time: "15:00", activity: "First study session" },
    { time: "16:10", activity: "Break" },
    { time: "16:30", activity: "Second study session" },
    { time: "17:40", activity: "Break" },
    { time: "18:00", activity: "Third study session" },
    { time: "19:10", activity: "Break" },
    { time: "19:20", activity: "Fourth study session" },
    { time: "20:30", activity: "Free time, exercise, and dinner" },
    { time: "22:00", activity: "Sleep time. Phone off" }
  ],
  Tuesday: [
    { time: "9:30", activity: "School starts" },
    { time: "15:20", activity: "School ends. Free time and lunch" },
    { time: "16:00", activity: "First study session" },
    { time: "16:50", activity: "Break" },
    { time: "17:10", activity: "Second study session" },
    { time: "18:00", activity: "Break" },
    { time: "18:20", activity: "Third study session" },
    { time: "19:30", activity: "Break" },
    { time: "20:00", activity: "Fourth study session" },
    { time: "21:10", activity: "Free time, exercise, and dinner" },
    { time: "23:00", activity: "Sleep time. Phone off" }
  ],
  Wednesday: [
    { time: "9:30", activity: "School starts" },
    { time: "15:20", activity: "School ends. Free time and lunch" },
    { time: "16:00", activity: "First study session" },
    { time: "16:50", activity: "Break" },
    { time: "17:10", activity: "Second study session" },
    { time: "18:00", activity: "Break" },
    { time: "18:20", activity: "Third study session" },
    { time: "19:10", activity: "Break" },
    { time: "19:30", activity: "Fourth study session" },
    { time: "20:20", activity: "Free time, exercise, and dinner" },
    { time: "22:00", activity: "Sleep time. Phone off" }
  ],
  Thursday: [
    { time: "12:00", activity: "First exam" },
    { time: "13:00", activity: "Lunch and rest" },
    { time: "14:00", activity: "Second exam" },
    { time: "15:30", activity: "Break" },
    { time: "16:00", activity: "Review both exams" },
    { time: "17:30", activity: "Free time" },
    { time: "22:00", activity: "Sleep" }
  ],
  Friday: [
    { time: "12:00", activity: "First exam" },
    { time: "13:20", activity: "Lunch and rest" },
    { time: "14:00", activity: "Review first exam" },
    { time: "15:00", activity: "Break" },
    { time: "16:00", activity: "Second exam" },
    { time: "19:00", activity: "Break" },
    { time: "20:00", activity: "Review second exam" },
    { time: "21:30", activity: "Free time" },
    { time: "22:00", activity: "Sleep" }
  ]
};

// Initialize schedule file if it doesn't exist
async function initSchedule() {
  try {
    await fs.mkdir(path.dirname(SCHEDULE_FILE), { recursive: true });
    await fs.access(SCHEDULE_FILE);
  } catch {
    await fs.writeFile(SCHEDULE_FILE, JSON.stringify(defaultSchedule, null, 2));
  }
}

// Get today's schedule
async function getTodaySchedule() {
  await initSchedule();
  
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = days[new Date().getDay()];
  
  const schedule = JSON.parse(await fs.readFile(SCHEDULE_FILE, "utf-8"));
  const todaySchedule = schedule[today];
  
  if (!todaySchedule || todaySchedule.length === 0) {
    return { success: false, speech: `No schedule found for ${today}, sir.` };
  }
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  // Find current and upcoming activities
  let currentActivity = null;
  let nextActivity = null;
  
  const scheduleWithMinutes = todaySchedule.map(item => {
    const [h, m] = item.time.split(":").map(Number);
    return { ...item, totalMinutes: h * 60 + m };
  });
  
  for (let i = 0; i < scheduleWithMinutes.length; i++) {
    const item = scheduleWithMinutes[i];
    const nextItem = scheduleWithMinutes[i + 1];
    
    if (currentTime >= item.totalMinutes && (!nextItem || currentTime < nextItem.totalMinutes)) {
      currentActivity = item;
      nextActivity = nextItem || null;
      break;
    }
  }
  
  // If no current activity found, might be before first or after last
  if (!currentActivity && scheduleWithMinutes.length > 0) {
    if (currentTime < scheduleWithMinutes[0].totalMinutes) {
      nextActivity = scheduleWithMinutes[0];
    }
  }
  
  let speech = `Today is ${today}. `;
  
  if (currentActivity) {
    speech += `Right now: ${currentActivity.activity}. `;
  }
  
  if (nextActivity) {
    speech += `Next: ${nextActivity.time} — ${nextActivity.activity}.`;
  } else if (!currentActivity) {
    speech += "No more activities scheduled for today.";
  }
  
  // List full schedule briefly
  speech += ` Full schedule: `;
  speech += todaySchedule.map(s => `${s.time} ${s.activity}`).join(". ");
  
  return { success: true, speech };
}

// Get schedule for a specific day
async function getDaySchedule(dayName) {
  await initSchedule();
  
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = days.find(d => d.toLowerCase() === dayName.toLowerCase());
  
  if (!day) {
    return { success: false, speech: `I don't recognize that day, sir. Try Monday, Tuesday, etc.` };
  }
  
  const schedule = JSON.parse(await fs.readFile(SCHEDULE_FILE, "utf-8"));
  const daySchedule = schedule[day];
  
  if (!daySchedule || daySchedule.length === 0) {
    return { success: false, speech: `No schedule found for ${day}, sir.` };
  }
  
  const speech = `${day}'s schedule: ` + daySchedule.map(s => `${s.time} — ${s.activity}`).join(". ");
  
  return { success: true, speech };
}

// Get next activity only
async function getNextActivity() {
  await initSchedule();
  
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = days[new Date().getDay()];
  
  const schedule = JSON.parse(await fs.readFile(SCHEDULE_FILE, "utf-8"));
  const todaySchedule = schedule[today];
  
  if (!todaySchedule) {
    return { success: false, speech: "No schedule for today." };
  }
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const nextItem = todaySchedule.find(item => {
    const [h, m] = item.time.split(":").map(Number);
    return (h * 60 + m) > currentMinutes;
  });
  
  if (nextItem) {
    return { success: true, speech: `Next: ${nextItem.time} — ${nextItem.activity}` };
  }
  
  return { success: true, speech: "No more activities scheduled for today, sir. You're free!" };
}

module.exports = { getTodaySchedule, getDaySchedule, getNextActivity };