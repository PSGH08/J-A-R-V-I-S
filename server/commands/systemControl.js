// server/commands/systemControl.js
// System operations: file management, process control, volume, screenshots, and safe command execution
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const execPromise = promisify(exec);
const logger = require("../utils/logger");

// Patterns for commands that are blocked for safety
const BLOCKED_COMMANDS = [
  /format/i, /del \/f/i, /rd \/s/i, /rmdir \/s/i,
  /delete system32/i, /delete windows/i, /format c:/i,
  /shutdown \/r/i, /shutdown \/s/i, /shutdown \/p/i
];

// Critical system processes that cannot be killed
const CRITICAL_PROCESSES = ["svchost", "csrss", "winlogon", "services", "lsass", "wininit"];

const NIRCMD_PATH = ".\\nircmd.exe";
const MAX_VOLUME = 65535;
const VOLUME_SCALE = 655.35;

// Checks if a command matches any blocked pattern
function isDangerousCommand(command) {
  return BLOCKED_COMMANDS.some(pattern => pattern.test(command));
}

// Executes a PowerShell script with optional admin privileges
async function runPowerShell(script, requiresAdmin = false) {
  try {
    const adminFlag = requiresAdmin ? "-NoProfile -ExecutionPolicy Bypass " : "";
    const { stdout, stderr } = await execPromise(
      `powershell ${adminFlag}-Command "${script.replace(/"/g, '\\"')}"`
    );
    return { success: true, output: stdout, error: stderr };
  } catch (error) {
    return { success: false, output: error.stdout, error: error.stderr || error.message };
  }
}

// Resolves a path, defaulting relative paths to user's home directory
function resolvePath(inputPath) {
  let cleanPath = inputPath.replace(/^["']|["']$/g, '');
  
  if (!cleanPath.match(/^[a-zA-Z]:/) && !cleanPath.startsWith('/') && !cleanPath.startsWith('\\')) {
    cleanPath = path.join(os.homedir(), cleanPath);
  }
  
  return path.resolve(cleanPath);
}

// ============ FILE OPERATIONS ============

async function listDirectory({ path: dirPath }) {
  try {
    const fullPath = resolvePath(dirPath);
    const files = await fs.readdir(fullPath);
    const fileList = files.slice(0, 20).join(', ');
    return { 
      success: true, 
      speech: `Found ${files.length} items in ${dirPath}: ${fileList}` 
    };
  } catch (error) {
    return { success: false, speech: `Could not read directory: ${dirPath}` };
  }
}

async function createFile({ path: filePath, content = "" }) {
  try {
    const fullPath = resolvePath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    return { success: true, speech: `Created file at ${fullPath}` };
  } catch (error) {
    return { success: false, speech: `Failed to create file: ${error.message}` };
  }
}

async function readFile({ path: filePath }) {
  try {
    const fullPath = resolvePath(filePath);
    const content = await fs.readFile(fullPath, "utf-8");
    const preview = content.substring(0, 200) + (content.length > 200 ? '...' : '');
    return { success: true, speech: `File contents: ${preview}` };
  } catch (error) {
    return { success: false, speech: `Failed to read file: ${error.message}` };
  }
}

async function deleteFile({ path: filePath }) {
  if (filePath.toLowerCase().includes("system32") || filePath.toLowerCase().includes("windows")) {
    return { success: false, speech: "I cannot delete system files for security reasons." };
  }
  
  try {
    const fullPath = resolvePath(filePath);
    await fs.unlink(fullPath);
    return { success: true, speech: `Deleted file ${fullPath}` };
  } catch (error) {
    return { success: false, speech: `Failed to delete file: ${error.message}` };
  }
}

// ============ PROCESS MANAGEMENT ============

async function listProcesses() {
  try {
    const { stdout } = await execPromise(`tasklist /fo csv /nh`);
    const lines = stdout.trim().split('\n').filter(l => l.trim());
    
    const processes = lines.map(line => {
      const parts = line.replace(/"/g, '').split(',');
      return {
        name: parts[0]?.trim(),
        pid: parts[1]?.trim(),
        memory: parts[4]?.trim() + ' K'
      };
    }).filter(p => p.name && !['cmd.exe', 'explorer.exe', 'svchost.exe'].includes(p.name.toLowerCase()));
    
    const topProcesses = processes.slice(0, 15);
    const list = topProcesses.map(p => `${p.name} (${p.memory})`).join(', ');
    
    return { success: true, speech: `${processes.length} processes running. Top memory users: ${list}` };
  } catch (error) {
    return { success: false, speech: "Could not list processes" };
  }
}

async function killProcess({ name, pid }) {
  if (name && CRITICAL_PROCESSES.includes(name.toLowerCase())) {
    return { success: false, speech: "I cannot kill critical system processes." };
  }
  
  if (name) {
    const result = await runPowerShell(`Stop-Process -Name "${name}" -Force`);
    if (result.success) {
      return { success: true, speech: `Stopped process ${name}` };
    }
  } else if (pid) {
    const result = await runPowerShell(`Stop-Process -Id ${pid} -Force`);
    if (result.success) {
      return { success: true, speech: `Stopped process with ID ${pid}` };
    }
  }
  return { success: false, speech: "Could not stop the process" };
}

async function startProcess({ command }) {
  try {
    await execPromise(`start ${command}`);
    return { success: true, speech: `Started ${command}` };
  } catch (error) {
    return { success: false, speech: `Failed to start: ${error.message}` };
  }
}

// ============ SYSTEM INFORMATION ============

async function getSystemInfo() {
  try {
    const hostname = os.hostname();
    const platform = os.platform();
    const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
    const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024);
    const uptime = Math.floor(os.uptime() / 60 / 60);
    
    return { 
      success: true, 
      speech: `${hostname}, ${platform}, ${totalMem}GB RAM, ${freeMem}GB free, up for ${uptime} hours`
    };
  } catch (error) {
    return { success: false, speech: "Could not get system info" };
  }
}

async function getDiskSpace() {
  try {
    const { stdout } = await execPromise(
      `powershell -Command "Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Used -gt 0} | ForEach-Object { Write-Output ($_.Name + ',' + [math]::Round($_.Free/1GB,1) + ',' + [math]::Round(($_.Used+$_.Free)/1GB,1) + ',' + [math]::Round(($_.Free/($_.Used+$_.Free))*100,0)) }"`
    );
    
    const lines = stdout.trim().split('\n').filter(l => l.trim() && l.includes(','));
    
    if (lines.length === 0) {
      return { success: false, speech: "No drives found" };
    }
    
    let speech = "";
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 4) {
        const [drive, freeGB, totalGB, percentFree] = parts;
        speech += `${drive} drive: ${freeGB}GB free of ${totalGB}GB (${percentFree}% free). `;
      }
    }
    
    return { success: true, speech: speech.trim() };
  } catch (error) {
    return { success: false, speech: "Could not get disk information" };
  }
}

