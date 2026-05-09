const { exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);
const logger = require("../utils/logger");

const appCache = new Map();

async function openApp({ app }) {
  const startTime = Date.now();
  const originalApp = app;
  const searchTerm = app.toLowerCase().trim();
  
  logger.log(`🔍 JARVIS: Searching for "${app}"...`);
  
  // Check cache first
  if (appCache.has(searchTerm)) {
    const cached = appCache.get(searchTerm);
    logger.log(`⚡ Using cached location`);
    try {
      await execPromise(`start "" "${cached}"`);
      const duration = Date.now() - startTime;
      logger.log(`✅ ${app} opened in ${duration}ms`);
      return { speech: `Opening ${originalApp}` };
    } catch (err) {
      appCache.delete(searchTerm);
    }
  }
  
  try {
    let foundPath = null;
    
    // Method 1: Search using where command with proper escaping
    logger.log(`🔍 Method 1: Searching Program Files...`);
    
    const searchLocations = [
      `C:\\Program Files`,
      `C:\\Program Files (x86)`,
      `%LOCALAPPDATA%\\Programs`,
      `%APPDATA%`
    ];
    
    for (const location of searchLocations) {
      try {
        const { stdout } = await execPromise(
          `where /R "${location.replace('%LOCALAPPDATA%', process.env.LOCALAPPDATA).replace('%APPDATA%', process.env.APPDATA)}" ${searchTerm}.exe 2>nul`
        );
        if (stdout && stdout.trim()) {
          foundPath = stdout.trim().split('\n')[0];
          logger.log(`📍 Found at: ${foundPath}`);
          break;
        }
      } catch (e) {
        // Continue to next location
      }
    }
    
    // Method 2: Search with wildcard (for app names that don't exactly match the exe)
    if (!foundPath) {
      logger.log(`🔍 Method 2: Searching with wildcard...`);
      for (const location of searchLocations) {
        try {
          const { stdout } = await execPromise(
            `where /R "${location.replace('%LOCALAPPDATA%', process.env.LOCALAPPDATA).replace('%APPDATA%', process.env.APPDATA)}" *${searchTerm}*.exe 2>nul`
          );
          if (stdout && stdout.trim()) {
            const paths = stdout.trim().split('\n');
            // Filter out uninstallers and common non-app exes
            foundPath = paths.find(p => 
              !p.includes('uninstall') && 
              !p.includes('Uninstall') &&
              !p.includes('Update') &&
              !p.includes('Installer')
            ) || paths[0];
            logger.log(`📍 Found at: ${foundPath}`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    // Method 3: Search Start Menu shortcuts
    if (!foundPath) {
      logger.log(`🔍 Method 3: Searching Start Menu...`);
      try {
        const { stdout } = await execPromise(
          `powershell -Command "Get-ChildItem -Path 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\*.lnk' -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*${searchTerm}*' } | Select-Object -First 1 -ExpandProperty FullName"`
        );
        if (stdout && stdout.trim()) {
          const shortcutPath = stdout.trim();
          logger.log(`📍 Found shortcut at: ${shortcutPath}`);
          // Launch the shortcut directly
          await execPromise(`start "" "${shortcutPath}"`);
          appCache.set(searchTerm, shortcutPath);
          const duration = Date.now() - startTime;
          logger.log(`✅ ${app} opened in ${duration}ms`);
          return { speech: `Opening ${originalApp}` };
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Launch if found
    if (foundPath) {
      appCache.set(searchTerm, foundPath);
      await execPromise(`start "" "${foundPath}"`);
      const duration = Date.now() - startTime;
      logger.log(`✅ ${app} opened in ${duration}ms`);
      return { speech: `Opening ${originalApp}` };
    }
    
    // Not found
    logger.error(`❌ Could not find: ${app}`);
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

// Helper function to search by exact process name (for debugging)
async function findProcessByName(processName) {
  try {
    const { stdout } = await execPromise(`tasklist /FI "IMAGENAME eq ${processName}.exe" /NH`);
    return stdout.includes(processName);
  } catch (e) {
    return false;
  }
}

module.exports = { openApp, findProcessByName };