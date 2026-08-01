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

async function checkSchema() {
  // Query information_schema for messages columns
  const { data: msgCols, error: e1 } = await supabase.rpc('exec_sql', {
    sql: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'messages' ORDER BY ordinal_position"
  });
  
  if (e1) {
    // Fallback: just try inserting with minimal fields
    console.log("RPC not available. Trying direct insert test...");
    
    // First create a conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        tenant_id: '1ab21b6e-d5ea-4395-81e4-ba2d06907194',
        lead_id: '463112fd-4534-4fcf-a53d-745e8165eca4',
        channel: 'whatsapp',
        provider: 'bhash',
        status: 'active'
      })
      .select('id')
      .single();

    console.log("Conv insert result:", conv, "Error:", convErr);

    if (conv) {
      // Try messages insert with ONLY schema-guaranteed columns
      const { data: msg, error: msgErr } = await supabase
        .from('messages')
        .insert({
          tenant_id: '1ab21b6e-d5ea-4395-81e4-ba2d06907194',
          conversation_id: conv.id,
          lead_id: '463112fd-4534-4fcf-a53d-745e8165eca4',
          direction: 'inbound',
          body: 'Schema test message',
          provider_message_id: 'test-schema-check-001'
        })
        .select('id')
        .single();

      console.log("Message insert result:", msg, "Error:", msgErr);
    }
    return;
  }
  
  console.log("Messages columns:", msgCols);
}

checkSchema();
