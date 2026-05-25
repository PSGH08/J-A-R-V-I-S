const { runTimer, checkTimer, cancelTimer, getActiveTimers } = require("../commands/timer");
const { openApp } = require("../commands/appControl");
const { runBrowserAutomation, getOrCreateBrowser, summarizeCurrentPage, clickResultNumber } = require("../commands/browser");
const systemControl = require("../commands/systemControl");
const { getTodaySchedule, getDaySchedule, getNextActivity } = require("../commands/schedule");
const { addNote, listNotes, deleteNote, clearNotes } = require("../commands/notes");
const { addReminder, listReminders, startReminderChecker } = require("../commands/reminders");
const { translate, localTranslate } = require("../commands/translate");
const music = require("../commands/music");

// Cache browser instances to avoid re-creating
let browserCache = null;
let browserLastUsed = 0;
const BROWSER_CACHE_TTL = 300000; // 5 minutes

async function getBrowser() {
  const now = Date.now();
  if (browserCache && (now - browserLastUsed) < BROWSER_CACHE_TTL) {
    browserLastUsed = now;
    return browserCache;
  }
  
  try {
    const { page } = await getOrCreateBrowser();
    browserCache = { page };
    browserLastUsed = now;
    return browserCache;
  } catch (err) {
    console.error("Browser error:", err);
    throw err;
  }
}