// ============ SAFE COMMAND EXECUTION ============

async function executeCommand({ command }) {
  if (isDangerousCommand(command)) {
    logger.warn(`Blocked dangerous command: ${command}`);
    return { 
      success: false, 
      speech: "I cannot execute that command for security reasons." 
    };
  }
  
  try {
    const { stdout, stderr } = await execPromise(command);
    return { 
      success: true, 
      speech: stderr ? "Command completed with warnings" : "Command executed successfully",
      output: stdout,
      error: stderr
    };
  } catch (error) {
    return { 
      success: false, 
      speech: `Command failed: ${error.message}`,
      error: error.message
    };
  }
}

// ============ VOLUME CONTROL ============

async function setVolume({ level }) {
  try {
    const volume = Math.min(100, Math.max(0, parseInt(level)));
    const volumeValue = Math.floor(volume * VOLUME_SCALE);
    
    await execPromise(`${NIRCMD_PATH} setsysvolume ${volumeValue}`);
    
    logger.log(`🔊 Volume set to ${volume}%`);
    return { success: true, speech: `Volume set to ${volume} percent` };
    
  } catch (error) {
    logger.error(`Volume error: ${error.message}`);
    return { success: false, speech: `I couldn't change the volume.` };
  }
}

async function muteVolume() {
  try {
    await execPromise(`${NIRCMD_PATH} mutesysvolume 1`);
    return { success: true, speech: "Volume muted" };
  } catch (error) {
    return { success: false, speech: "Could not mute volume" };
  }
}

async function unmuteVolume() {
  try {
    await execPromise(`${NIRCMD_PATH} mutesysvolume 0`);
    return { success: true, speech: "Volume unmuted" };
  } catch (error) {
    return { success: false, speech: "Could not unmute" };
  }
}

// ============ SCREENSHOT ============

async function takeScreenshot({ savePath }) {
  try {
    if (!savePath) {
      savePath = `C:\\Users\\parsa\\Pictures\\screenshot_${Date.now()}.png`;
    }
    
    const dir = path.dirname(savePath);
    await fs.mkdir(dir, { recursive: true });
    
    await execPromise(`${NIRCMD_PATH} savescreenshot "${savePath}"`);
    
    return { success: true, speech: `Screenshot saved to Pictures folder` };
    
  } catch (error) {
    // Fallback to PowerShell screenshot method
    try {
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $screen = [System.Windows.Forms.SystemInformation]::VirtualScreen
        $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($screen.X, $screen.Y, 0, 0, $bitmap.Size)
        $bitmap.Save("${savePath}")
        $graphics.Dispose()
        $bitmap.Dispose()
      `;
      await execPromise(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`);
      return { success: true, speech: `Screenshot saved to Pictures folder` };
    } catch (err) {
      return { success: false, speech: "Failed to take screenshot" };
    }
  }
}

module.exports = {
  listDirectory,
  createFile,
  readFile,
  deleteFile,
  listProcesses,
  killProcess,
  startProcess,
  getSystemInfo,
  getDiskSpace,
  setVolume,
  muteVolume,
  unmuteVolume,
  takeScreenshot,
  executeCommand
};