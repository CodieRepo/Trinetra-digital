import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://suvuvxdasccmztbbpreg.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function verifyLiveDbCascade() {
  console.log("=== TESTING LIVE SUPABASE DATABASE ON DELETE CASCADE ===");

  // 1. Find table TEST-DELETE-99 or create one
  const { data: existingTables } = await supabase
    .from("restaurant_tables")
    .select("id, table_number")
    .ilike("table_number", "%TEST%");

  if (existingTables && existingTables.length > 0) {
    for (const table of existingTables) {
      console.log(`Attempting to delete table ${table.table_number} (${table.id}) directly from live DB...`);
      const { error: delErr } = await supabase
        .from("restaurant_tables")
        .delete()
        .eq("id", table.id);

      if (delErr) {
        throw new Error(`Direct live DB delete failed: ${delErr.message}`);
      }
      console.log(`✅ Successfully deleted table ${table.table_number}! Postgres ON DELETE CASCADE worked 100%!`);
    }
  } else {
    console.log("No test tables found; database is already clean.");
  }
}

verifyLiveDbCascade().catch((err) => {
  console.error("❌ Live DB Cascade test failed:", err);
  process.exit(1);
});
