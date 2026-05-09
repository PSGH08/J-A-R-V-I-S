const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const execPromise = promisify(exec);
const logger = require("../utils/logger");

// SAFE COMMANDS LIST - These are blocked completely
const BLOCKED_COMMANDS = [
  /format/i, /del \/f/i, /rd \/s/i, /rmdir \/s/i,
  /delete system32/i, /delete windows/i, /format c:/i,
  /shutdown \/r/i, /shutdown \/s/i, /shutdown \/p/i
];

// Check if command is dangerous
function isDangerousCommand(command) {
  return BLOCKED_COMMANDS.some(pattern => pattern.test(command));
}

// Execute PowerShell command safely
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

// ============ FILE OPERATIONS ============

async function listDirectory({ path: dirPath }) {
  try {
    let cleanPath = dirPath.replace(/^["']|["']$/g, '');
    
    // Handle relative paths like "Documents" - resolve to user's actual folder
    if (!cleanPath.includes(':') && !cleanPath.startsWith('/') && !cleanPath.startsWith('\\')) {
      // This is a relative path like "Documents" or "Downloads"
      cleanPath = path.join(os.homedir(), cleanPath);
    }
    
    const fullPath = path.resolve(cleanPath);
    
    const { stdout } = await execPromise(`cmd /c dir "${fullPath}" /b 2>nul`);
    
    if (stdout && stdout.trim()) {
      const files = stdout.trim().split('\r\n').slice(0, 20);
      return { 
        success: true, 
        speech: `Found ${files.length} items in ${dirPath}` 
      };
    }
    return { success: false, speech: `No files found in ${dirPath}` };
    
  } catch (error) {
    logger.error(`List directory error: ${error.message}`);
    return { success: false, speech: `Could not read directory: ${dirPath}` };
  }
}

async function createFile({ path: filePath, content = "" }) {
  try {
    const resolvedPath = path.resolve(filePath);
    await fs.writeFile(resolvedPath, content);
    return { success: true, speech: `Created file ${filePath}` };
  } catch (error) {
    return { success: false, speech: `Failed to create file: ${error.message}` };
  }
}

async function readFile({ path: filePath }) {
  try {
    const resolvedPath = path.resolve(filePath);
    const content = await fs.readFile(resolvedPath, "utf-8");
    return { success: true, speech: `Read file ${filePath}`, data: content };
  } catch (error) {
    return { success: false, speech: `Failed to read file: ${error.message}` };
  }
}

async function deleteFile({ path: filePath }) {
  // Extra safety check
  if (filePath.includes("system32") || filePath.includes("windows")) {
    return { success: false, speech: "I cannot delete system files for security reasons." };
  }
  
  try {
    const resolvedPath = path.resolve(filePath);
    await fs.unlink(resolvedPath);
    return { success: true, speech: `Deleted file ${filePath}` };
  } catch (error) {
    return { success: false, speech: `Failed to delete file: ${error.message}` };
  }
}

// ============ PROCESS MANAGEMENT ============

async function listProcesses() {
  try {
    const { stdout } = await execPromise(`tasklist /fo csv /nh | findstr /v "cmd.exe" | findstr /v "explorer.exe"`);
    const processes = stdout.trim().split('\n').slice(0, 10);
    return { success: true, speech: `Found ${processes.length} processes running` };
  } catch (error) {
    return { success: false, speech: "Could not list processes" };
  }
}

async function killProcess({ name, pid }) {
  if (name) {
    // Safety: Don't kill critical system processes
    const criticalProcesses = ["svchost", "csrss", "winlogon", "services", "lsass", "wininit"];
    if (criticalProcesses.includes(name.toLowerCase())) {
      return { success: false, speech: "I cannot kill critical system processes." };
    }
    
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
  const result = await runPowerShell(`
    Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{Name="Free(GB)";Expression={[math]::Round($_.Free/1GB,2)}}, @{Name="Used(GB)";Expression={[math]::Round($_.Used/1GB,2)}}, @{Name="Total(GB)";Expression={[math]::Round(($_.Free+$_.Used)/1GB,2)}}
  `);
  
  if (result.success) {
    return { success: true, speech: "Disk information retrieved", data: result.output };
  }
  return { success: false, speech: "Could not get disk information" };
}

// ============ WINDOWS MANAGEMENT ============

async function minimizeWindow({ title }) {
  const result = await runPowerShell(`
    Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Window {
        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        [DllImport("user32.dll")]
        public static extern IntPtr FindWindow(string className, string windowName);
      }
"@
    $hwnd = [Window]::FindWindow($null, "${title}")
    if ($hwnd -ne [IntPtr]::Zero) {
      [Window]::ShowWindow($hwnd, 6)
      Write-Output "minimized"
    }
  `);
  
  if (result.output.includes("minimized")) {
    return { success: true, speech: `Minimized ${title}` };
  }
  return { success: false, speech: `Could not find window: ${title}` };
}

async function closeWindow({ title }) {
  const result = await runPowerShell(`
    Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Window {
        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        [DllImport("user32.dll")]
        public static extern IntPtr FindWindow(string className, string windowName);
      }
"@
    $hwnd = [Window]::FindWindow($null, "${title}")
    if ($hwnd -ne [IntPtr]::Zero) {
      [Window]::ShowWindow($hwnd, 0)
      Write-Output "closed"
    }
  `);
  
  if (result.output.includes("closed")) {
    return { success: true, speech: `Closed ${title}` };
  }
  return { success: false, speech: `Could not close window: ${title}` };
}

// ============ EXECUTE COMMANDS (with safety) ============

async function executeCommand({ command }) {
  // Check for dangerous commands
  if (isDangerousCommand(command)) {
    logger.warn(`⚠️ Blocked dangerous command: ${command}`);
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

const nircmdPath = path.join(__dirname, "nircmd.exe");

async function setVolume({ level }) {
  try {
    const volume = Math.min(100, Math.max(0, parseInt(level)));
    const nircmdCmd = `.\\nircmd.exe`;
    
    // Calculate volume value (0-65535 range)
    const volumeValue = Math.floor(volume * 655.35);
    
    await execPromise(`${nircmdCmd} setsysvolume ${volumeValue}`);
    
    logger.log(`🔊 Volume set to ${volume}%`);
    return { success: true, speech: `Volume set to ${volume} percent` };
    
  } catch (error) {
    logger.error(`Volume error: ${error.message}`);
    return { success: false, speech: `I couldn't change the volume.` };
  }
}

async function muteVolume() {
  try {
    const nircmdCmd = `.\\nircmd.exe`;
    await execPromise(`${nircmdCmd} mutesysvolume 1`);
    return { success: true, speech: "Volume muted" };
  } catch (error) {
    return { success: false, speech: "Could not mute volume" };
  }
}

async function unmuteVolume() {
  try {
    const nircmdCmd = `.\\nircmd.exe`;
    await execPromise(`${nircmdCmd} mutesysvolume 0`);
    return { success: true, speech: "Volume unmuted" };
  } catch (error) {
    return { success: false, speech: "Could not unmute" };
  }
}

// ============ SCREENSHOT ============

async function takeScreenshot({ savePath }) {
  try {
    if (!savePath) {
      savePath = path.join(os.homedir(), "Desktop", `screenshot_${Date.now()}.png`);
    }
    
    const nircmdCmd = `.\\nircmd.exe`;
    
    // Use nircmd to take screenshot (most reliable)
    await execPromise(`${nircmdCmd} savescreenshot "${savePath}"`);
    
    logger.log(`📸 Screenshot saved: ${savePath}`);
    return { success: true, speech: `Screenshot saved to your Desktop` };
    
  } catch (error) {
    logger.error(`Screenshot error: ${error.message}`);
    
    // Fallback to PowerShell
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
      return { success: true, speech: `Screenshot saved to your Desktop` };
    } catch (err) {
      return { success: false, speech: "Failed to take screenshot" };
    }
  }
}

module.exports = {
  // File operations
  listDirectory,
  createFile,
  readFile,
  deleteFile,
  
  // Process management
  listProcesses,
  killProcess,
  startProcess,
  
  // System info
  getSystemInfo,
  getDiskSpace,
  
  // Window management
  minimizeWindow,
  closeWindow,
  
  // Volume control
  setVolume,
  muteVolume,
  unmuteVolume,
  
  // Screenshot
  takeScreenshot,
  
  // Execute command with safety
  executeCommand
};