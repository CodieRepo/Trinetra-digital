const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const { initDb, getDb } = require('./dist/database/connection');
const { handleInboundMessage } = require('./dist/whatsapp/gateway');

async function testSequence() {
  console.log('🏁 STARTING PHASE 4 SIMULATED INBOUND MESSAGE TESTING...');
  await initDb();
  const db = getDb();

  const leadId = 'lead-1780362936667';
  const jid = '222483684843672@s.whatsapp.net';
  const pushName = 'Satwik Live Test';

  // 1. Initial complete clean of chat history & alerts
  console.log('\n🔄 Cleaning up database state for test lead...');
  await db.run("DELETE FROM whatsapp_chats WHERE lead_id = ?", [leadId]);
  await db.run("DELETE FROM handoff_alerts WHERE lead_id = ?", [leadId]);
  await db.run(
    "UPDATE leads SET ai_enabled = 1, ai_summary = NULL, status = 'new', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [leadId]
  );

  const testCases = [
    { text: 'Hi', label: '1. Greeting / Introduction' },
    { text: 'Pricing', label: '2. Pricing & Packages Request' },
    { text: 'Website Development', label: '3. Website Development Service Request' },
    { text: 'AI Chatbot', label: '4. AI Chatbot Service Request' },
    { text: 'WhatsApp Automation', label: '5. WhatsApp Automation Service Request' },
    { text: 'I run a salon', label: '6. Business Category: Salon (Launch Package recommendation)' },
    { text: 'I run a wholesale business', label: '7. Business Category: Wholesale (Growth/AI Sales recommendation)' },
    { text: 'I want a proposal', label: '8. Handoff: Proposal Request (Instant Trigger)' },
    { text: 'My budget is ₹20,000', label: '9. Handoff: Budget Mention (Instant Trigger)' },
    { text: 'Connect me to a consultant', label: '10. Handoff: Human Request (Instant Trigger)' }
  ];

  for (const tc of testCases) {
    console.log(`\n==================================================`);
    console.log(`📡 [TEST] Simulating: "${tc.text}" | [${tc.label}]`);

    // Reset AI status and handoffs before every message so that even after handoff is triggered,
    // the AI runs for the next simulation test case.
    await db.run("UPDATE leads SET ai_enabled = 1 WHERE id = ?", [leadId]);
    await db.run("DELETE FROM handoff_alerts WHERE lead_id = ?", [leadId]);

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

    let capturedResponse = null;
    const originalWarn = console.warn;

    console.warn = (...args) => {
      const msgStr = args.join(' ');
      if (msgStr.includes('Cannot send WhatsApp')) {
        capturedResponse = msgStr.match(/Text: "(.*)"/)?.[1] || msgStr;
      }
      originalWarn(...args);
    };

    try {
      await handleInboundMessage(mockMsg);
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      if (capturedResponse) {
        console.log(`\n💬 AI RESPONSE:`);
        console.log(capturedResponse.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\r/g, '\r'));
      } else {
        console.log(`\n⚠️ No direct response captured (AI might have skipped or failed).`);
      }

      // Check if handoff was created in database
      const alert = await db.get("SELECT reason FROM handoff_alerts WHERE lead_id = ? AND status = 'pending'", [leadId]);
      if (alert) {
        console.log(`🚨 ALERT: Human Handoff was TRIGGERED! Reason: "${alert.reason}"`);
      } else {
        console.log(`✅ Status: AI Conversation continues (No handoff triggered).`);
      }

    } catch (err) {
      console.error(`❌ Error during simulation case:`, err);
    } finally {
      console.warn = originalWarn;
    }
  }

  // 11. Test Case 11: Conversation Thread > 15 messages triggers handoff on engaged message
  console.log(`\n==================================================`);
  console.log(`📡 [TEST] 11. Thread Length escalation (> 15 messages)`);
  console.log(`Resetting and pre-populating database with 16 messages...`);

  await db.run("DELETE FROM whatsapp_chats WHERE lead_id = ?", [leadId]);
  await db.run("DELETE FROM handoff_alerts WHERE lead_id = ?", [leadId]);
  await db.run("UPDATE leads SET ai_enabled = 1 WHERE id = ?", [leadId]);

  // Insert 16 dummy messages
  for (let i = 1; i <= 16; i++) {
    const direction = i % 2 === 0 ? 'outbound' : 'inbound';
    const body = direction === 'inbound' ? `Mock user question ${i}` : `Mock assistant answer ${i}`;
    await db.run(
      "INSERT INTO whatsapp_chats (id, lead_id, direction, body, status) VALUES (?, ?, ?, ?, 'sent')",
      [`mock-history-${i}`, leadId, direction, body]
    );
  }

  // Send an engaged service question (normally safe, but should trigger handoff due to thread count > 15)
  const engMsgText = 'I want to build a business website';
  console.log(`Simulating engaged message: "${engMsgText}"`);

  const mockMsgLong = {
    key: {
      remoteJid: jid,
      fromMe: false,
      id: `mock-msg-long-${Date.now()}`
    },
    pushName: pushName,
    message: {
      conversation: engMsgText
    }
  };

  let capturedResponseLong = null;
  const originalWarnLong = console.warn;
  console.warn = (...args) => {
    const msgStr = args.join(' ');
    if (msgStr.includes('Cannot send WhatsApp')) {
      capturedResponseLong = msgStr.match(/Text: "(.*)"/)?.[1] || msgStr;
    }
    originalWarnLong(...args);
  };

  try {
    await handleInboundMessage(mockMsgLong);
    await new Promise(resolve => setTimeout(resolve, 6000));

    if (capturedResponseLong) {
      console.log(`\n💬 AI RESPONSE:`);
      console.log(capturedResponseLong.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\r/g, '\r'));
    }

    const alert = await db.get("SELECT reason FROM handoff_alerts WHERE lead_id = ? AND status = 'pending'", [leadId]);
    if (alert) {
      console.log(`🚨 ALERT: Human Handoff was TRIGGERED! Reason: "${alert.reason}"`);
    } else {
      console.log(`✅ Status: AI Conversation continues (No handoff triggered).`);
    }
  } catch (err) {
    console.error(`❌ Error during thread length escalation case:`, err);
  } finally {
    console.warn = originalWarnLong;
  }

  console.log('\n🏁 PHASE 4 SIMULATED INBOUND MESSAGE TESTING COMPLETED!');
  process.exit(0);
}

testSequence().catch(err => {
  console.error(err);
  process.exit(1);
});
