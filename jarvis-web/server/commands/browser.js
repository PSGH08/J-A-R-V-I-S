const { chromium } = require("playwright");
const path = require("path");
const { exec } = require("child_process");
const logger = require("../utils/logger");

// Cache browser instance (reuse instead of creating new each time)
let cachedBrowser = null;
let cachedContext = null;
let cachedPage = null;
let lastUseTime = Date.now();

// Keep browser alive for 30 seconds after last use
const KEEP_ALIVE_MS = 30000;

function getSimpleSelector(url) {
  // Fast selectors without waiting
  if (url.includes("google.com")) {
    return 'textarea[name="q"], input[name="q"]';
  }
  if (url.includes("youtube.com")) {
    return 'input[name="search_query"]';
  }
  if (url.includes("github.com")) {
    return 'input[name="q"]';
  }
  return null;
}

// Ultra-fast method for simple URLs (uses Windows shell, no Playwright)
async function openUrlFast(url) {
  return new Promise((resolve) => {
    exec(`start ${url}`, (error) => {
      if (error) {
        logger.error(`Failed to open ${url}: ${error.message}`);
        resolve({ speech: `Failed to open ${url}` });
      } else {
        logger.log(`✅ Quick opened ${url}`);
        resolve({ speech: `Opening ${url}` });
      }
    });
  });
}

async function getOrCreateBrowser() {
  // Only create browser if we need it for actions
  if (cachedBrowser && cachedContext && cachedPage) {
    try {
      await cachedPage.evaluate(() => true);
      lastUseTime = Date.now();
      return { context: cachedContext, page: cachedPage };
    } catch (e) {
      logger.log("Browser died, creating new instance...");
      cachedBrowser = null;
      cachedContext = null;
      cachedPage = null;
    }
  }
  
  // Create new browser instance only when needed
  const userDataDir = path.join(__dirname, "../../.browser-profile");
  
  logger.log("Launching browser for advanced automation...");
  
  cachedContext = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: "chrome",
    args: [
      "--start-maximized",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=TranslateUI",
      "--no-first-run",
      "--fast-start"
    ],
    viewport: null,
    timeout: 10000
  });
  
  cachedBrowser = cachedContext.browser();
  
  const pages = cachedContext.pages();
  cachedPage = pages.length ? pages[0] : await cachedContext.newPage();
  
  cachedPage.setDefaultTimeout(5000);
  cachedPage.setDefaultNavigationTimeout(10000);
  
  lastUseTime = Date.now();
  
  return { context: cachedContext, page: cachedPage };
}

// Clean up idle browser
setInterval(() => {
  if (cachedBrowser && (Date.now() - lastUseTime) > KEEP_ALIVE_MS) {
    logger.log("Closing idle browser...");
    cachedBrowser.close().catch(() => {});
    cachedBrowser = null;
    cachedContext = null;
    cachedPage = null;
  }
}, 10000);

async function runBrowserAutomation({ url, actions = [] }) {
  const startTime = Date.now();
  
  try {
    // For simple URL open (no actions) - use Windows shell (NO Playwright)
    if (!actions || actions.length === 0) {
      logger.log(`🚀 Opening ${url} in default browser`);
      return await openUrlFast(url);
    }
    
    // ONLY for complex actions, use Playwright
    logger.log(`🌐 Advanced automation for: ${url}`);
    const { page } = await getOrCreateBrowser();
    
    await page.goto(url, {
      waitUntil: "commit",
      timeout: 5000
    }).catch(async () => {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 5000
      });
    });
    
    await page.waitForTimeout(300);
    
    // Cookie popup handling
    try {
      await page.click('button:has-text("Accept")', { timeout: 1000 });
    } catch {}
    try {
      await page.click('button:has-text("I agree")', { timeout: 1000 });
    } catch {}
    
    // Execute actions
    for (const action of actions) {
      try {
        if (action.type === "fill") {
          let selector = action.selector;
          const simpleSelector = getSimpleSelector(url);
          if (simpleSelector) {
            selector = simpleSelector;
          }
          
          const locator = page.locator(selector).first();
          await locator.waitFor({ state: "visible", timeout: 2000 });
          await page.waitForTimeout(100);
          await locator.click({ clickCount: 3 });
          await locator.fill(action.value);
          logger.log(`✅ Typed: ${action.value}`);
          
          if (url.includes("google.com")) {
            await page.keyboard.press("Enter");
            logger.log("✅ Auto-submitted search");
          }
        }
        
        if (action.type === "click") {
          await page.locator(action.selector).first().click({ timeout: 2000 });
          logger.log("✅ Clicked");
        }
        
        if (action.type === "press") {
          await page.keyboard.press(action.key);
          logger.log(`✅ Pressed ${action.key}`);
        }
        
      } catch (actionError) {
        logger.error(`Action failed: ${actionError.message}`);
      }
    }
    
    const duration = Date.now() - startTime;
    logger.log(`✅ Browser task completed in ${duration}ms`);
    
    return { speech: `Opening ${url}` };
    
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error(`Browser failed after ${duration}ms: ${err.message}`);
    
    if (cachedBrowser) {
      await cachedBrowser.close().catch(() => {});
      cachedBrowser = null;
      cachedContext = null;
      cachedPage = null;
    }
    
    return { speech: `Sorry, couldn't open ${url}` };
  }
}

// Clean up on exit
process.on('exit', () => {
  if (cachedBrowser) {
    cachedBrowser.close().catch(() => {});
  }
});

module.exports = { runBrowserAutomation };