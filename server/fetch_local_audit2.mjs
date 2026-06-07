import { initDb, getDb } from './dist/database/connection.js';

async function check() {
  await initDb();
  const db = getDb();
  
  const leads = await db.all("SELECT * FROM leads ORDER BY created_at DESC LIMIT 5");
  console.log("=== LOCAL RECENT LEADS ===");
  console.log(leads);

  const chats = await db.all("SELECT * FROM whatsapp_chats ORDER BY timestamp DESC LIMIT 5");
  console.log("=== LOCAL RECENT CHATS ===");
  console.log(chats);

  process.exit(0);
}
check();
