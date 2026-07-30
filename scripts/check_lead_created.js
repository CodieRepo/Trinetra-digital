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
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("phone", "7388625622")
    .maybeSingle();

  console.log("=== LEAD DETAILS ===");
  console.log(lead);

  const { data: convs } = await supabase
    .from("bhash_conversations")
    .select("*")
    .eq("lead_id", lead?.id)
    .order("timestamp", { ascending: false });

  console.log("=== BHASH CONVERSATIONS ===");
  console.log(convs);
}

inspect().catch(console.error);
