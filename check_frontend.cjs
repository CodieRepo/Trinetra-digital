const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const logs = [];

  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => {
    errors.push(`${request.failure().errorText} ${request.url()}`);
  });

  console.log('Navigating to https://trinetradigitalsolution.com/admin...');
  await page.goto('https://trinetradigitalsolution.com/admin', { waitUntil: 'networkidle2' });

  console.log('\n--- BROWSER LOGS ---');
  logs.forEach(log => console.log(log));

  console.log('\n--- BROWSER ERRORS ---');
  errors.forEach(err => console.log(err));

  const content = await page.content();
  console.log('\n--- ROOT INNER HTML ---');
  console.log(await page.evaluate(() => document.getElementById('root')?.innerHTML));

  await browser.close();
})();
