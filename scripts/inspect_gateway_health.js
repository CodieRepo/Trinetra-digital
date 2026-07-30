import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function inspect() {
  const { data, error } = await supabase
    .from("provider_configs")
    .select("*")
    .eq("provider_key", "whatsapp_bhash")
    .maybeSingle();

  if (error) {
    console.error("Error reading provider_configs:", error);
  } else {
    console.log("=== WHATSAPP_BHASH CONFIG & TELEMETRY ===");
    console.log(JSON.stringify(data, null, 2));
  }

  // Also query latest webhook logs
  const { data: logs, error: logsErr } = await supabase
    .from("webhook_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (logsErr) {
    console.error("Error reading webhook_logs:", logsErr);
  } else {
    console.log("=== LATEST WEBHOOK LOGS ===");
    console.log(JSON.stringify(logs, null, 2));
  }

  // Also check if there are pending jobs in job_queue
  const { data: jobs } = await supabase
    .from("job_queue")
    .select("*")
    .eq("status", "pending")
    .limit(5);
  console.log("=== PENDING JOBS ===");
  console.log(jobs);
}

inspect().catch(console.error);
