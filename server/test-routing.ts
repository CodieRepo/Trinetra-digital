import { handleInboundMessage } from './src/whatsapp/gateway';
import { getDb, initDb } from './src/database/connection';
import { LeadModel } from './src/models/lead.model';
import dotenv from 'dotenv';
dotenv.config();

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  await initDb();
  const db = getDb();
  
  // Setup: Delete old test lead if exists
  await db.run("DELETE FROM leads WHERE phone = '+919999999999'");

  const sendMockMessage = async (text: string) => {
    console.log(`\n\n💬 ---> User: "${text}"`);
    const msg = {
      key: {
        remoteJid: '919999999999@s.whatsapp.net',
        fromMe: false,
        id: 'mock-' + Date.now()
      },
      pushName: 'Test User',
      message: {
        conversation: text
      }
    };
    await handleInboundMessage(msg as any);
  };

  console.log("=== Starting Routing Flow Validation ===");
  
  // 1. Start Booking
  await sendMockMessage("Free consultation book krdo");
  
  // Wait to clear 5s anti-spam cooldown
  console.log("Waiting 6s for cooldown...");
  await delay(6000);

  // 2. Provide Date
  await sendMockMessage("Tomorrow");
  
  console.log("Waiting 6s for cooldown...");
  await delay(6000);

  // 3. Provide Time (Should complete booking and trigger notifications)
  await sendMockMessage("2 PM");
  
  // Wait for processing to finish
  await delay(2000);

  console.log("\n\n=== VERIFICATION RESULTS ===");
  
  const lead = await LeadModel.findByPhone('+919999999999');
  if (!lead) {
    console.error("Test lead not found!");
    return;
  }
  
  console.log(`\nLEAD BOOKING STATE: ${lead.booking_state}`);
  console.log(`LEAD BOOKING DATE: ${lead.booking_date}`);
  console.log(`LEAD BOOKING TIME: ${lead.booking_time}`);
  
  const timeline = await db.all("SELECT event_type, description FROM lead_timeline WHERE lead_id = ? ORDER BY timestamp ASC", [lead.id]);
  console.log("\nTIMELINE EVENTS:");
  timeline.forEach((t: any) => console.log(`- [${t.event_type}] ${t.description}`));
  
  const appointments = await db.all("SELECT status, preferred_date, preferred_time, notification_sent, notification_channel FROM appointments WHERE lead_id = ?", [lead.id]);
  console.log("\nAPPOINTMENTS CREATED:", appointments);

  const tasks = await db.all("SELECT title, status FROM tasks WHERE title LIKE '%Appointment%'");
  console.log("\nTASKS CREATED:", tasks);

}

run().catch(console.error).finally(() => process.exit(0));
