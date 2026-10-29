import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { deductInventoryForOrder } from "../src/lib/services/inventory-deduction.ts";

function loadEnv() {
  const envFiles = [".env.production", ".env.local", ".env"];
  for (const file of envFiles) {
    const p = path.join(process.cwd(), file);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([\w_]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2];
        }
      }
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];

function check(name, condition, details = "") {
  const pass = Boolean(condition);
  console.log(`[${pass ? "✅ PASS" : "❌ FAIL"}] ${name}`);
  if (details) console.log(`   ${details}`);
  results.push({ name, pass, details });
  if (!pass) throw new Error(`Assertion failed: ${name}`);
}

async function runInventoryBOMSuite() {
  console.log("============================================================================");
  console.log("🧪 TRINETRA RESTAURANT OS — INVENTORY & RECIPE (BOM) LIFECYCLE VERIFICATION 🧪");
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log("============================================================================\n");

  // 1. Locate an active restaurant & tenant
  const { data: restaurants, error: restErr } = await db
    .from("restaurants")
    .select("id, tenant_id, name")
    .limit(1);

  check("Database connection and restaurant query", !restErr && restaurants && restaurants.length > 0, `Found restaurant: ${restaurants?.[0]?.name}`);

  const restaurant = restaurants[0];
  const restaurantId = restaurant.id;
  const tenantId = restaurant.tenant_id;

  console.log(`\n🏢 Testing with Tenant: ${tenantId} | Restaurant: ${restaurant.name} (${restaurantId})\n`);

  // 2. Insert / Upsert Raw Materials
  console.log("--- 2. Setting up Raw Material Inventory Items ---");
  const rawItemsToUpsert = [
    {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      name: "Amul Fresh Paneer (Test)",
      sku: "RAW-PAN-TEST",
      category: "dairy",
      unit: "kg",
      current_stock: 10.0,
      min_stock_alert: 2.0,
      cost_per_unit: 360.0,
      supplier_name: "Amul Wholesale Dist.",
      is_active: true,
    },
    {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      name: "Amul Table Butter (Test)",
      sku: "RAW-BUT-TEST",
      category: "dairy",
      unit: "kg",
      current_stock: 5.0,
      min_stock_alert: 1.0,
      cost_per_unit: 480.0,
      supplier_name: "Amul Wholesale Dist.",
      is_active: true,
    },
    {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      name: "Fresh Desi Ghee (Test)",
      sku: "RAW-GHEE-TEST",
      category: "oils",
      unit: "l",
      current_stock: 2.0,
      min_stock_alert: 0.5,
      cost_per_unit: 650.0,
      supplier_name: "Dairy Pure",
      is_active: true,
    },
  ];

  const createdRawItems = [];
  for (const raw of rawItemsToUpsert) {
    const { data: existing } = await db
      .from("restaurant_inventory_items")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .eq("sku", raw.sku)
      .maybeSingle();

    if (existing) {
      const { data: upd } = await db
        .from("restaurant_inventory_items")
        .update({
          current_stock: raw.current_stock,
          min_stock_alert: raw.min_stock_alert,
          cost_per_unit: raw.cost_per_unit,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      createdRawItems.push(upd);
    } else {
      const { data: ins, error: insErr } = await db
        .from("restaurant_inventory_items")
        .insert(raw)
        .select("*")
        .single();
      if (insErr) throw insErr;
      createdRawItems.push(ins);
    }
  }

  check("Raw material inventory items exist in database", createdRawItems.length === 3, `Items: ${createdRawItems.map((i) => i.name).join(", ")}`);

  const paneerItem = createdRawItems.find((i) => i.sku === "RAW-PAN-TEST");
  const butterItem = createdRawItems.find((i) => i.sku === "RAW-BUT-TEST");

  // 3. Setup a Menu Item (Paneer Tikka Test)
  console.log("\n--- 3. Setting up Menu Item for Recipe BOM ---");
  const { data: existingMenu } = await db
    .from("menu_items")
    .select("id, name, price")
    .eq("tenant_id", tenantId)
    .eq("restaurant_id", restaurantId)
    .eq("name", "Paneer Tikka Special (Test)")
    .maybeSingle();

  let menuItem = existingMenu;
  if (!menuItem) {
    // Get or create category
    const { data: cat } = await db
      .from("menu_categories")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .limit(1)
      .maybeSingle();

    let catId = cat?.id;
    if (!catId) {
      const { data: newCat } = await db
        .from("menu_categories")
        .insert({
          tenant_id: tenantId,
          restaurant_id: restaurantId,
          name: "Main Course",
          display_order: 1,
        })
        .select("id")
        .single();
      catId = newCat.id;
    }

    const { data: newMenu, error: mErr } = await db
      .from("menu_items")
      .insert({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        category_id: catId,
        name: "Paneer Tikka Special (Test)",
        price: 350.0,
        is_veg: true,
        is_available: true,
      })
      .select("id, name, price")
      .single();
    if (mErr) throw mErr;
    menuItem = newMenu;
  }

  check("Menu dish exists for Recipe BOM", Boolean(menuItem?.id), `Dish: ${menuItem.name} (₹${menuItem.price})`);

  // 4. Map Recipe Bill of Materials (BOM)
  console.log("\n--- 4. Mapping Recipe Bill of Materials (BOM) ---");
  // Dish: Paneer Tikka Special consumes:
  // 0.200 kg Paneer (cost = 0.200 * 360 = ₹72.00)
  // 0.040 kg Butter (cost = 0.040 * 480 = ₹19.20)
  // Total COGS = ₹91.20 | Price = ₹350.00 | Gross Margin = (350 - 91.20) / 350 = ~73.9%
  await db
    .from("restaurant_recipe_items")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("restaurant_id", restaurantId)
    .eq("menu_item_id", menuItem.id);

  const recipeMappings = [
    {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      menu_item_id: menuItem.id,
      inventory_item_id: paneerItem.id,
      quantity_consumed: 0.2,
      unit: "kg",
      notes: "Main paneer cubes",
    },
    {
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      menu_item_id: menuItem.id,
      inventory_item_id: butterItem.id,
      quantity_consumed: 0.04,
      unit: "kg",
      notes: "Basting butter",
    },
  ];

  const { data: savedRecipes, error: recErr } = await db
    .from("restaurant_recipe_items")
    .insert(recipeMappings)
    .select("*");

  check("Recipe BOM items mapped in database", !recErr && savedRecipes.length === 2, `Ingredients mapped: ${savedRecipes.length}`);

  // 5. Test Automated Inventory Deduction on Order
  console.log("\n--- 5. Executing Automated Inventory Deduction on Order ---");
  // Find table to create a valid test order
  const { data: table } = await db
    .from("restaurant_tables")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("restaurant_id", restaurantId)
    .limit(1)
    .single();

  // Ensure active session exists
  let { data: session } = await db
    .from("restaurant_table_sessions")
    .select("id, session_token")
    .eq("tenant_id", tenantId)
    .eq("restaurant_id", restaurantId)
    .eq("table_id", table.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!session) {
    const { data: newSession, error: sErr } = await db
      .from("restaurant_table_sessions")
      .insert({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        table_id: table.id,
        session_token: crypto.randomUUID(),
        status: "active",
      })
      .select("id, session_token")
      .single();
    if (sErr) throw sErr;
    session = newSession;
  }

  const { data: testOrder, error: oErr } = await db
    .from("restaurant_orders")
    .insert({
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      table_id: table.id,
      table_session_id: session.id,
      session_token: session.session_token,
      status: "placed",
      total_amount: menuItem.price * 2,
      order_source: "pos",
    })
    .select("id")
    .single();
  if (oErr) console.error("Order insert error details:", oErr);

  check("Test order inserted in database", !oErr && Boolean(testOrder?.id), `Order ID: ${testOrder?.id}`);

  // Order quantity = 2 portions of Paneer Tikka
  // Expected deduction:
  // Paneer: 2 * 0.200 = 0.400 kg -> new stock: 10.000 - 0.400 = 9.600 kg
  // Butter: 2 * 0.040 = 0.080 kg -> new stock: 5.000 - 0.080 = 4.920 kg
  const deductionResult = await deductInventoryForOrder({
    tenantId,
    restaurantId,
    orderId: testOrder.id,
    items: [
      {
        menu_item_id: menuItem.id,
        quantity: 2,
        name: menuItem.name,
      },
    ],
  });

  check("Auto-deduction engine executed successfully", deductionResult.success && deductionResult.deductedIngredients === 2, `Deducted ingredients count: ${deductionResult.deductedIngredients}`);

  // Verify updated inventory stocks in DB
  const { data: updatedPaneer } = await db
    .from("restaurant_inventory_items")
    .select("current_stock")
    .eq("id", paneerItem.id)
    .single();

  const { data: updatedButter } = await db
    .from("restaurant_inventory_items")
    .select("current_stock")
    .eq("id", butterItem.id)
    .single();

  check(
    "Paneer stock correctly decremented (10.000 -> 9.600 kg)",
    Math.abs(Number(updatedPaneer.current_stock) - 9.6) < 0.001,
    `Actual stock: ${updatedPaneer.current_stock} kg`
  );

  check(
    "Butter stock correctly decremented (5.000 -> 4.920 kg)",
    Math.abs(Number(updatedButter.current_stock) - 4.92) < 0.001,
    `Actual stock: ${updatedButter.current_stock} kg`
  );

  // 6. Verify Stock Movements Audit Ledger
  console.log("\n--- 6. Verifying Stock Movement Audit Logs ---");
  const { data: movements, error: movErr } = await db
    .from("restaurant_stock_movements")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("restaurant_id", restaurantId)
    .eq("order_id", testOrder.id);

  check("Stock movement audit logs generated for order consumption", !movErr && movements && movements.length === 2, `Order movements found: ${movements?.length}`);

  // 7. Test Spoilage / Wastage Logging
  console.log("\n--- 7. Testing Wastage / Spoilage Deduction ---");
  // Log 0.600 kg Paneer wastage (spoilage)
  // Expected new stock: 9.600 - 0.600 = 9.000 kg
  const wastageQty = 0.6;
  const currentPaneerVal = Number(updatedPaneer.current_stock);
  const newPaneerVal = Math.round((currentPaneerVal - wastageQty) * 1000) / 1000;

  await db
    .from("restaurant_inventory_items")
    .update({ current_stock: newPaneerVal })
    .eq("id", paneerItem.id);

  await db.from("restaurant_stock_movements").insert({
    tenant_id: tenantId,
    restaurant_id: restaurantId,
    inventory_item_id: paneerItem.id,
    movement_type: "wastage_spoilage",
    quantity: -wastageQty,
    previous_stock: currentPaneerVal,
    new_stock: newPaneerVal,
    actor_name: "Head Chef",
    notes: "[SPOILAGE] Prep trimming and refrigeration failure",
  });

  const { data: afterWastagePaneer } = await db
    .from("restaurant_inventory_items")
    .select("current_stock")
    .eq("id", paneerItem.id)
    .single();

  check(
    "Wastage stock reduction verified (9.600 -> 9.000 kg)",
    Math.abs(Number(afterWastagePaneer.current_stock) - 9.0) < 0.001,
    `Actual stock after wastage: ${afterWastagePaneer.current_stock} kg`
  );

  // 8. Test Stock In (Purchase Addition)
  console.log("\n--- 8. Testing Stock In (Purchase Addition) ---");
  // Purchase +5.000 kg Paneer -> Expected: 9.000 + 5.000 = 14.000 kg
  const purchaseQty = 5.0;
  const beforePurchaseVal = Number(afterWastagePaneer.current_stock);
  const afterPurchaseVal = Math.round((beforePurchaseVal + purchaseQty) * 1000) / 1000;

  await db
    .from("restaurant_inventory_items")
    .update({ current_stock: afterPurchaseVal })
    .eq("id", paneerItem.id);

  await db.from("restaurant_stock_movements").insert({
    tenant_id: tenantId,
    restaurant_id: restaurantId,
    inventory_item_id: paneerItem.id,
    movement_type: "purchase_in",
    quantity: purchaseQty,
    previous_stock: beforePurchaseVal,
    new_stock: afterPurchaseVal,
    actor_name: "Inventory Manager",
    notes: "Purchase Invoice #INV-9923 from Dairy Supplier",
  });

  const { data: finalPaneer } = await db
    .from("restaurant_inventory_items")
    .select("current_stock")
    .eq("id", paneerItem.id)
    .single();

  check(
    "Purchase Stock In verified (9.000 -> 14.000 kg)",
    Math.abs(Number(finalPaneer.current_stock) - 14.0) < 0.001,
    `Actual stock after purchase: ${finalPaneer.current_stock} kg`
  );

  console.log("\n============================================================================");
  console.log(`🎉 ALL ${results.length} INVENTORY & RECIPE (BOM) TESTS PASSED 100%! 🎉`);
  console.log("============================================================================");
}

runInventoryBOMSuite().catch((err) => {
  console.error("\n❌ Inventory BOM Suite Failed:", err);
  process.exit(1);
});
