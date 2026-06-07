import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage();

  const errors = [];
  const logs = [];

  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => errors.push(error.stack || error.message));
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
  fs.writeFileSync('output.html', content);
  console.log('\n--- ROOT HTML LENGTH ---', content.length);

  await browser.close();
})();
