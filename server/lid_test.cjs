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
  
  console.log("=== SIMULATING INBOUND META LID MESSAGE ===");
  const testLid = "222483684843672@lid";
  const pushName = "Meta Ad Clicker";
  
  // Clean old test
  await db.run("DELETE FROM leads WHERE phone = '+222483684843672'");
  
  const mockMsg = {
    key: {
      remoteJid: testLid,
      fromMe: false,
      id: 'mock-lid-test-' + Date.now()
    },
    pushName: pushName,
    message: {
      conversation: "I saw this on Facebook"
    }
  };

  try {
    await gateway.handleInboundMessage(mockMsg);
    console.log("Simulated inbound message successfully dispatched to gateway.");
    
    // Wait for AI to process
    console.log("Waiting 5 seconds for processing...");
    await new Promise(r => setTimeout(r, 5000));
    
    // Check DB for lead
    let lead = await db.get("SELECT * FROM leads WHERE phone = '+222483684843672'");
    console.log("=== CREATED LID LEAD ===");
    console.log(lead ? JSON.stringify(lead, null, 2) : "Not found");
    
    if (lead) {
      console.log("=== SIMULATING LID RESOLUTION ===");
      // Fake Baileys contacts cache
      gateway.testInjectContactsCache({
        '918888888888@s.whatsapp.net': {
          id: '918888888888@s.whatsapp.net',
          lid: '222483684843672@lid'
        }
      });
      // Fire manual contact check (simulating contacts.update event)
      await gateway.testResolveLid({
        id: '918888888888@s.whatsapp.net',
        lid: '222483684843672@lid'
      });
      
      console.log("Waiting 2 seconds for resolution...");
      await new Promise(r => setTimeout(r, 2000));
      
      lead = await db.get("SELECT * FROM leads WHERE id = ?", [lead.id]);
      console.log("=== RESOLVED LEAD ===");
      console.log(lead ? JSON.stringify(lead, null, 2) : "Not found");
      
      const chats = await db.all("SELECT direction, body, status, phone FROM whatsapp_chats WHERE lead_id = ? ORDER BY timestamp ASC", [lead.id]);
      console.log("=== CONVERSATION THREAD AFTER RESOLUTION ===");
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
cat > /var/www/trinetra/lid_test.js << 'EOF'
${remoteScript}
EOF
cd /var/www/trinetra
node lid_test.js
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
