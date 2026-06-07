import fs from 'fs';
import path from 'path';

async function fetchLiveQr() {
  console.log('Logging in to live API...');
  const loginRes = await fetch('https://api.trinetradigitalsolution.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'trinetra123' })
  });
  const loginData = await loginRes.json();
  
  if (!loginData.token) {
    throw new Error('Failed to login: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  console.log('Successfully logged in.');

  console.log('Restarting WhatsApp gateway to force fresh QR...');
  const restartRes = await fetch('https://api.trinetradigitalsolution.com/api/whatsapp/restart', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Restart response:', await restartRes.text());

  // Wait 10 seconds for Baileys to initialize and generate a new QR
  console.log('Waiting 10 seconds for new QR generation...');
  await new Promise(r => setTimeout(r, 10000));

  console.log('Fetching new QR code...');
  const qrRes = await fetch('https://api.trinetradigitalsolution.com/api/whatsapp/qr', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await qrRes.json();

  if (data.qrImage) {
    const base64Data = data.qrImage.replace(/^data:image\/png;base64,/, "");
    const rootPath = path.resolve('C:\\Users\\ASUS\\OneDrive\\Desktop\\Trinetra digital\\whatsapp-qr.png');
    const assetPath = path.resolve('C:\\Users\\ASUS\\OneDrive\\Desktop\\Trinetra digital\\dist\\assets\\whatsapp-qr.png');
    const artifactPath = path.resolve('C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\1fff4f5c-7e4f-4bb5-96f6-7ae065b7c67d\\whatsapp-qr.png');
    
    fs.writeFileSync(rootPath, base64Data, 'base64');
    fs.writeFileSync(assetPath, base64Data, 'base64');
    fs.writeFileSync(artifactPath, base64Data, 'base64');
    
    console.log('Successfully saved fresh QR to all locations.');
  } else {
    console.log('No qrImage in response:', data);
  }
}

fetchLiveQr().catch(console.error);
