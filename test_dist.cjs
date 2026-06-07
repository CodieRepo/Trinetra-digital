const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(8080, async () => {
  console.log('Server running on 8080');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.error('ERR:', err.message));
  await page.goto('http://localhost:8080/admin');
  console.log('Done');
  await browser.close();
  process.exit(0);
});
