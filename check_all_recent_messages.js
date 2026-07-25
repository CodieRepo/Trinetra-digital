import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

import { getSupabaseAdmin } from "./src/lib/supabase/admin.ts";

async function checkAllMessages() {
  const db = getSupabaseAdmin();
  console.log("🔍 Checking all recent leads and messages in Supabase...");

  const { data: leads, error: lErr } = await db
    .from("leads")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(10);

  if (lErr) {
    console.error("❌ Error fetching leads:", lErr.message);
  } else {
    console.log(`📋 Total Recent Leads (${leads?.length || 0}):`);
    leads?.forEach(l => {
      console.log(` - [${l.id}] ${l.name} (${l.phone}): "${l.last_message}" at ${l.last_message_at}`);
    });
  }

  const { data: bhashMsgs, error: bErr } = await db
    .from("bhash_conversations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (bErr) {
    console.error("❌ Error fetching bhash_conversations:", bErr.message);
  } else {
    console.log(`\n💬 Recent Messages in bhash_conversations (${bhashMsgs?.length || 0}):`);
    bhashMsgs?.forEach(m => {
      console.log(` - Lead [${m.lead_id}] (${m.direction}): "${m.message}" at ${m.created_at || m.timestamp}`);
    });
  }
}

checkAllMessages();
