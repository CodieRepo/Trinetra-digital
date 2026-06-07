import path from 'path';
import fs from 'fs';
import { getDb, initDb } from '../src/database/connection';

function cleanJidToPhone(jid: string): string {
  const number = jid.split('@')[0];
  return `+${number}`;
}

async function migrateLids() {
  console.log('🔄 Starting Historical LID Migration...');
  
  await initDb();
  const db = getDb();
  
  const unresolvedLeads = await db.all('SELECT id, name, phone FROM leads WHERE phone LIKE "+2224%"');
  console.log(`Found ${unresolvedLeads.length} unresolved leads with LIDs.`);
  
  if (unresolvedLeads.length === 0) {
    console.log('✅ No migration needed.');
    return;
  }

  // Find Baileys session
  const sessionPath = path.resolve(process.cwd(), 'server', 'whatsapp-session');
  // In Baileys multi-file auth, contacts are usually NOT stored in files directly unless explicitly handled by an external store.
  // However, we can check if there's a store or if there's a way.
  // Wait, the cache is only in-memory in gateway.ts! Baileys doesn't save contacts to `whatsapp-session/` unless using `makeInMemoryStore`.
  // The system DOES NOT use makeInMemoryStore. It uses `sock.contacts` internally.
  
  console.log(`⚠️ Note: Since Trinetra uses an in-memory contact cache, historical migration from disk is not possible unless contacts are saved.`);
  console.log(`⚠️ To resolve these existing leads, the admin must send a message to the bot from their phone, which will trigger a contacts.upsert and automatically retro-resolve them via gateway.ts!`);
  
  // We can't automatically migrate if there's no persistent cache. We will just inform.
  console.log('Migration script complete.');
}

migrateLids().catch(console.error);
