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

async function checkRecentActivity() {
  const db = getSupabaseAdmin();
  console.log("🔍 Checking recent database records...");

  // 1. Check Webhook Logs
  try {
    const { data: webhooks, error: wErr } = await db
      .from("webhook_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (wErr) {
      console.log("⚠️ webhook_logs query note:", wErr.message);
    } else {
      console.log(`📥 Recent Webhook Logs (${webhooks?.length || 0}):`, webhooks);
    }
  } catch (e) {}

  // 2. Check System Error Logs
  try {
    const { data: errors, error: eErr } = await db
      .from("system_error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (eErr) {
      console.log("⚠️ system_error_logs query note:", eErr.message);
    } else {
      console.log(`❌ Recent System Error Logs (${errors?.length || 0}):`, errors);
    }
  } catch (e) {}

  // 3. Check Recent Leads
  try {
    const { data: leads, error: lErr } = await db
      .from("leads")
      .select("id, name, phone, last_message, last_message_at, updated_at")
      .order("last_message_at", { ascending: false })
      .limit(5);

    if (lErr) {
      console.log("❌ leads query error:", lErr.message);
    } else {
      console.log(`📋 Recent Leads in Database (${leads?.length || 0}):`, leads);
    }
  } catch (e) {}

  // 4. Check Recent Messages
  try {
    const { data: msgs, error: mErr } = await db
      .from("bhash_conversations")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(5);

    if (mErr) {
      console.log("❌ bhash_conversations query error:", mErr.message);
    } else {
      console.log(`💬 Recent Messages in Database (${msgs?.length || 0}):`, msgs);
    }
  } catch (e) {}
}

checkRecentActivity();
