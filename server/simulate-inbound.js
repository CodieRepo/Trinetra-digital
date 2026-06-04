const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const { initDb, getDb } = require('./dist/database/connection');
const { handleInboundMessage } = require('./dist/whatsapp/gateway');

async function testSequence() {
  console.log('🏁 STARTING SIMULATED INBOUND MESSAGE TESTING...');
  await initDb();
  const db = getDb();

  // Reset the canonical lead Satwik to new/AI enabled state first
  console.log('\n🔄 Resetting lead-1780362936667 status to new/AI enabled...');
  await db.run(
    "UPDATE leads SET ai_enabled = 1, ai_summary = NULL, status = 'new', updated_at = CURRENT_TIMESTAMP WHERE id = 'lead-1780362936667'"
  );
  await db.run(
    "DELETE FROM handoff_alerts WHERE lead_id = 'lead-1780362936667'"
  );

  const jid = '222483684843672@s.whatsapp.net';
  const pushName = 'Satwik Live Test';

  const testCases = [
    { text: 'Hi', label: 'MAIN MENU TRIGGER ("Hi")' },
    { text: 'Menu', label: 'MAIN MENU TRIGGER ("Menu")' },
    { text: '1', label: 'WEBSITE DEVELOPMENT MENU TRIGGER ("1")' },
    { text: 'Pricing', label: 'PRICING MENU TRIGGER ("Pricing")' },
    { text: 'I want to build an ecommerce website for my retail shop.', label: 'GEMINI AI QUALIFICATION TRIGGER' }
  ];

  for (const tc of testCases) {
    console.log(`\n--------------------------------------------------`);
    console.log(`📡 [TEST] Simulating incoming message: "${tc.text}" [${tc.label}]`);
    
    const mockMsg = {
      key: {
        remoteJid: jid,
        fromMe: false,
        id: `mock-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      },
      pushName: pushName,
      message: {
        conversation: tc.text
      }
    };

    // Override console.warn to capture the simulated outbound message
    const originalWarn = console.warn;
    const originalLog = console.log;
    let capturedResponse = null;

    console.warn = (...args) => {
      const msgStr = args.join(' ');
      if (msgStr.includes('Cannot send WhatsApp')) {
        capturedResponse = msgStr.match(/Text: "(.*)"/)?.[1] || msgStr;
      }
      originalWarn(...args);
    };

    try {
      await handleInboundMessage(mockMsg);
      
      // Wait a short delay to allow async database writes/AI calls to finish
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      if (capturedResponse) {
        console.log(`✅ RESPONSE DELIVERED SUCCESSFULLY:`);
        console.log(capturedResponse.replace(/\\n/g, '\n').replace(/\\"/g, '"'));
      } else {
        console.log(`⚠️ No direct response captured (might have been skipped or throttled).`);
      }
    } catch (err) {
      console.error(`❌ Error processing message:`, err);
    } finally {
      console.warn = originalWarn;
    }
  }

  console.log('\n🏁 SIMULATED INBOUND MESSAGE TESTING COMPLETED!');
  process.exit(0);
}

testSequence().catch(err => {
  console.error(err);
  process.exit(1);
});
