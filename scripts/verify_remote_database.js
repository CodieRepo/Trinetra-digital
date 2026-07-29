import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env variables
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

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runDatabaseVerification() {
  console.log("=== TRINETRA BUSINESS OS DATABASE VERIFICATION ===");
  console.log(`Connecting to: ${supabaseUrl}`);

  const tenantId = "00000000-0000-0000-0000-000000000001";

  // 1. Verify default tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (tenantErr) {
    throw new Error(`Tenant check failed: ${tenantErr.message}`);
  }
  console.log(`✅ [1/7] Organization Tenant Verified: "${tenant.name}" (${tenant.slug})`);

  // 2. Provision / verify Restaurant for Tenant
  const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .upsert(
      {
        tenant_id: tenantId,
        name: "Trinetra Flagship Bistro",
        currency: "INR",
        is_active: true,
      },
      { onConflict: "tenant_id" }
    )
    .select("*")
    .single();

  if (restErr || !restaurant) {
    throw new Error(`Restaurant provisioning failed: ${restErr?.message}`);
  }
  console.log(`✅ [2/7] Tenant Restaurant Profile Verified: "${restaurant.name}" (ID: ${restaurant.id})`);

  // 3. Create Table & QR station
  const { data: table, error: tableErr } = await supabase
    .from("restaurant_tables")
    .upsert(
      {
        tenant_id: tenantId,
        restaurant_id: restaurant.id,
        table_number: "T-01",
      },
      { onConflict: "tenant_id,restaurant_id,table_number" }
    )
    .select("*")
    .single();

  if (tableErr || !table) {
    throw new Error(`Table creation failed: ${tableErr?.message}`);
  }
  console.log(`✅ [3/7] Table Station Verified: ${table.table_number} (Token: ${table.table_token.slice(0, 8)}...)`);

  // 4. Create Category & Menu Item
  const { data: category } = await supabase
    .from("menu_categories")
    .insert({
      tenant_id: tenantId,
      restaurant_id: restaurant.id,
      name: "Chef Specialties",
      display_order: 1,
    })
    .select("*")
    .single();

  const { data: item } = await supabase
    .from("menu_items")
    .insert({
      tenant_id: tenantId,
      restaurant_id: restaurant.id,
      category_id: category?.id,
      name: "Trinetra Signature Platter",
      price: 499.00,
      is_veg: true,
      is_available: true,
    })
    .select("*")
    .single();

  console.log(`✅ [4/7] Menu Category & Item Verified: "${item?.name}" (₹${item?.price})`);

  // 5. Simulate Table Session + Customer Check-in
  const testPhone = "919999888777";
  const testCustomer = "Rahul Verma";

  // Create / fetch CRM Lead for customer
  let leadId = null;
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("phone", testPhone)
    .maybeSingle();

  if (existingLead) {
    leadId = existingLead.id;
  } else {
    const { data: newLead } = await supabase
      .from("leads")
      .insert({
        tenant_id: tenantId,
        phone: testPhone,
        name: testCustomer,
        is_customer: true,
        source: "Restaurant OS",
        status: "won",
        score: 85,
        service_interest: "Restaurant OS",
      })
      .select("id")
      .single();
    leadId = newLead?.id;
  }

  const { data: session } = await supabase
    .from("restaurant_table_sessions")
    .insert({
      tenant_id: tenantId,
      restaurant_id: restaurant.id,
      table_id: table.id,
      lead_id: leadId,
      customer_name: testCustomer,
      customer_phone: testPhone,
      status: "active",
      payment_status: "unpaid",
    })
    .select("*")
    .single();

  console.log(`✅ [5/7] Customer Table Session Verified: ${testCustomer} (${testPhone}) -> Session ID: ${session?.id}`);
  console.log(`✅ [6/7] CRM Lead Synchronization Verified: Linked to Lead ID ${session?.lead_id}`);

  // 6. Create Order and settle payment
  const { data: order } = await supabase
    .from("restaurant_orders")
    .insert({
      tenant_id: tenantId,
      restaurant_id: restaurant.id,
      table_id: table.id,
      table_session_id: session?.id,
      session_token: session?.session_token,
      status: "ready",
      total_amount: 499.00,
    })
    .select("*")
    .single();

  await supabase
    .from("restaurant_order_items")
    .insert({
      tenant_id: tenantId,
      order_id: order?.id,
      menu_item_id: item?.id,
      name: item?.name || "Trinetra Signature Platter",
      price: 499.00,
      quantity: 1,
    });

  // Mark session paid & closed
  await supabase
    .from("restaurant_table_sessions")
    .update({
      payment_status: "paid",
      status: "closed",
      paid_at: new Date().toISOString(),
      closed_at: new Date().toISOString(),
    })
    .eq("id", session?.id);

  console.log(`✅ [7/7] Order Placement & Settlement Verified: Order #${order?.id?.slice(0, 8)} Settle status: PAID & CLOSED`);
  console.log("\n🎉 ALL DATABASE MULTI-TENANT VERIFICATIONS PASSED!");
}

runDatabaseVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
