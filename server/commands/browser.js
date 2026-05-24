const { chromium } = require("playwright");
const path = require("path");
const { exec } = require("child_process");
const logger = require("../utils/logger");

// Cache browser instance
let cachedBrowser = null;
let cachedContext = null;
let cachedPage = null;
let lastUseTime = Date.now();

// Keep browser alive for 2 minutes after last use (so commands can chain)
const KEEP_ALIVE_MS = 120000; // 2 minutes

function getSimpleSelector(url) {
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

// Ultra-fast method for simple URLs (uses Windows shell - your default Chrome)
async function openUrlFast(url) {
  return new Promise((resolve) => {
    exec(`start ${url}`, (error) => {
      if (error) {
        logger.error(`Failed to open ${url}: ${error.message}`);
        resolve({ speech: `Failed to open ${url}` });
      } else {
        logger.log(`Quick opened ${url} in your Chrome`);
        resolve({ speech: `Done! You can say "summarize" or "tell me what you see" to get results.` });
      }
    });
  });
}

async function getOrCreateBrowser() {
  if (cachedBrowser && cachedContext && cachedPage) {
    try {
      await cachedPage.evaluate(() => document.title);
      lastUseTime = Date.now();
      return { context: cachedContext, page: cachedPage };
    } catch (e) {
      logger.log("Browser died, creating new instance...");
      cachedBrowser = null;
      cachedContext = null;
      cachedPage = null;
    }
  }
  
  // Use your Chrome profile so you stay logged in
  const userDataDir = path.join(__dirname, "../../.browser-profile");
  
  logger.log("Launching browser with your profile (you'll stay logged in)...");
  
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

// Clean up idle browser - now 2 minutes
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
    // For simple URL open (no actions) - use Windows shell (your Chrome)
    if (!actions || actions.length === 0) {
      logger.log(`Opening ${url} in your default Chrome`);
      return await openUrlFast(url);
    }
    
    // For complex actions, use Playwright with your profile
    logger.log(`Advanced automation for: ${url}`);
    const { page } = await getOrCreateBrowser();
    
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 8000
    }).catch(async () => {
      await page.goto(url, {
        waitUntil: "commit",
        timeout: 8000
      });
    });
    
    await page.waitForTimeout(500);
    
    // Cookie popup handling
    try {
      await page.click('button:has-text("Accept all")', { timeout: 1000 });
    } catch {}
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
          logger.log(`Typed: ${action.value}`);
          
          if (url.includes("google.com")) {
            await page.keyboard.press("Enter");
            logger.log("Auto-submitted search");
          }
        }
        
        if (action.type === "click") {
          await page.locator(action.selector).first().click({ timeout: 2000 });
          logger.log("Clicked");
        }
        
        if (action.type === "press") {
          await page.keyboard.press(action.key);
          logger.log(`Pressed ${action.key}`);
        }
        
      } catch (actionError) {
        logger.error(`Action failed: ${actionError.message}`);
      }
    }
    
    const duration = Date.now() - startTime;
    logger.log(`Browser task completed in ${duration}ms`);
    
    return { speech: `Done!` };
    
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error(`Browser failed after ${duration}ms: ${err.message}`);
    
    if (cachedBrowser) {
      await cachedBrowser.close().catch(() => {});
      cachedBrowser = null;
      cachedContext = null;
      cachedPage = null;
    }
    
    return { speech: `Sorry, couldn't do that.` };
  }
}

