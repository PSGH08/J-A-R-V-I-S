// server/commands/browser.js
// Browser automation using Playwright with persistent Chrome profile and Google search support
const { chromium } = require("playwright");
const path = require("path");
const { exec } = require("child_process");
const logger = require("../utils/logger");

const KEEP_ALIVE_MS = 120000; // 2 minutes
const USER_DATA_DIR = path.join(__dirname, "../../.browser-profile");

// Cached browser instance for performance
let cachedBrowser = null;
let cachedContext = null;
let cachedPage = null;
let lastUseTime = Date.now();

// Common site-specific search selectors
const SEARCH_SELECTORS = {
  "google.com": 'textarea[name="q"], input[name="q"]',
  "youtube.com": 'input[name="search_query"]',
  "github.com": 'input[name="q"]'
};

// Returns the search input selector for known sites
function getSearchSelector(url) {
  for (const [domain, selector] of Object.entries(SEARCH_SELECTORS)) {
    if (url.includes(domain)) return selector;
  }
  return null;
}

// Opens URL using Windows shell (default Chrome) for simple navigation
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

// Gets or creates a persistent browser instance with user profile
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
  
  logger.log("Launching browser with your profile (you'll stay logged in)...");
  
  cachedContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
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

// Auto-closes idle browser after keep-alive period
setInterval(() => {
  if (cachedBrowser && (Date.now() - lastUseTime) > KEEP_ALIVE_MS) {
    logger.log("Closing idle browser...");
    cachedBrowser.close().catch(() => {});
    cachedBrowser = null;
    cachedContext = null;
    cachedPage = null;
  }
}, 10000);

// Dismisses common cookie consent popups
async function dismissCookiePopups(page) {
  const cookieSelectors = [
    'button:has-text("Accept all")',
    'button:has-text("Accept")',
    'button:has-text("I agree")'
  ];
  
  for (const selector of cookieSelectors) {
    try {
      await page.click(selector, { timeout: 1000 });
    } catch {}
  }
}

// Main browser automation entry point
async function runBrowserAutomation({ url, actions = [] }) {
  const startTime = Date.now();
  
  try {
    // Simple URL opening without actions uses Windows shell
    if (!actions || actions.length === 0) {
      logger.log(`Opening ${url} in your default Chrome`);
      return await openUrlFast(url);
    }
    
    // Complex actions use Playwright with user profile
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
    await dismissCookiePopups(page);
    
    // Execute each action in sequence
    for (const action of actions) {
      try {
        if (action.type === "fill") {
          const selector = getSearchSelector(url) || action.selector;
          
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

// Extracts and summarizes content from the current page
async function summarizeCurrentPage(page) {
  try {
    const title = await page.title();
    const url = page.url();
    
    if (url.includes('google.com/search')) {
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
        let summary = `Here's what I found:\n\n`;
        results.forEach((r, i) => {
          summary += `${i + 1}. ${r.title}\n   ${r.snippet}\n\n`;
        });
        summary += `Say "click first result" or "click page 2" to navigate.`;
        return { speech: summary };
      }
      
      return { speech: `I'm on Google results but couldn't read them.` };
    }
    
    if (url === 'about:blank') {
      return { speech: "No page is loaded. Try searching for something first." };
    }
    
    // Extract content from regular pages
    const content = await page.evaluate(() => {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) return metaDesc.getAttribute('content');
      const firstP = document.querySelector('p');
      if (firstP) return firstP.innerText.substring(0, 300);
      return document.body ? document.body.innerText.substring(0, 200) : '';
    });
    
    return { speech: `Page: ${title}\n\n${content}` };
  } catch (error) {
    logger.error(`Summarize failed: ${error.message}`);
    return { speech: "I couldn't read the page. Make sure a page is loaded." };
  }
}

// Navigates to a specific page of Google search results
async function clickGooglePage(page, pageNumber) {
  try {
    const currentUrl = page.url();
    
    if (!currentUrl.includes('google.com/search')) {
      return { speech: "You need to be on a Google search results page first." };
    }
    
    const clicked = await page.evaluate((num) => {
      // Try aria-label first
      const ariaLinks = document.querySelectorAll(`a[aria-label="Page ${num}"]`);
      if (ariaLinks.length > 0) {
        ariaLinks[0].click();
        return true;
      }
      
      // Fallback to text content matching
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
    }
    
    return { speech: `Couldn't find page ${pageNumber}` };
  } catch (error) {
    logger.error(`Click page failed: ${error.message}`);
    return { speech: `Failed to navigate to page ${pageNumber}` };
  }
}

// Clicks a specific search result by position number
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
    }
    
    return { speech: `Couldn't find result ${position}` };
  } catch (error) {
    logger.error(`Click result failed: ${error.message}`);
    return { speech: `Failed to click result ${position}` };
  }
}

// Clean up browser on process exit
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