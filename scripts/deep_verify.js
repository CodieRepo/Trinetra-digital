import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

let supabaseUrl = '';
let supabaseKey = '';
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const env = {};
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...val] = trimmed.split('=');
    if (key && val) env[key.trim()] = val.join('=').trim().replace(/(^"|"$|'^|'$)/g, '');
  });
  supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
  supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
} catch (e) { console.error(e.message); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepVerify() {
  // 1. Check ALL messages (last 5)
  console.log("=== MESSAGES TABLE (last 5) ===");
  const { data: msgs, error: e1 } = await supabase
    .from('messages')
    .select('id, tenant_id, conversation_id, lead_id, direction, body, source, provider, fingerprint, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  if (e1) console.error("messages error:", e1);
  else msgs.forEach(m => console.log(JSON.stringify(m)));

  // 2. Check ALL conversations (last 5)
  console.log("\n=== CONVERSATIONS TABLE (last 5) ===");
  const { data: convs, error: e2 } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  if (e2) console.error("conversations error:", e2);
  else convs.forEach(c => console.log(JSON.stringify(c)));

  // 3. Check bhash_conversations (last 5)
  console.log("\n=== BHASH_CONVERSATIONS TABLE (last 5) ===");
  const { data: bconvs, error: e3 } = await supabase
    .from('bhash_conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  if (e3) console.error("bhash_conversations error:", e3);
  else bconvs.forEach(b => console.log(JSON.stringify(b)));

  // 4. Check webhook_logs (last 3)
  console.log("\n=== WEBHOOK_LOGS (last 3) ===");
  const { data: wlogs, error: e4 } = await supabase
    .from('webhook_logs')
    .select('id, provider, status, created_at, payload')
    .order('created_at', { ascending: false })
    .limit(3);
  if (e4) console.error("webhook_logs error:", e4);
  else wlogs.forEach(w => console.log(JSON.stringify(w)));
}

deepVerify();