// Summarize current page
async function summarizeCurrentPage(page) {
  try {
    const title = await page.title();
    const url = page.url();
    
    let summary = '';
    
    if (url.includes('google.com/search')) {
      // Extract Google search results
      const results = await page.evaluate(() => {
        const searchResults = [];
        const resultDivs = document.querySelectorAll('div.g, div[data-hveid], div.MjjYud');
        
        resultDivs.forEach((div, index) => {
          if (index >= 5) return;
          
          const titleEl = div.querySelector('h3');
          const linkEl = div.querySelector('a[href^="http"]');
          const snippetEl = div.querySelector('div.VwiC3b, span.aCOpRe, div[data-sncf], span.st');
          
          if (titleEl && linkEl) {
            searchResults.push({
              title: titleEl.innerText,
              url: linkEl.href,
              snippet: snippetEl ? snippetEl.innerText.substring(0, 150) : 'No description'
            });
          }
        });
        
        return searchResults;
      });
      
      if (results.length > 0) {
        summary = `Here's what I found:\n\n`;
        results.forEach((r, i) => {
          summary += `${i + 1}. ${r.title}\n   ${r.snippet}\n\n`;
        });
        summary += `Say "click first result" or "click page 2" to navigate.`;
      } else {
        summary = `I'm on Google results but couldn't read them.`;
      }
    } else if (url === 'about:blank') {
      summary = "No page is loaded. Try searching for something first.";
    } else {
      const content = await page.evaluate(() => {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) return metaDesc.getAttribute('content');
        const firstP = document.querySelector('p');
        if (firstP) return firstP.innerText.substring(0, 300);
        return document.body ? document.body.innerText.substring(0, 200) : '';
      });
      summary = `Page: ${title}\n\n${content}`;
    }
    
    return { speech: summary };
  } catch (error) {
    logger.error(`Summarize failed: ${error.message}`);
    return { speech: "I couldn't read the page. Make sure a page is loaded." };
  }
}

// Click Google page number
async function clickGooglePage(page, pageNumber) {
  try {
    const currentUrl = page.url();
    
    if (!currentUrl.includes('google.com/search')) {
      return { speech: "You need to be on a Google search results page first." };
    }
    
    const clicked = await page.evaluate((num) => {
      // Try aria-label
      let links = document.querySelectorAll(`a[aria-label="Page ${num}"]`);
      if (links.length > 0) {
        links[0].click();
        return true;
      }
      
      // Try text content in pagination
      const allLinks = document.querySelectorAll('a');
      for (const link of allLinks) {
        if (link.textContent.trim() === String(num) && link.href.includes('start=')) {
          link.click();
          return true;
        }
        const span = link.querySelector('span');
        if (span && span.textContent.trim() === String(num)) {
          link.click();
          return true;
        }
      }
      
      return false;
    }, pageNumber);
    
    if (clicked) {
      await page.waitForTimeout(1500);
      return { speech: `Navigated to page ${pageNumber}` };
    } else {
      return { speech: `Couldn't find page ${pageNumber}` };
    }
  } catch (error) {
    logger.error(`Click page failed: ${error.message}`);
    return { speech: `Failed to navigate to page ${pageNumber}` };
  }
}

// Click result number
async function clickResultNumber(page, position) {
  try {
    const currentUrl = page.url();
    
    if (!currentUrl.includes('google.com/search')) {
      return { speech: "You need to be on a Google search results page first." };
    }
    
    const clicked = await page.evaluate((pos) => {
      const containers = document.querySelectorAll('div.g, div[data-hveid], div.MjjYud');
      const mainLinks = [];
      
      containers.forEach(container => {
        const link = container.querySelector('a[href^="http"]:not([href*="google.com"])');
        const title = container.querySelector('h3');
        if (link && title && !mainLinks.includes(link)) {
          mainLinks.push(link);
        }
      });
      
      if (mainLinks.length >= pos) {
        mainLinks[pos - 1].click();
        return true;
      }
      
      return false;
    }, position);
    
    if (clicked) {
      await page.waitForTimeout(1500);
      return { speech: `Clicked result ${position}` };
    } else {
      return { speech: `Couldn't find result ${position}` };
    }
  } catch (error) {
    logger.error(`Click result failed: ${error.message}`);
    return { speech: `Failed to click result ${position}` };
  }
}

// Clean up on exit
process.on('exit', () => {
  if (cachedBrowser) {
    cachedBrowser.close().catch(() => {});
  }
});

module.exports = { 
  runBrowserAutomation,
  getOrCreateBrowser,
  summarizeCurrentPage,
  clickGooglePage,
  clickResultNumber
};