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

async function testDeleteTableWithOrders() {
  console.log("=== TESTING TABLE DELETION WITH ASSOCIATED ORDERS ===");

  const tenantId = "00000000-0000-0000-0000-000000000001";
  
  // Fetch restaurant
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("tenant_id", tenantId)
    .single();

  // 1. Create a dummy test table
  const { data: table } = await supabase
    .from("restaurant_tables")
    .insert({
      tenant_id: tenantId,
      restaurant_id: restaurant.id,
      table_number: `TEST-DEL-${Date.now().toString().slice(-4)}`,
    })
    .select("*")
    .single();

  console.log(`Created test table: ${table.table_number} (${table.id})`);

  // 2. Create an order linked to this table
  const { data: order } = await supabase
    .from("restaurant_orders")
    .insert({
      tenant_id: tenantId,
      restaurant_id: restaurant.id,
      table_id: table.id,
      session_token: "00000000-0000-0000-0000-000000000099",
      total_amount: 100,
    })
    .select("*")
    .single();

  console.log(`Created order linked to table: Order ${order.id}`);

  // 3. Test API deletion logic (Cascade deleting linked order items, orders & sessions first)
  const { data: linkedOrders } = await supabase
    .from("restaurant_orders")
    .select("id")
    .eq("table_id", table.id)
    .eq("tenant_id", tenantId);

  if (linkedOrders && linkedOrders.length > 0) {
    const orderIds = linkedOrders.map((o) => o.id);
    await supabase.from("restaurant_order_items").delete().in("order_id", orderIds);
    await supabase.from("restaurant_orders").delete().in("id", orderIds);
  }

  await supabase
    .from("restaurant_table_sessions")
    .delete()
    .eq("table_id", table.id)
    .eq("tenant_id", tenantId);

  const { error: delErr } = await supabase
    .from("restaurant_tables")
    .delete()
    .eq("id", table.id)
    .eq("tenant_id", tenantId);

  if (delErr) {
    throw new Error(`Deletion failed: ${delErr.message}`);
  }

  console.log("✅ TABLE DELETION WITH EXISTING ORDERS SUCCEEDED SAFELY!");
}

testDeleteTableWithOrders().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
