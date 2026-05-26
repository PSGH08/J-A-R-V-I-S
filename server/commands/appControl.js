// server/commands/appControl.js
// Searches and launches applications on Windows with caching for performance
const { exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);
const logger = require("../utils/logger");

const appCache = new Map();

// Common Windows search locations for installed applications
const SEARCH_LOCATIONS = [
  `C:\\Program Files`,
  `C:\\Program Files (x86)`,
  `%LOCALAPPDATA%\\Programs`,
  `%APPDATA%`
];

// Resolves environment variables in paths
function resolvePath(path) {
  return path
    .replace('%LOCALAPPDATA%', process.env.LOCALAPPDATA)
    .replace('%APPDATA%', process.env.APPDATA);
}

// Filters out common non-application executables
function isValidAppPath(path) {
  return !path.includes('uninstall') && 
         !path.includes('Uninstall') &&
         !path.includes('Update') &&
         !path.includes('Installer');
}

async function openApp({ app }) {
  const startTime = Date.now();
  const originalApp = app;
  const searchTerm = app.toLowerCase().trim();
  
  logger.log(`JARVIS: Searching for "${app}"...`);
  
  // Check cache first
  if (appCache.has(searchTerm)) {
    const cached = appCache.get(searchTerm);
    logger.log(`Using cached location`);
    try {
      await execPromise(`start "" "${cached}"`);
      const duration = Date.now() - startTime;
      logger.log(`${app} opened in ${duration}ms`);
      return { speech: `Opening ${originalApp}` };
    } catch (err) {
      appCache.delete(searchTerm);
    }
  }
  
  try {
    let foundPath = null;
    
    // Method 1: Exact executable name search
    logger.log(`Method 1: Searching Program Files...`);
    for (const location of SEARCH_LOCATIONS) {
      try {
        const { stdout } = await execPromise(
          `where /R "${resolvePath(location)}" ${searchTerm}.exe 2>nul`
        );
        if (stdout && stdout.trim()) {
          foundPath = stdout.trim().split('\n')[0];
          logger.log(`Found at: ${foundPath}`);
          break;
        }
      } catch (e) {
        // Continue to next location
      }
    }
    
    // Method 2: Wildcard search for partial matches
    if (!foundPath) {
      logger.log(`Method 2: Searching with wildcard...`);
      for (const location of SEARCH_LOCATIONS) {
        try {
          const { stdout } = await execPromise(
            `where /R "${resolvePath(location)}" *${searchTerm}*.exe 2>nul`
          );
          if (stdout && stdout.trim()) {
            const paths = stdout.trim().split('\n');
            foundPath = paths.find(isValidAppPath) || paths[0];
            logger.log(`Found at: ${foundPath}`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    // Method 3: Search Start Menu shortcuts
    if (!foundPath) {
      logger.log(`Method 3: Searching Start Menu...`);
      try {
        const { stdout } = await execPromise(
          `powershell -Command "Get-ChildItem -Path 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\*.lnk' -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*${searchTerm}*' } | Select-Object -First 1 -ExpandProperty FullName"`
        );
        if (stdout && stdout.trim()) {
          const shortcutPath = stdout.trim();
          logger.log(`Found shortcut at: ${shortcutPath}`);
          await execPromise(`start "" "${shortcutPath}"`);
          appCache.set(searchTerm, shortcutPath);
          const duration = Date.now() - startTime;
          logger.log(`${app} opened in ${duration}ms`);
          return { speech: `Opening ${originalApp}` };
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Launch if found via Method 1 or 2
    if (foundPath) {
      appCache.set(searchTerm, foundPath);
      await execPromise(`start "" "${foundPath}"`);
      const duration = Date.now() - startTime;
      logger.log(`${app} opened in ${duration}ms`);
      return { speech: `Opening ${originalApp}` };
    }
    
    // App not found
    logger.error(`Could not find: ${app}`);
    return { 
      speech: `I searched everywhere but couldn't find ${originalApp} on your system. Is it installed? Try typing the exact name like "TeamSpeak 3" or check if it's in your Program Files folder.` 
    };
    
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    return { 
      speech: `Something went wrong while searching for ${originalApp}. Make sure it's installed and try again.` 
    };
  }
}

// Helper function to check if a process is running by name
async function findProcessByName(processName) {
  try {
    const { stdout } = await execPromise(`tasklist /FI "IMAGENAME eq ${processName}.exe" /NH`);
    return stdout.includes(processName);
  } catch (e) {
    return false;
  }
}

module.exports = { openApp, findProcessByName };