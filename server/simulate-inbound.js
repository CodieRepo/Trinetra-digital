const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const { initDb, getDb } = require('./dist/database/connection');
const { handleInboundMessage } = require('./dist/whatsapp/gateway');

async function testSequence() {
  console.log('🏁 STARTING REFINED SIMULATED INBOUND MESSAGE TESTING...');
  await initDb();
  const db = getDb();

  const leadId = 'lead-1780362936667';
  const jid = '222483684843672@s.whatsapp.net';
  const pushName = 'Satwik Live Test';

  console.log('\n🔄 Cleaning up database state for test lead...');
  await db.run("DELETE FROM whatsapp_chats WHERE lead_id = ?", [leadId]);
  await db.run("DELETE FROM handoff_alerts WHERE lead_id = ?", [leadId]);

  const leadExists = await db.get("SELECT id FROM leads WHERE id = ?", [leadId]);
  if (!leadExists) {
    console.log(`👤 Test lead does not exist. Creating default test lead...`);
    await db.run(
      `INSERT INTO leads (id, name, phone, email, company, service, source, status, ai_score, ai_budget, ai_summary, notes, ai_enabled) 
       VALUES (?, ?, ?, NULL, NULL, 'WhatsApp Automation Intake', 'whatsapp', 'new', 0, 0, NULL, NULL, 1)`,
      [leadId, pushName, '+222483684843672']
    );
  } else {
    await db.run(
      "UPDATE leads SET name = ?, phone = ?, ai_enabled = 1, ai_summary = NULL, status = 'new', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [pushName, '+222483684843672', leadId]
    );
  }

  const testCases = [
    { text: 'Hi', label: '1. Greeting / Introduction' },
    { text: 'Pricing', label: '2. Pricing & Packages Request' },
    { text: 'Website Development', label: '3. Website Development Service Request' },
    { text: 'AI Chatbot', label: '4. AI Chatbot Service Request' },
    { text: 'WhatsApp Automation', label: '5. WhatsApp Automation Service Request' },
    { text: 'I run a salon and need appointment scheduling for 5 staff members', label: '6. Salon recommendation (should match Growth package dynamically)' },
    { text: 'I run a high volume wholesale business with 100+ daily orders', label: '7. Wholesale recommendation (should match Growth/AI Sales dynamically)' },
    { text: 'My budget is ₹20,000. What fits?', label: '8. Budget Mention (Should NOT trigger handoff, should recommend matching Growth/Launch options)' },
    { text: 'I want a proposal', label: '9. Handoff: Proposal Request (Instant Trigger)' },
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
      
      // Wait for async operations to complete (6 seconds to bypass 5s anti-spam)
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

  // 11. Test Case 11: Conversation Thread > 15 messages, NO buying/action intent
  console.log(`\n==================================================`);
  console.log(`📡 [TEST] 11. Thread Length escalation (> 15 messages) WITHOUT buying intent`);
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

  // Send an engaged service question without buying/action intent (should NOT trigger handoff)
  const engMsgTextNoIntent = 'I want to build a business website';
  console.log(`Simulating message with NO intent: "${engMsgTextNoIntent}"`);

  const mockMsgLongNoIntent = {
    key: {
      remoteJid: jid,
      fromMe: false,
      id: `mock-msg-long-nointent-${Date.now()}`
    },
    pushName: pushName,
    message: {
      conversation: engMsgTextNoIntent
    }
  };

  let capturedResponseNoIntent = null;
  const originalWarnNoIntent = console.warn;
  console.warn = (...args) => {
    const msgStr = args.join(' ');
    if (msgStr.includes('Cannot send WhatsApp')) {
      capturedResponseNoIntent = msgStr.match(/Text: "(.*)"/)?.[1] || msgStr;
    }
    originalWarnNoIntent(...args);
  };

  try {
    await handleInboundMessage(mockMsgLongNoIntent);
    await new Promise(resolve => setTimeout(resolve, 6000));

    if (capturedResponseNoIntent) {
      console.log(`\n💬 AI RESPONSE:`);
      console.log(capturedResponseNoIntent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\r/g, '\r'));
    }

    const alert = await db.get("SELECT reason FROM handoff_alerts WHERE lead_id = ? AND status = 'pending'", [leadId]);
    if (alert) {
      console.log(`🚨 ALERT: Human Handoff was TRIGGERED! Reason: "${alert.reason}"`);
    } else {
      console.log(`✅ Status: AI Conversation continues (No handoff triggered).`);
    }
  } catch (err) {
    console.error(`❌ Error during thread length case without intent:`, err);
  } finally {
    console.warn = originalWarnNoIntent;
  }

  // 12. Test Case 12: Conversation Thread > 15 messages, WITH buying/action intent
  console.log(`\n==================================================`);
  console.log(`📡 [TEST] 12. Thread Length escalation (> 15 messages) WITH buying intent`);
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

  // Send a message with buying intent (should trigger handoff)
  const engMsgTextWithIntent = "Let's start the project now";
  console.log(`Simulating message WITH intent: "${engMsgTextWithIntent}"`);

  const mockMsgLongWithIntent = {
    key: {
      remoteJid: jid,
      fromMe: false,
      id: `mock-msg-long-withintent-${Date.now()}`
    },
    pushName: pushName,
    message: {
      conversation: engMsgTextWithIntent
    }
  };

  let capturedResponseWithIntent = null;
  const originalWarnWithIntent = console.warn;
  console.warn = (...args) => {
    const msgStr = args.join(' ');
    if (msgStr.includes('Cannot send WhatsApp')) {
      capturedResponseWithIntent = msgStr.match(/Text: "(.*)"/)?.[1] || msgStr;
    }
    originalWarnWithIntent(...args);
  };

  try {
    await handleInboundMessage(mockMsgLongWithIntent);
    await new Promise(resolve => setTimeout(resolve, 6000));

    if (capturedResponseWithIntent) {
      console.log(`\n💬 AI RESPONSE:`);
      console.log(capturedResponseWithIntent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\r/g, '\r'));
    }

    const alert = await db.get("SELECT reason FROM handoff_alerts WHERE lead_id = ? AND status = 'pending'", [leadId]);
    if (alert) {
      console.log(`🚨 ALERT: Human Handoff was TRIGGERED! Reason: "${alert.reason}"`);
    } else {
      console.log(`✅ Status: AI Conversation continues (No handoff triggered).`);
    }
  } catch (err) {
    console.error(`❌ Error during thread length case with intent:`, err);
  } finally {
    console.warn = originalWarnWithIntent;
  }

  console.log('\n🏁 PHASE 4 REFINED SIMULATED INBOUND MESSAGE TESTING COMPLETED!');
  process.exit(0);
}

testSequence().catch(err => {
  console.error(err);
  process.exit(1);
});
