import jwt from 'jsonwebtoken';
import fs from 'fs';

async function fetchQr() {
  const token = jwt.sign({ username: 'admin' }, 'trinetra_secret_super_secure_123!', { expiresIn: '1h' });
  const res = await fetch('https://api.trinetradigitalsolution.com/api/whatsapp/qr', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const data = await res.json();
  if (data.qrImage) {
    const base64Data = data.qrImage.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync('C:\\Users\\ASUS\\OneDrive\\Desktop\\Trinetra digital\\whatsapp-qr.png', base64Data, 'base64');
    console.log('Successfully saved to whatsapp-qr.png');
  } else {
    console.log('No qrImage in response:', data);
  }
}

fetchQr().catch(console.error);
