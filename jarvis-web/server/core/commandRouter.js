const { runTimer, checkTimer, cancelTimer, getActiveTimers } = require("../commands/timer");
const { openApp } = require("../commands/appControl");
const { runBrowserAutomation } = require("../commands/browser");
const systemControl = require("../commands/systemControl");

async function routeCommand(command, socket) {
  let result = { speech: "Command executed." };

  switch (command.type) {

    case "wake_word":
    result = { speech: command.text };
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

    case "open_spotify":
      try {
        const spotifyResult = await runBrowserAutomation({
          type: "browser_automation",
          url: command.url,
          actions: []
        });
        if (!command.isFollowUp) {
          result = { speech: spotifyResult?.speech || "Opening Spotify" };
        }
      } catch (err) {
        console.error("Failed to open Spotify:", err);
        if (!command.isFollowUp) {
          result = { speech: "Sorry, couldn't open Spotify" };
        }
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

    default:
      console.log("Unknown command:", command);
      result = { speech: "I didn't understand that command" };
  }

  return result;
}

module.exports = { routeCommand };