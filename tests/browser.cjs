const {chromium} = require('playwright');

// Set this only when using an already installed compatible browser.
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const launchOptions = {
  headless: true,
  ...(executablePath ? {executablePath} : {})
};

module.exports = {chromium, launchOptions};
