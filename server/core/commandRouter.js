const { runTimer, checkTimer, cancelTimer, getActiveTimers } = require("../commands/timer");
const { openApp } = require("../commands/appControl");
const { runBrowserAutomation } = require("../commands/browser");
const systemControl = require("../commands/systemControl");
const { getTodaySchedule, getDaySchedule, getNextActivity } = require("../commands/schedule");
const { addNote, listNotes, deleteNote, clearNotes } = require("../commands/notes");
const { addReminder, listReminders, startReminderChecker } = require("../commands/reminders");
const { translate, localTranslate } = require("../commands/translate");
const music = require("../commands/music");

async function routeCommand(command, socket) {
  let result = { speech: "Command executed." };

  switch (command.type) {

    case "wake_word":
      result = { speech: command.text };
      break;

    case "lock_jarvis":
      result = { speech: "Locked, sir. Say Jarvis when you need me again." };
      // Also need to reset the wake word - emit to socket
      if (socket) {
        socket.emit("resetWakeWord");
      }
      break;

    case "get_schedule":
      const scheduleResult = await getTodaySchedule();
      result = { speech: scheduleResult.speech };
      break;
      
    case "next_activity":
      const nextResult = await getNextActivity();
      result = { speech: nextResult.speech };
      break;
      
    case "get_day_schedule":
      const dayResult = await getDaySchedule(command.day);
      result = { speech: dayResult.speech };
      break;
    
    case "time":
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      result = { speech: `It's ${timeString}` };
      break;

    case "get_date":
      const todayDate = new Date();
      
      // American/English date
      const englishDate = todayDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Persian/Shamsi date — get individual parts
      const persianWeekday = todayDate.toLocaleDateString('fa-IR', { weekday: 'long' });
      const persianDay = todayDate.toLocaleDateString('fa-IR', { day: 'numeric' });
      const persianMonth = todayDate.toLocaleDateString('fa-IR', { month: 'long' });
      const persianYear = todayDate.toLocaleDateString('fa-IR', { year: 'numeric' });
      
      // Convert Persian/Arabic digits to English
      const toEnglishDigits = (str) => str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
      
      // Persian month names in English
      const persianMonths = {
        'فروردین': 'Farvardin', 'اردیبهشت': 'Ordibehesht', 'خرداد': 'Khordad',
        'تیر': 'Tir', 'مرداد': 'Mordad', 'شهریور': 'Shahrivar',
        'مهر': 'Mehr', 'آبان': 'Aban', 'آذر': 'Azar',
        'دی': 'Dey', 'بهمن': 'Bahman', 'اسفند': 'Esfand'
      };
      
      // Persian weekday names in English
      const persianDays = {
        'شنبه': 'Shanbeh', 'یکشنبه': 'Yekshanbeh', 'دوشنبه': 'Doshanbeh',
        'سه\u200cشنبه': 'Seshanbeh', 'چهارشنبه': 'Chaharshanbeh', 'پنجشنبه': 'Panjshanbeh', 'جمعه': 'Jomeh'
      };
      
      const translatedWeekday = persianDays[persianWeekday] || persianWeekday;
      const translatedMonth = persianMonths[persianMonth] || persianMonth;
      const englishDay = toEnglishDigits(persianDay);
      const englishYear = toEnglishDigits(persianYear);
      
      const persianFormatted = `${translatedWeekday}, ${englishDay} ${translatedMonth} ${englishYear}`;
      
      result = { speech: `Gregorian: ${englishDate}. Persian: ${persianFormatted}.` };
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
      
    case "add_reminder":
      const reminderResult = await addReminder(command.text, socket);
      result = { speech: reminderResult.speech };
      break;
      
    case "list_reminders":
      const remindersList = await listReminders();
      result = { speech: remindersList.speech };
      break;
      
    case "translate":
      // Try online first, fall back to local dictionary
      const onlineResult = await translate(command.text, command.language === 'farsi' ? 'fa' : command.language === 'persian' ? 'fa' : 'es');
      if (onlineResult.success) {
        const langName = command.language === 'spanish' ? 'Spanish' : 'Persian';
        result = { speech: `In ${langName}: ${onlineResult.translated}` };
      } else {
        const localResult = localTranslate(command.text, command.language === 'farsi' || command.language === 'persian' ? 'fa' : 'es');
        if (localResult) {
          const langName = command.language === 'spanish' ? 'Spanish' : 'Persian';
          result = { speech: `In ${langName}: ${localResult}` };
        } else {
          result = { speech: "I couldn't translate that. Try a simpler phrase." };
        }
      }
      break;

    case "timer":
      const timerRes = runTimer(command, socket);
      result = { speech: timerRes?.speech || "Timer started" };
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
        // Cancel the most recent timer
        const cancelResult = cancelTimer(timers[timers.length - 1].id);
        result = { speech: cancelResult?.speech || "Timer cancelled." };
      }
      break;

    case "open_app":
      const appRes = await openApp(command);
      result = { speech: appRes?.speech || "Opening application" };
      break;

    case "browser_automation":
      const browserRes = await runBrowserAutomation(command);
      result = { speech: browserRes?.speech || "Opening website" };
      break;

    case "summarize_page":
      try {
        const { getOrCreateBrowser, summarizeCurrentPage } = require("../commands/browser");
        const { page } = await getOrCreateBrowser();
        const summary = await summarizeCurrentPage(page);
        result = { speech: summary.speech };
      } catch (err) {
        console.error("Summarize error:", err);
        result = { speech: "No browser page open. Try searching for something first." };
      }
      break;
      
    case "click_result":
      try {
        const { getOrCreateBrowser, clickResultNumber } = require("../commands/browser");
        const { page } = await getOrCreateBrowser();
        const clickRes = await clickResultNumber(page, command.position);
        result = { speech: clickRes.speech };
      } catch (err) {
        console.error("Click result error:", err);
        result = { speech: "Couldn't click that result." };
      }
      break;

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

    case "play_song":
      try {
        // Use the imported music module, not a new require
        const musicResult = await music.searchAndPlay(command.query, command.folder);
        result = { speech: musicResult.speech };
      } catch (err) {
        console.error("Music error:", err);
        result = { speech: "Couldn't play that song." };
      }
      break;

    case "play_dads_playlist":
      try {
        // Use the imported music module
        const dadResult = await music.playDadsPlaylist();
        result = { speech: dadResult.speech };
      } catch (err) {
        console.error("Dad's playlist error:", err);
        result = { speech: "Couldn't play dad's playlist." };
      }
      break;
      
    case "play_playlist":
      try {
        // Use the imported music module
        const playlistResult = await music.playPlaylist();
        result = { speech: playlistResult.speech };
      } catch (err) {
        console.error("Playlist error:", err);
        result = { speech: "Couldn't play the playlist." };
      }
      break;
      
    case "next_song":
      try {
        // Use the imported music module
        const nextResult = await music.nextSong();
        result = { speech: nextResult.speech };
      } catch (err) {
        console.error("Next song error:", err);
        result = { speech: "Couldn't skip." };
      }
      break;
      
    case "previous_song":
      try {
        // Use the imported music module
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
        // Use the imported music module
        const pauseResult = await music.togglePause();
        result = { speech: pauseResult.speech };
      } catch (err) {
        console.error("Pause/resume error:", err);
        result = { speech: "Couldn't pause/resume." };
      }
      break;
      
    case "list_songs":
      try {
        // Use the imported music module
        const listResult = music.listSongs();
        result = { speech: listResult.speech };
      } catch (err) {
        console.error("List songs error:", err);
        result = { speech: "Couldn't list songs." };
      }
      break;

    case "stop_music":
      try {
        // Use the imported music module
        music.stopMusic();
        result = { speech: "Music stopped." };
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
      
    case "set_volume":
      await systemControl.unmuteVolume();
      const volume = await systemControl.setVolume(command);
      result = { speech: volume.speech };
      break;

    case "mute":
      const mute = await systemControl.muteVolume();
      result = { speech: mute.speech };
      break;
      
    case "list_files":
      const files = await systemControl.listDirectory(command);
      result = { speech: files.speech };
      break;
      
    case "create_file":
      const createFile = await systemControl.createFile(command);
      result = { speech: createFile.speech };
      break;
      
    case "read_file":
      const readFile = await systemControl.readFile(command);
      result = { speech: readFile.speech };
      break;
      
    case "delete_file":
      const deleteFile = await systemControl.deleteFile(command);
      result = { speech: deleteFile.speech };
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

    case "text_response":
      result = { speech: command.text };
      break;
      
    case "show_camera":
      socket.emit("showCamera");
      result = { speech: "Camera activated, sir." };
      break;

    case "hide_camera":
      socket.emit("hideCamera");
      result = { speech: "Camera closed." };
      break;

    default:
      console.log("Unknown command:", command);
      result = { speech: "I didn't understand that command" };
  }

  return result;
}

module.exports = { routeCommand };