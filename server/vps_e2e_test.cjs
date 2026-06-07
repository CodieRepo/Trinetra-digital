const { Client } = require('ssh2');
const fs = require('fs');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const remoteScript = `
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { initDb, getDb } from './server/dist/database/connection.js';
import gateway from './server/dist/whatsapp/gateway.js';

async function testE2E() {
  await initDb();
  const db = getDb();
  
  const status = gateway.getWhatsAppStatus();
  console.log("=== WA STATUS ===");
  console.log(JSON.stringify(status, null, 2));
  
  const credsPath = path.join(__dirname, 'server', 'data', 'wa-session', 'creds.json');
  console.log("=== CREDS.JSON EXISTS ===");
  console.log(fs.existsSync(credsPath));

  console.log("=== SIMULATING INBOUND MESSAGE ===");
  const testJid = "919999999999@s.whatsapp.net";
  const pushName = "Live Production E2E Tester";
  
  // Clean old test
  await db.run("DELETE FROM leads WHERE phone = '+919999999999'");
  
  const mockMsg = {
    key: {
      remoteJid: testJid,
      fromMe: false,
      id: 'mock-live-test-' + Date.now()
    },
    pushName: pushName,
    message: {
      conversation: "Hi, I need an AI Chatbot for my business. I have a budget of $500."
    }
  };

  try {
    await gateway.handleInboundMessage(mockMsg);
    console.log("Simulated inbound message successfully dispatched to gateway.");
    
    // Wait for AI to process (10 seconds)
    console.log("Waiting 10 seconds for AI processing...");
    await new Promise(r => setTimeout(r, 10000));
    
    // Check DB for lead
    const lead = await db.get("SELECT * FROM leads WHERE phone = '+919999999999'");
    console.log("=== CREATED LEAD ===");
    console.log(lead ? JSON.stringify(lead, null, 2) : "Not found");
    
    if (lead) {
      // Check for chats
      const chats = await db.all("SELECT direction, body, status FROM whatsapp_chats WHERE lead_id = ? ORDER BY timestamp ASC", [lead.id]);
      console.log("=== CONVERSATION THREAD ===");
      console.log(JSON.stringify(chats, null, 2));
    }

  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

testE2E();
`;

const commands = `
cat > /var/www/trinetra/e2e.js << 'EOF'
${remoteScript}
EOF
cd /var/www/trinetra
node e2e.js
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected.');
  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (data) => process.stdout.write(data))
          .stderr.on('data', (data) => process.stderr.write(data));
  });
}).connect(sshConfig);
