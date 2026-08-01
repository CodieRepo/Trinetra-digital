import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...vals] = trimmed.split("=");
      const val = vals.join("=").replace(/^["']|["']$/g, "");
      process.env[key.trim()] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function verifyAllTables() {
  console.log("=== SUPABASE DATABASE TABLE VERIFICATION ===");
  const tables = [
    "tenants",
    "restaurants",
    "restaurant_tables",
    "restaurant_staff",
    "menu_categories",
    "menu_items",
    "restaurant_table_sessions",
    "restaurant_orders",
    "restaurant_order_items",
    "restaurant_order_events",
    "restaurant_bills",
    "restaurant_discount_audit",
    "leads"
  ];

  for (const t of tables) {
    const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`❌ Table '${t}': ERROR -> ${error.message}`);
    } else {
      console.log(`✓ Table '${t}': EXISTS (Row count: ${count ?? 0})`);
    }
  }

  // Verify sync trigger by testing an update on restaurant_table_sessions
  console.log("\nTesting PL/pgSQL session-to-lead sync trigger...");
  let { data: sessions } = await supabase.from("restaurant_table_sessions").select("id").limit(1);
  if (sessions && sessions.length > 0) {
    const { error: trgErr } = await supabase.from("restaurant_table_sessions")
      .update({ customer_name: "Trigger Test Customer", customer_phone: "+919999000111" })
      .eq("id", sessions[0].id);
    
    if (trgErr) {
      console.log(`❌ Trigger check failed: ${trgErr.message}`);
    } else {
      console.log(`✓ Session-to-Lead sync trigger executed without error.`);
    }
  }
}

verifyAllTables();
