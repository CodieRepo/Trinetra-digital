import fs from 'fs';
import path from 'path';

async function checkLiveWa() {
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

  console.log('\n--- HEALTH CHECK ---');
  const healthRes = await fetch('https://api.trinetradigitalsolution.com/api/health');
  console.log(await healthRes.json());

  console.log('\n--- WHATSAPP STATUS ---');
  const waRes = await fetch('https://api.trinetradigitalsolution.com/api/whatsapp/status', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const waData = await waRes.json();
  
  if (waData.qrImage) {
    waData.qrImage = '[BASE64_IMAGE_DATA_OMITTED]';
  }
  if (waData.qr) {
    waData.qr = '[ASCII_QR_OMITTED]';
  }
  console.log(waData);
}

checkLiveWa().catch(console.error);
