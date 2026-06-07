import { initDb, getDb } from './dist/database/connection.js';

async function check() {
  await initDb();
  const db = getDb();
  
  const leads = await db.all("SELECT * FROM leads ORDER BY created_at DESC LIMIT 5");
  console.log("=== LOCAL RECENT LEADS ===");
  console.log(leads.map(l => ({ id: l.id, name: l.name, phone: l.phone, created: l.created_at, ai_summary: l.ai_summary, ai_enabled: l.ai_enabled })));

  const chats = await db.all("SELECT * FROM whatsapp_chats ORDER BY timestamp DESC LIMIT 5");
  console.log("=== LOCAL RECENT CHATS ===");
  console.log(chats.map(c => ({ id: c.id, lead_id: c.lead_id, body: c.body.substring(0, 50), dir: c.direction, status: c.status, ts: c.timestamp })));

  process.exit(0);
}
check();
