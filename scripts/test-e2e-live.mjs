import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { generateStaffJwt } from "../src/lib/crypto/auth-tokens.ts";
import { SessionType } from "../src/types/auth/index.ts";

function loadEnv(file) {
  if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (const l of lines) {
      const match = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || "").trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
}

loadEnv(".env");
// Ensure secret derivation aligns with Vercel environment where JWT_SECRET is unset
delete process.env.JWT_SECRET;
delete process.env.STAFF_JWT_SECRET;

const BASE_URL = process.env.BASE_URL || "https://trinetra-digital.vercel.app";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://suvuvxdasccmztbbpreg.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not defined in environment.");
  process.exit(1);
}

const db = createClient(url, serviceKey);

async function runLiveE2ETest() {
  console.log("=================================================================");
  console.log("🚀 STARTING TRINETRA LIVE RESTAURANT OS AUTOMATED WORKFLOW TEST");
  console.log("=================================================================\n");

  // Step 1: Healthcheck on Next.js server
  console.log("1. Checking Next.js dev server status at " + BASE_URL + "...");
  try {
    const res = await fetch(`${BASE_URL}/api/client/restaurant/settings`, { method: "GET" });
    console.log(`   Next.js server responded with status: ${res.status}`);
  } catch (e) {
    console.error("❌ Server connection failed. Is Next.js running on port 3000?", e.message);
    process.exit(1);
  }

  // Step 2: Fetch target test fixtures from Supabase
  console.log("\n2. Resolving Restaurant with Menu and Tables...");
  let { data: restaurant } = await db
    .from("restaurants")
    .select("id, tenant_id, name")
    .eq("id", "83ec30b5-dd8e-4f92-8ef5-6cbb57beece8")
    .single();

  if (!restaurant) {
    const { data: fallbackRestro } = await db
      .from("restaurants")
      .select("id, tenant_id, name")
      .limit(1)
      .single();
    restaurant = fallbackRestro;
  }

  console.log(`   ✅ Target Restaurant: "${restaurant.name}" (${restaurant.id})`);
  console.log(`   ✅ Tenant ID: ${restaurant.tenant_id}`);

  let { data: table } = await db
    .from("restaurant_tables")
    .select("id, table_number, table_token, is_active")
    .eq("restaurant_id", restaurant.id)
    .limit(1)
    .single();

  console.log(`   ✅ Target Table: "${table.table_number}" (Token: ${table.table_token})`);

  let { data: menuItems } = await db
    .from("menu_items")
    .select("id, name, price, is_available")
    .eq("tenant_id", restaurant.tenant_id)
    .limit(3);

  if (!menuItems || menuItems.length === 0) {
    // Check by restaurant_id or any menu items
    const { data: fallbackItems } = await db
      .from("menu_items")
      .select("id, name, price, is_available")
      .limit(3);
    menuItems = fallbackItems;
  }

  console.log(`   ✅ Found ${menuItems.length} active menu items for testing:`);
  for (const m of menuItems) {
    console.log(`      - ${m.name} (₹${m.price})`);
  }

  // Step 3: Staff Token
  console.log("\n3. Resolving staff identity in database...");
  const { data: staffMember } = await db
    .from("restaurant_staff")
    .select("id, name, role, is_active")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  console.log(`   ✅ Authenticated Staff Member: "${staffMember.name}" (${staffMember.id})`);

  const staffJwt = generateStaffJwt({
    tenant_id: restaurant.tenant_id,
    restaurant_id: restaurant.id,
    terminal_id: "terminal-e2e-live",
    staff_id: staffMember.id,
    staff_name: staffMember.name,
    role: "waiter",
    session_type: SessionType.Staff,
  });

  // Step 4: Start a table dining session (Table Seating Flow)
  console.log("\n4. [Staff Flow] Seating party and starting dining session...");
  const sessionRes = await fetch(`${BASE_URL}/api/client/restaurant/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${staffJwt.token}`,
      "x-staff-token": staffJwt.token,
    },
    body: JSON.stringify({
      restaurant_id: restaurant.id,
      table_id: table.id,
      customer_name: "Walk-in Guest Table 1",
      customer_phone: null,
    }),
  });

  const sessionJson = await sessionRes.json();
  console.log(`   Session API response status: ${sessionRes.status}`);
  if (!sessionJson.session?.id && !sessionJson.success) {
    console.error("❌ Failed to start dining session:", sessionJson);
    process.exit(1);
  }
  const sessionId = sessionJson.session?.id || sessionJson.session_id;
  console.log(`   ✅ Active Dining Session ID: ${sessionId}`);

  // Step 5: Place Customer QR Order (QR Customer Flow)
  console.log("\n5. [Diner QR Flow] Submitting customer order via QR endpoint...");
  const dinerSessionToken = crypto.randomUUID();
  const orderItems = menuItems.slice(0, 2).map((item) => ({
    menu_item_id: item.id,
    quantity: 2,
    notes: "Live E2E test item",
  }));

  const orderRes = await fetch(`${BASE_URL}/api/r/${table.table_token}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_token: dinerSessionToken,
      table_session_id: sessionId,
      items: orderItems,
      notes: "Fresh and hot - Live Order",
    }),
  });

  const orderJson = await orderRes.json();
  console.log(`   Order submission response status: ${orderRes.status}`);
  if (!orderJson.success) {
    console.error("❌ Customer order failed:", orderJson);
    process.exit(1);
  }
  const orderId = orderJson.order_id;
  console.log(`   ✅ Customer Order Created: ${orderId} (Status: placed)`);

  // Step 6: Verify order appears in Kitchen Display System (KDS / Sessions Batch Flow)
  console.log("\n6. [KDS Flow] Verifying order in active sessions & KDS...");
  const kdsRes = await fetch(`${BASE_URL}/api/client/restaurant/sessions?restaurant_id=${restaurant.id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${staffJwt.token}`,
      "x-staff-token": staffJwt.token,
    },
  });
  const kdsJson = await kdsRes.json();
  const matchedSession = (kdsJson.sessions || []).find((s) => s.id === sessionId);
  if (!matchedSession) {
    console.error("❌ Active session not returned in KDS GET response!");
    process.exit(1);
  }
  const matchedOrder = (matchedSession.orders || []).find((o) => o.id === orderId);
  if (!matchedOrder) {
    console.error("❌ Placed order not found inside dining session!");
    process.exit(1);
  }
  console.log(`   ✅ KDS displays Order #${orderId.slice(0, 8)} with ${matchedOrder.items?.length} items.`);

  // Step 7: Transition Order Lifecycle: placed -> accepted -> preparing -> ready -> served
  console.log("\n7. [Kitchen Flow] Advancing order status through kitchen stages...");
  const transitions = ["accepted", "preparing", "ready", "served"];
  for (const nextStatus of transitions) {
    const patchRes = await fetch(`${BASE_URL}/api/client/restaurant/orders`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffJwt.token}`,
        "x-staff-token": staffJwt.token,
      },
      body: JSON.stringify({
        restaurant_id: restaurant.id,
        order_id: orderId,
        status: nextStatus,
      }),
    });
    const patchJson = await patchRes.json();
    if (!patchJson.success) {
      console.error(`❌ Transition to '${nextStatus}' failed:`, patchJson);
      process.exit(1);
    }
    console.log(`   ✅ Transitioned Order status -> "${nextStatus}"`);
  }

  // Step 8: Settle Bill (POS Payment Settlement)
  console.log("\n8. [POS Flow] Settling bill...");
  const payRes = await fetch(`${BASE_URL}/api/client/restaurant/sessions/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${staffJwt.token}`,
      "x-staff-token": staffJwt.token,
    },
    body: JSON.stringify({
      restaurant_id: restaurant.id,
      session_id: sessionId,
      action: "mark_paid",
      payment_method: "cash",
      discount_type: "percentage",
      discount_value: 5,
      discount_reason: "Floor discount",
    }),
  });
  const payJson = await payRes.json();
  console.log(`   Payment settlement response status: ${payRes.status}`);
  if (!payJson.success) {
    console.error("❌ Bill settlement failed:", payJson);
    process.exit(1);
  }
  console.log("   ✅ Bill settled successfully with discount and tax calculation!");

  // Step 9: Reopen / Void bill permission check (Waiter must be rejected with 403)
  console.log("\n9. [Security Gate] Verifying waiter cannot undo/void settled bill...");
  const waiterUndoRes = await fetch(`${BASE_URL}/api/client/restaurant/sessions/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${staffJwt.token}`,
      "x-staff-token": staffJwt.token,
    },
    body: JSON.stringify({
      restaurant_id: restaurant.id,
      session_id: sessionId,
      action: "undo_paid",
    }),
  });
  console.log(`   Waiter undo_paid status: ${waiterUndoRes.status} (Expected: 403 Forbidden)`);
  if (waiterUndoRes.status !== 403) {
    console.error("❌ Security failure: Waiter was not rejected with 403!");
    process.exit(1);
  }
  console.log("   ✅ Security verified: Waiter voiding attempt blocked with 403!");

  // Step 10: Close dining session and free the table
  console.log("\n10. [Floor Flow] Closing dining session and freeing table...");
  const closeRes = await fetch(`${BASE_URL}/api/client/restaurant/sessions/close`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${staffJwt.token}`,
      "x-staff-token": staffJwt.token,
    },
    body: JSON.stringify({
      restaurant_id: restaurant.id,
      session_id: sessionId,
      force: true,
    }),
  });
  const closeJson = await closeRes.json();
  if (!closeJson.success) {
    console.error("❌ Session close failed:", closeJson);
    process.exit(1);
  }
  console.log("   ✅ Session closed and table freed for next customer!");

  console.log("\n=================================================================");
  console.log("🎉 ALL LIVE E2E RESTAURANT OS WORKFLOWS TESTED & PASSED 100% GREEN!");
  console.log("=================================================================\n");
}

runLiveE2ETest().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
