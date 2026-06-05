import { handleInboundMessage } from './src/whatsapp/gateway';
import { getDb, initDb } from './src/database/connection';
import { LeadModel } from './src/models/lead.model';
import dotenv from 'dotenv';
dotenv.config();

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const TEST_PHONE = '+919999000001';
const REPLY_JID = '919999000001@s.whatsapp.net';

async function sendMockMessage(text: string) {
  console.log(`\n💬 ---> User: "${text}"`);
  const msg = {
    key: { remoteJid: REPLY_JID, fromMe: false, id: 'mock-' + Date.now() },
    pushName: 'Routing Test User',
    message: { conversation: text }
  };
  await handleInboundMessage(msg as any);
}

async function checkLead(db: any, lead: any, label: string) {
  const fresh = await db.get('SELECT booking_state, active_flow, active_intent, post_booking_message_count FROM leads WHERE id = ?', [lead.id]);
  console.log(`\n📊 [${label}] booking_state=${fresh.booking_state || 'null'} | active_flow=${fresh.active_flow || 'null'} | active_intent=${fresh.active_intent || 'null'} | post_booking_count=${fresh.post_booking_message_count || 0}`);
  return fresh;
}

async function run() {
  await initDb();
  const db = getDb();

  // Clean up old test lead
  await db.run("DELETE FROM leads WHERE phone = ?", [TEST_PHONE]);

  // ═══════════════════════════════════════════════════
  // TEST 1: Booking Flow State Machine
  // ═══════════════════════════════════════════════════
  console.log('\n\n══════════════════════════════════════════════════');
  console.log('TEST 1: Booking Flow + Post-Booking Courtesy Window');
  console.log('══════════════════════════════════════════════════');

  await sendMockMessage("Free consultation book krdo");
  let lead = await LeadModel.findByPhone(TEST_PHONE);
  if (!lead) { console.error('Lead not created!'); return; }
  await checkLead(db, lead, 'After booking request');

  console.log("\n⏳ Waiting 6s for cooldown...");
  await delay(6000);

  await sendMockMessage("Tomorrow");
  await checkLead(db, lead, 'After Tomorrow');

  console.log("\n⏳ Waiting 6s for cooldown...");
  await delay(6000);

  await sendMockMessage("2 PM");
  const afterConfirm = await checkLead(db, lead, 'After 2 PM (should be CONFIRMED then cleared)');
  
  console.log("\n⏳ Waiting 6s for cooldown...");
  await delay(6000);

  // Post-booking courtesy message
  await sendMockMessage("Thanks");
  const afterThanks = await checkLead(db, lead, 'After Thanks (post-booking window msg 1)');

  console.log("\n\n══════════════════════════════════════════════════");
  console.log('TEST 1 RESULT VERIFICATION:');
  console.log('══════════════════════════════════════════════════');
  const appts = await db.all("SELECT status, preferred_date, preferred_time, notification_sent FROM appointments WHERE lead_id = ?", [lead.id]);
  console.log('✅ Appointments:', JSON.stringify(appts, null, 2));
  const tasks = await db.all("SELECT title, status FROM tasks WHERE lead_id = ? AND title LIKE '%ppointment%'", [lead.id]);
  console.log('✅ Tasks:', JSON.stringify(tasks, null, 2));
  const timeline = await db.all("SELECT event_type, description FROM lead_timeline WHERE lead_id = ? ORDER BY timestamp ASC", [lead.id]);
  console.log('✅ Timeline events:');
  timeline.forEach((t: any) => console.log(`   [${t.event_type}] ${t.description?.substring(0, 100)}`));

  // ═══════════════════════════════════════════════════
  // TEST 2: Website Intent Context Retention
  // ═══════════════════════════════════════════════════
  console.log('\n\n══════════════════════════════════════════════════');
  console.log('TEST 2: Website Intent Context Retention');
  console.log('══════════════════════════════════════════════════');

  const TEST_PHONE2 = '+919999000002';
  const REPLY_JID2 = '919999000002@s.whatsapp.net';

  await db.run("DELETE FROM leads WHERE phone = ?", [TEST_PHONE2]);

  const sendMsg2 = async (text: string) => {
    console.log(`\n💬 ---> User: "${text}"`);
    await handleInboundMessage({
      key: { remoteJid: REPLY_JID2, fromMe: false, id: 'mock2-' + Date.now() },
      pushName: 'Intent Test User',
      message: { conversation: text }
    } as any);
  };

  // Simulate user selecting Website service first
  await sendMsg2("1"); // Select Website option from menu
  let lead2 = await LeadModel.findByPhone(TEST_PHONE2);
  if (!lead2) { console.error('Lead2 not created!'); return; }
  console.log("\n⏳ Waiting 6s for cooldown...");
  await delay(6000);

  // Now the lead has active_intent from the menu selection.
  // Simulate follow-up messages that should stay in Website context
  await sendMsg2("Website ka pricing kya hai");
  await checkLead(db, lead2, 'After website pricing question');
  console.log("\n⏳ Waiting 6s for cooldown...");
  await delay(6000);

  await sendMsg2("Monthly charges kitne hain");
  await checkLead(db, lead2, 'After monthly charges question');
  console.log("\n⏳ Waiting 6s for cooldown...");
  await delay(6000);

  await sendMsg2("Free consultation chahiye");
  await checkLead(db, lead2, 'After consultation request');

  console.log("\n\n══════════════════════════════════════════════════");
  console.log('TEST 2 RESULT: Context audit');
  console.log('══════════════════════════════════════════════════');
  const msgs2 = await db.all("SELECT direction, body FROM whatsapp_chats WHERE lead_id = ? ORDER BY timestamp ASC", [lead2.id]);
  console.log('📨 Full conversation thread:');
  msgs2.forEach((m: any) => console.log(`  [${m.direction}] ${m.body?.substring(0, 120)}`));
}

run().catch(console.error).finally(() => process.exit(0));
