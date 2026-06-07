
const path = require('path');
const fs = require('fs');
const { initDb, getDb } = require('./server/dist/database/connection');
const gateway = require('./server/dist/whatsapp/gateway');

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
