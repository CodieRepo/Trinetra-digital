import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env file manually
let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const env = {};
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...val] = trimmed.split('=');
    if (key && val) {
      env[key.trim()] = val.join('=').trim().replace(/(^"|"$|'^|'$)/g, '');
    }
  });
  supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
  supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
} catch (e) {
  console.error("Error reading .env file:", e.message);
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyIngestion() {
  console.log("🔍 Checking leads for phone '9876543210'...");
  
  const { data: leads, error: leadErr } = await supabase
    .from('leads')
    .select('*')
    .eq('phone', '9876543210');

  if (leadErr) {
    console.error("Error fetching leads:", leadErr);
    return;
  }

  console.log(`📥 Found ${leads.length} leads matching phone '9999999999':`);
  for (const lead of leads) {
    console.log(`- Lead ID: ${lead.id}, Name: "${lead.name}", Phone: ${lead.phone}`);
    
    // Query messages table for this lead
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });

    if (msgErr) {
      console.error(`Error fetching messages for lead ${lead.id}:`, msgErr);
    } else {
      console.log(`  📥 Found ${messages.length} messages:`);
      messages.forEach((msg) => {
        console.log(`  - [${msg.created_at}] [${msg.direction}] Message: "${msg.body}" (source: ${msg.source}, provider: ${msg.provider})`);
      });
    }
  }

  console.log("🔍 Checking job_queue for pending or failed webhook jobs...");
  const { data: jobs, error: jobErr } = await supabase
    .from('job_queue')
    .select('*')
    .eq('job_type', 'whatsapp_inbound_message')
    .order('created_at', { ascending: false })
    .limit(5);

  if (jobErr) {
    console.error("Error fetching jobs:", jobErr);
  } else {
    console.log(`📥 Found ${jobs.length} jobs in queue:`);
    jobs.forEach((job) => {
      console.log(`- Job ID: ${job.id}, Status: ${job.status}, Error: ${job.error_message}, Created At: ${job.created_at}`);
      console.log(`  Payload: ${JSON.stringify(job.payload)}`);
    });
  }
}

verifyIngestion();
