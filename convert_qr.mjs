import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

(async () => {
  const ascii = fs.readFileSync('whatsapp-qr.txt', 'utf8');
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 20px; background: white; display: inline-block; }
        pre {
          font-family: monospace;
          line-height: 1;
          letter-spacing: 0;
          font-size: 16px;
          color: black;
          background: white;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <pre>${ascii}</pre>
    </body>
    </html>
  `;
  
  fs.writeFileSync('qr.html', html);
  
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  
  const page = await browser.newPage();
  await page.goto(`file://${path.resolve('qr.html')}`);
  
  const pre = await page.$('pre');
  await pre.screenshot({ path: 'whatsapp-qr.png' });
  
  await browser.close();
  console.log('Saved to whatsapp-qr.png');
})();