async function routeCommand(command, socket) {
  console.log(`⚡ Executing: ${command.type}`);
  let result = { speech: "Command executed." };

  try {
    switch (command.type) {

      // ============ AI TEXT RESPONSE ============
      case "text_response":
        result = { speech: command.text };
        break;

      // ============ TIME & DATE ============
      case "get_time":
      case "time":
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        result = { speech: `It's ${timeString} sir.` };
        break;

      case "get_date":
      case "date":
        const todayDate = new Date();
        
        // English date
        const englishDate = todayDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        // Persian date
        const persianWeekday = todayDate.toLocaleDateString('fa-IR', { weekday: 'long' });
        const persianDay = todayDate.toLocaleDateString('fa-IR', { day: 'numeric' });
        const persianMonth = todayDate.toLocaleDateString('fa-IR', { month: 'long' });
        const persianYear = todayDate.toLocaleDateString('fa-IR', { year: 'numeric' });
        
        const toEnglishDigits = (str) => str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
        
        const persianMonths = {
          'فروردین': 'Farvardin', 'اردیبهشت': 'Ordibehesht', 'خرداد': 'Khordad',
          'تیر': 'Tir', 'مرداد': 'Mordad', 'شهریور': 'Shahrivar',
          'مهر': 'Mehr', 'آبان': 'Aban', 'آذر': 'Azar',
          'دی': 'Dey', 'بهمن': 'Bahman', 'اسفند': 'Esfand'
        };
        
        const persianDays = {
          'شنبه': 'Shanbeh', 'یکشنبه': 'Yekshanbeh', 'دوشنبه': 'Doshanbeh',
          'سه\u200cشنبه': 'Seshanbeh', 'چهارشنبه': 'Chaharshanbeh', 
          'پنجشنبه': 'Panjshanbeh', 'جمعه': 'Jomeh'
        };
        
        const translatedWeekday = persianDays[persianWeekday] || persianWeekday;
        const translatedMonth = persianMonths[persianMonth] || persianMonth;
        const englishDay = toEnglishDigits(persianDay);
        const englishYear = toEnglishDigits(persianYear);
        
        const persianFormatted = `${translatedWeekday}, ${englishDay} ${translatedMonth} ${englishYear}`;
        
        result = { speech: `Gregorian: ${englishDate}. Persian: ${persianFormatted}.` };
        break;

      // ============ TIMER COMMANDS ============
      case "set_timer":
      case "timer":
        const timerRes = runTimer(command, socket);
        result = { speech: timerRes?.speech || "Timer started sir." };
        break;

      case "check_timer":
        const timerCheckResult = checkTimer(socket);
        result = { speech: timerCheckResult?.speech || "No timers running." };
        break;

      case "cancel_timer":
        const timers = getActiveTimers();
        if (timers.length === 0) {
          result = { speech: "No timers are currently running, sir." };
        } else if (timers.length === 1) {
          const cancelResult = cancelTimer(timers[0].id);
          result = { speech: cancelResult?.speech || "Timer cancelled." };
        } else {
          const cancelResult = cancelTimer(timers[timers.length - 1].id);
          result = { speech: cancelResult?.speech || "Timer cancelled." };
        }
        break;

      // ============ APP & WEBSITE COMMANDS ============
      case "open_app":
        const appRes = await openApp(command);
        result = { speech: appRes?.speech || `Opening ${command.app || 'application'}...` };
        break;

      case "open_website":
      case "browser_automation":
        const browserRes = await runBrowserAutomation(command);
        result = { speech: browserRes?.speech || "Opening website..." };
        break;

      case "summarize_page":
        try {
          const { page } = await getBrowser();
          const summary = await summarizeCurrentPage(page);
          result = { speech: summary.speech };
        } catch (err) {
          console.error("Summarize error:", err);
          result = { speech: "No browser page open. Try searching for something first." };
        }
        break;
        
      case "click_result":
        try {
          const { page } = await getBrowser();
          const clickRes = await clickResultNumber(page, command.position);
          result = { speech: clickRes.speech };
        } catch (err) {
          console.error("Click result error:", err);
          result = { speech: "Couldn't click that result sir." };
        }
        break;

      // ============ MUSIC COMMANDS ============
      case "music":
        try {
          switch (command.action) {
            case "play":
              if (command.query) {
                const musicResult = await music.searchAndPlay(command.query, command.folder);
                result = { speech: musicResult.speech };
              } else {
                const playlistResult = await music.playPlaylist();
                result = { speech: playlistResult.speech };
              }
              break;
            case "pause":
              const pauseResult = await music.togglePause();
              result = { speech: pauseResult.speech };
              break;
            case "resume":
              const resumeResult = await music.togglePause();
              result = { speech: resumeResult.speech };
              break;
            case "next":
              const nextResult = await music.nextSong();
              result = { speech: nextResult.speech };
              break;
            case "previous":
              const prevResult = await music.previousSong();
              result = { speech: prevResult.speech };
              break;
            case "stop":
              music.stopMusic();
              result = { speech: "Music stopped sir." };
              break;
            case "playlist":
              if (command.query?.includes("dad")) {
                const dadResult = await music.playDadsPlaylist();
                result = { speech: dadResult.speech };
              } else {
                const listResult = await music.playPlaylist();
                result = { speech: listResult.speech };
              }
              break;
            case "song":
              const songResult = await music.searchAndPlay(command.query);
              result = { speech: songResult.speech };
              break;
            default:
              result = { speech: "What would you like me to do with the music?" };
          }
        } catch (err) {
          console.error("Music error:", err);
          result = { speech: "Couldn't control music sir." };
        }
        break;

      case "play_song":
        try {
          const musicResult = await music.searchAndPlay(command.query, command.folder);
          result = { speech: musicResult.speech };
        } catch (err) {
          console.error("Music error:", err);
          result = { speech: "Couldn't play that song." };
        }
        break;

      case "play_dads_playlist":
        try {
          const dadResult = await music.playDadsPlaylist();
          result = { speech: dadResult.speech };
        } catch (err) {
          console.error("Dad's playlist error:", err);
          result = { speech: "Couldn't play dad's playlist." };
        }
        break;
        
      case "play_playlist":
        try {
          const playlistResult = await music.playPlaylist();
          result = { speech: playlistResult.speech };
        } catch (err) {
          console.error("Playlist error:", err);
          result = { speech: "Couldn't play the playlist." };
        }
        break;
        
      case "next_song":
        try {
          const nextResult = await music.nextSong();
          result = { speech: nextResult.speech };
        } catch (err) {
          console.error("Next song error:", err);
          result = { speech: "Couldn't skip." };
        }
        break;
        
      case "previous_song":
        try {
          const prevResult = await music.previousSong();
          result = { speech: prevResult.speech };
        } catch (err) {
          console.error("Previous song error:", err);
          result = { speech: "Couldn't go back." };
        }
        break;
        
      case "pause_music":
      case "resume_music":
        try {
          const toggleResult = await music.togglePause();
          result = { speech: toggleResult.speech };
        } catch (err) {
          console.error("Pause/resume error:", err);
          result = { speech: "Couldn't toggle music." };
        }
        break;
        
      case "list_songs":
        try {
          const listResult = music.listSongs();
          result = { speech: listResult.speech };
        } catch (err) {
          console.error("List songs error:", err);
          result = { speech: "Couldn't list songs." };
        }
        break;

      case "stop_music":
        try {
          music.stopMusic();
          result = { speech: "Music stopped sir." };
        } catch (err) {
          console.error("Stop music error:", err);
          result = { speech: "Couldn't stop music." };
        }
        break;

      // ============ SYSTEM CONTROL COMMANDS ============
      case "screenshot":
        const screenshot = await systemControl.takeScreenshot(command);
        result = { speech: screenshot.speech };
        break;
        
      case "volume":
        if (command.action === "mute") {
          const mute = await systemControl.muteVolume();
          result = { speech: mute.speech };
        } else if (command.action === "unmute") {
          await systemControl.unmuteVolume();
          result = { speech: "Volume unmuted sir." };
        } else {
          await systemControl.unmuteVolume();
          const volume = await systemControl.setVolume(command);
          result = { speech: volume.speech };
        }
        break;

      case "set_volume":
        await systemControl.unmuteVolume();
        const volume = await systemControl.setVolume(command);
        result = { speech: volume.speech };
        break;

      case "mute":
        const mute = await systemControl.muteVolume();
        result = { speech: mute.speech };
        break;
        
      // ============ FILE OPERATIONS ============
      case "file_operation":
        switch (command.action) {
          case "list":
            const files = await systemControl.listDirectory(command);
            result = { speech: files.speech };
            break;
          case "create":
            const createFile = await systemControl.createFile(command);
            result = { speech: createFile.speech };
            break;
          case "read":
            const readFile = await systemControl.readFile(command);
            result = { speech: readFile.speech };
            break;
          case "delete":
            const deleteFile = await systemControl.deleteFile(command);
            result = { speech: deleteFile.speech };
            break;
          default:
            result = { speech: "What file operation would you like?" };
        }
        break;

      case "list_files":
        const files = await systemControl.listDirectory(command);
        result = { speech: files.speech };
        break;
        
      case "create_file":
        const createFileResult = await systemControl.createFile(command);
        result = { speech: createFileResult.speech };
        break;
        
      case "read_file":
        const readFileResult = await systemControl.readFile(command);
        result = { speech: readFileResult.speech };
        break;
        
      case "delete_file":
        const deleteFileResult = await systemControl.deleteFile(command);
        result = { speech: deleteFileResult.speech };
        break;
        
      case "list_processes":
        const processes = await systemControl.listProcesses();
        result = { speech: processes.speech };
        break;
        
      case "kill_process":
        const kill = await systemControl.killProcess(command);
        result = { speech: kill.speech };
        break;
      
      case "start_process":
        const startResult = await systemControl.startProcess(command);
        result = { speech: startResult?.speech || "Could not start process" };
        break;
        
      case "system_info":
        const sysInfo = await systemControl.getSystemInfo();
        result = { speech: sysInfo.speech };
        break;
        
      case "disk_space":
        const disk = await systemControl.getDiskSpace();
        result = { speech: disk.speech };
        break;
        
      case "execute":
        const execCmd = await systemControl.executeCommand(command);
        result = { speech: execCmd.speech };
        break;

      // ============ SCHEDULE COMMANDS ============
      case "get_schedule":
      case "schedule":
        if (command.action === "next") {
          const nextResult = await getNextActivity();
          result = { speech: nextResult.speech };
        } else if (command.action === "day" && command.day) {
          const dayResult = await getDaySchedule(command.day);
          result = { speech: dayResult.speech };
        } else {
          const scheduleResult = await getTodaySchedule();
          result = { speech: scheduleResult.speech };
        }
        break;
        
      case "next_activity":
        const nextResult = await getNextActivity();
        result = { speech: nextResult.speech };
        break;
        
      case "get_day_schedule":
        const dayResult = await getDaySchedule(command.day);
        result = { speech: dayResult.speech };
        break;

      // ============ NOTES COMMANDS ============
      case "notes":
        switch (command.action) {
          case "add":
            const noteResult = await addNote(command.text);
            result = { speech: noteResult.speech };
            break;
          case "list":
            const notesList = await listNotes();
            result = { speech: notesList.speech };
            break;
          case "delete":
            const deleteResult = await deleteNote(command.index);
            result = { speech: deleteResult.speech };
            break;
          case "clear":
            const clearResult = await clearNotes();
            result = { speech: clearResult.speech };
            break;
          default:
            result = { speech: "What would you like to do with notes?" };
        }
        break;

      case "add_note":
        const noteResult = await addNote(command.text);
        result = { speech: noteResult.speech };
        break;
        
      case "list_notes":
        const notesList = await listNotes();
        result = { speech: notesList.speech };
        break;
        
      case "delete_note":
        const deleteResult = await deleteNote(command.index);
        result = { speech: deleteResult.speech };
        break;
        
      case "clear_notes":
        const clearResult = await clearNotes();
        result = { speech: clearResult.speech };
        break;

      // ============ REMINDERS ============
      case "reminders":
        if (command.action === "add") {
          const reminderResult = await addReminder(command.text, socket);
          result = { speech: reminderResult.speech };
        } else if (command.action === "list") {
          const remindersList = await listReminders();
          result = { speech: remindersList.speech };
        }
        break;

      case "add_reminder":
        const reminderResult = await addReminder(command.text, socket);
        result = { speech: reminderResult.speech };
        break;
        
      case "list_reminders":
        const remindersList = await listReminders();
        result = { speech: remindersList.speech };
        break;

      // ============ TRANSLATION ============
      case "translate":
        const langCode = command.language === 'farsi' || command.language === 'persian' ? 'fa' : 
                         command.language === 'spanish' ? 'es' : command.language;
        
        const onlineResult = await translate(command.text, langCode);
        if (onlineResult.success) {
          const langName = command.language === 'spanish' ? 'Spanish' : 'Persian';
          result = { speech: `In ${langName}: ${onlineResult.translated}` };
        } else {
          const localResult = localTranslate(command.text, langCode);
          if (localResult) {
            const langName = command.language === 'spanish' ? 'Spanish' : 'Persian';
            result = { speech: `In ${langName}: ${localResult}` };
          } else {
            result = { speech: "I couldn't translate that. Try a simpler phrase." };
          }
        }
        break;

      // ============ CAMERA ============
      case "camera":
        if (command.action === "show") {
          socket.emit("showCamera");
          result = { speech: "Camera activated sir." };
        } else {
          socket.emit("hideCamera");
          result = { speech: "Camera hidden." };
        }
        break;

      case "show_camera":
        socket.emit("showCamera");
        result = { speech: "Camera activated sir." };
        break;

      case "hide_camera":
        socket.emit("hideCamera");
        result = { speech: "Camera closed." };
        break;

      // ============ WAKE/SLEEP ============
      case "wake_word":
        result = { speech: command.text };
        break;

      case "lock_jarvis":
        result = { speech: "Going to sleep sir. Say my name when you need me." };
        if (socket) {
          socket.emit("resetWakeWord");
          socket.emit("sleep");
        }
        break;

      // ============ LEGACY TEXT TO SPEECH ============
      case "text_to_speech":
        result = { speech: command.text };
        if (command.followUp) {
          setTimeout(async () => {
            try {
              await routeCommand(command.followUp, socket);
            } catch (err) {
              console.error("Follow-up command failed:", err);
            }
          }, 1000);
        }
        break;

      default:
        console.log("❓ Unknown command type:", command.type);
        result = { speech: "I'm not sure how to handle that yet sir." };
    }
  } catch (err) {
    console.error(`❌ Error executing ${command.type}:`, err);
    result = { speech: "Sorry sir, something went wrong with that command." };
  }

  return result;
}

module.exports = { routeCommand };