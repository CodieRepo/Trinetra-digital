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
  console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runSeed() {
  console.log("🚀 Starting Supabase Restaurant OS seeding...");
  console.log(`📡 Targeting Supabase URL: ${supabaseUrl}`);

  const TENANT_ID = "00000000-0000-0000-0000-000000000001";
  const FALLBACK_RESTAURANT_ID = "11111111-1111-1111-1111-111111111111";

  // 1. Get or Create Restaurant Profile
  console.log("🏢 Seeding Restaurant...");
  let restaurantId = FALLBACK_RESTAURANT_ID;

  const { data: existingRest } = await supabase
    .from("restaurants")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .maybeSingle();

  if (existingRest) {
    restaurantId = existingRest.id;
    console.log(`ℹ️ Existing restaurant found for tenant. ID: ${restaurantId}. Updating profile...`);
    const { error: restErr } = await supabase
      .from("restaurants")
      .update({
        name: "The Trinetra Bistro",
        address: "Gorakhpur, UP, India",
        currency: "INR",
        is_active: true
      })
      .eq("id", restaurantId);

    if (restErr) {
      throw new Error(`Failed to update restaurant: ${restErr.message}`);
    }
  } else {
    console.log("No existing restaurant found. Inserting fresh profile...");
    const { error: restErr } = await supabase
      .from("restaurants")
      .insert({
        id: FALLBACK_RESTAURANT_ID,
        tenant_id: TENANT_ID,
        name: "The Trinetra Bistro",
        address: "Gorakhpur, UP, India",
        currency: "INR",
        is_active: true
      });

    if (restErr) {
      throw new Error(`Failed to insert restaurant: ${restErr.message}`);
    }
  }
  console.log(`✅ Restaurant profile active with ID: ${restaurantId}`);

  // 2. Seed Restaurant Tables (upsert dynamically)
  console.log("🪑 Seeding Tables...");
  const tables = [
    { id: "22222222-2222-2222-2222-222222222201", tenant_id: TENANT_ID, restaurant_id: restaurantId, table_number: "Table 1", table_token: "55555555-5555-5555-5555-555555555501", is_active: true },
    { id: "22222222-2222-2222-2222-222222222202", tenant_id: TENANT_ID, restaurant_id: restaurantId, table_number: "Table 2", table_token: "55555555-5555-5555-5555-555555555502", is_active: true },
    { id: "22222222-2222-2222-2222-222222222203", tenant_id: TENANT_ID, restaurant_id: restaurantId, table_number: "Table 3", table_token: "55555555-5555-5555-5555-555555555503", is_active: true }
  ];

  for (const t of tables) {
    const { error: tErr } = await supabase
      .from("restaurant_tables")
      .upsert(t, { onConflict: "tenant_id,restaurant_id,table_number" });
    if (tErr) {
      console.warn(`⚠️ Table ${t.table_number} seed note: ${tErr.message}`);
    }
  }
  console.log("✅ Restaurant tables seeded!");

  // 3. Seed Menu Categories
  console.log("📁 Seeding Menu Categories...");
  const categories = [
    { id: "33333333-3333-3333-3333-333333333301", tenant_id: TENANT_ID, restaurant_id: restaurantId, name: "Starters", display_order: 1, is_active: true },
    { id: "33333333-3333-3333-3333-333333333302", tenant_id: TENANT_ID, restaurant_id: restaurantId, name: "Main Course", display_order: 2, is_active: true },
    { id: "33333333-3333-3333-3333-333333333303", tenant_id: TENANT_ID, restaurant_id: restaurantId, name: "Beverages", display_order: 3, is_active: true }
  ];

  for (const cat of categories) {
    const { error: cErr } = await supabase
      .from("menu_categories")
      .upsert(cat, { onConflict: "id" });
    if (cErr) {
      console.warn(`⚠️ Category ${cat.name} seed note: ${cErr.message}`);
    }
  }
  console.log("✅ Menu categories seeded!");

  // 4. Seed Menu Items
  console.log("🍕 Seeding Menu Items...");
  const items = [
    { id: "44444444-4444-4444-4444-444444444401", tenant_id: TENANT_ID, restaurant_id: restaurantId, category_id: "33333333-3333-3333-3333-333333333301", name: "Paneer Tikka", description: "Tandoor grilled marinated cottage cheese cubes with bell peppers", price: 249.00, is_available: true, is_veg: true, display_order: 1 },
    { id: "44444444-4444-4444-4444-444444444402", tenant_id: TENANT_ID, restaurant_id: restaurantId, category_id: "33333333-3333-3333-3333-333333333301", name: "Crispy Corn", description: "Sweet corn kernels tossed with spices, garlic and spring onion", price: 189.00, is_available: true, is_veg: true, display_order: 2 },
    { id: "44444444-4444-4444-4444-444444444403", tenant_id: TENANT_ID, restaurant_id: restaurantId, category_id: "33333333-3333-3333-3333-333333333302", name: "Paneer Butter Masala", description: "Rich, creamy and sweetish onion-tomato gravy with soft paneer cubes", price: 299.00, is_available: true, is_veg: true, display_order: 1 },
    { id: "44444444-4444-4444-4444-444444444404", tenant_id: TENANT_ID, restaurant_id: restaurantId, category_id: "33333333-3333-3333-3333-333333333302", name: "Butter Naan", description: "Leavened clay-oven baked flatbread topped with butter", price: 49.00, is_available: true, is_veg: true, display_order: 2 },
    { id: "44444444-4444-4444-4444-444444444405", tenant_id: TENANT_ID, restaurant_id: restaurantId, category_id: "33333333-3333-3333-3333-333333333303", name: "Virgin Mojito", description: "Refreshing lime and mint fizzy beverage with brown sugar", price: 129.00, is_available: true, is_veg: true, display_order: 1 },
    { id: "44444444-4444-4444-4444-444444444406", tenant_id: TENANT_ID, restaurant_id: restaurantId, category_id: "33333333-3333-3333-3333-333333333303", name: "Cold Coffee", description: "Thick creamy blended coffee with dark chocolate drizzle", price: 149.00, is_available: true, is_veg: true, display_order: 2 }
  ];

  for (const item of items) {
    const { error: iErr } = await supabase
      .from("menu_items")
      .upsert(item, { onConflict: "id" });
    if (iErr) {
      console.warn(`⚠️ Menu item ${item.name} seed note: ${iErr.message}`);
    }
  }
  console.log("✅ Menu items seeded!");
  console.log("🎉 Restaurant OS database seeding completed successfully!");
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err.message);
  process.exit(1);
});
