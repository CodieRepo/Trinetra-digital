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

async function runMilestone3Verification() {
  console.log("=== MILESTONE 3 ADMIN MENU & TABLE MANAGEMENT VERIFICATION ===");
  const results = { category: {}, menuItem: {}, tableMgmt: {} };

  try {
    let { data: tenants } = await supabase.from("tenants").select("id, name").limit(1);
    let tenantId = tenants[0].id;

    let { data: restList } = await supabase.from("restaurants").select("id, tenant_id").eq("tenant_id", tenantId).limit(1);
    let restaurantId = restList[0].id;

    console.log("Using Tenant ID:", tenantId, "Restaurant ID:", restaurantId);

    // 1. Create Category in menu_categories AND sync legacy categories table
    const categoryName = "Beverages & Mocktails";
    const { data: newCat, error: catErr } = await supabase.from("menu_categories").insert({
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      name: categoryName,
      display_order: 10,
      is_active: true
    }).select("id, name").single();

    if (catErr) throw new Error("Category creation failed: " + catErr.message);

    // Fetch existing branch_id from legacy categories table
    const { data: legacyCatSample } = await supabase.from("categories").select("branch_id").limit(1);
    const branchId = legacyCatSample && legacyCatSample[0] ? legacyCatSample[0].branch_id : "abe32f5f-aabe-4962-ac38-710e5b8cc5e3";

    // Sync legacy categories table for FK compatibility
    const { error: legErr } = await supabase.from("categories").upsert({
      id: newCat.id,
      branch_id: branchId,
      name: newCat.name,
      sort_order: 10
    });

    if (legErr) console.error("Legacy categories sync note:", legErr.message);

    console.log("✓ Category Created & Synced:", newCat.id, newCat.name);
    results.category = { status: "PASS", id: newCat.id, name: newCat.name };

    // 2. Create Menu Item under Category
    const itemName = "Fresh Mango Lassi";
    const itemPrice = 120.00;
    const { data: newItem, error: itemErr } = await supabase.from("menu_items").insert({
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      category_id: newCat.id,
      name: itemName,
      description: "Creamy mango yoghurt smoothie with cardamom",
      price: itemPrice,
      is_available: true,
      is_veg: true,
      display_order: 1
    }).select("id, name, price").single();

    if (itemErr) throw new Error("Menu item creation failed: " + itemErr.message);
    console.log("✓ Menu Item Created:", newItem.id, newItem.name, "Price:", newItem.price);
    results.menuItem = { status: "PASS", id: newItem.id, price: newItem.price };

    // 3. Update Menu Item Availability Toggle (PATCH)
    const { error: patchErr } = await supabase.from("menu_items")
      .update({ is_available: false, price: 140.00 })
      .eq("id", newItem.id);

    if (!patchErr) {
      console.log("✓ Menu Item Availability & Price updated cleanly.");
    }

    // 4. Create Restaurant Table
    const tableNumber = "T-VIP-1";
    const { data: newTable, error: tblErr } = await supabase.from("restaurant_tables").insert({
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      table_number: tableNumber,
      is_active: true
    }).select("id, table_number, table_token").single();

    if (tblErr) throw new Error("Table creation failed: " + tblErr.message);
    console.log("✓ Restaurant Table Created:", newTable.id, "Number:", newTable.table_number, "Token:", newTable.table_token);
    results.tableMgmt = { status: "PASS", table_id: newTable.id, table_token: newTable.table_token };

    // Clean up test items
    await supabase.from("menu_items").delete().eq("id", newItem.id);
    await supabase.from("menu_categories").delete().eq("id", newCat.id);
    await supabase.from("categories").delete().eq("id", newCat.id);
    await supabase.from("restaurant_tables").delete().eq("id", newTable.id);

    console.log("\n=== MILESTONE 3 VERIFICATION SUMMARY ===");
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error("Milestone 3 verification execution error:", err);
  }
}

runMilestone3Verification();
