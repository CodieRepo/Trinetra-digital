import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

(async () => {
  const ascii = fs.readFileSync('whatsapp-qr.txt', 'utf8');
  
  // Create an HTML file that uses JavaScript to parse the ASCII and draw it on a canvas
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 20px; background: white; display: inline-block; }
        canvas { display: block; }
      </style>
    </head>
    <body>
      <canvas id="qrCanvas"></canvas>
      <script>
        const ascii = \`${ascii.replace(/`/g, '\\`')}\`;
        const lines = ascii.split('\\n').filter(l => l.trim().length > 0);
        
        const blockSize = 10;
        const width = lines[0].length;
        const height = lines.length * 2; // Each line is 2 blocks high
        
        const canvas = document.getElementById('qrCanvas');
        canvas.width = width * blockSize;
        canvas.height = height * blockSize;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        
        for (let y = 0; y < lines.length; y++) {
          const line = lines[y];
          for (let x = 0; x < line.length; x++) {
            const char = line[x];
            
            // Calculate actual Y positions (each char is 2 vertical pixels)
            const topY = y * 2;
            const bottomY = y * 2 + 1;
            
            if (char === '█') { // Full block
              ctx.fillRect(x * blockSize, topY * blockSize, blockSize, blockSize);
              ctx.fillRect(x * blockSize, bottomY * blockSize, blockSize, blockSize);
            } else if (char === '▀') { // Upper half block
              ctx.fillRect(x * blockSize, topY * blockSize, blockSize, blockSize);
            } else if (char === '▄') { // Lower half block
              ctx.fillRect(x * blockSize, bottomY * blockSize, blockSize, blockSize);
            }
            // Space (' ') is white, so do nothing
          }
        }
      </script>
    </body>
    </html>
  `;
  
  fs.writeFileSync('qr_canvas.html', html);
  
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  
  const page = await browser.newPage();
  await page.goto(`file://${path.resolve('qr_canvas.html')}`);
  
  // Wait a little bit for the JS to execute
  await new Promise(r => setTimeout(r, 500));
  
  const canvas = await page.$('canvas');
  await canvas.screenshot({ path: 'whatsapp-qr-perfect.png' });
  
  await browser.close();
  console.log('Saved to whatsapp-qr-perfect.png');
})();
