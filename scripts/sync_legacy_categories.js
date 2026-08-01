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

async function syncCategories() {
  console.log("=== SYNCING MENU_CATEGORIES TO LEGACY CATEGORIES TABLE ===");
  
  // 1. Fetch all menu_categories
  const { data: mcats, error: mErr } = await supabase.from("menu_categories").select("*");
  if (mErr) {
    console.error("Failed to fetch menu_categories:", mErr);
    process.exit(1);
  }
  console.log(`Found ${mcats.length} menu categories.`);

  // 2. Fetch branch_id from existing categories table if available
  const { data: legacySample } = await supabase.from("categories").select("branch_id").limit(1);
  const branchId = legacySample && legacySample[0] ? legacySample[0].branch_id : "abe32f5f-aabe-4962-ac38-710e5b8cc5e3";

  // 3. Upsert each category into legacy categories table
  for (const mcat of mcats) {
    const { error: upErr } = await supabase.from("categories").upsert({
      id: mcat.id,
      branch_id: branchId,
      name: mcat.name,
      sort_order: mcat.display_order || 1,
    });
    if (upErr) {
      console.warn(`Failed to sync category ${mcat.id} (${mcat.name}): ${upErr.message}`);
    } else {
      console.log(`✓ Synced category: "${mcat.name}" (${mcat.id})`);
    }
  }

  // 4. Verify inserting item into menu_items
  const sampleCat = mcats[0];
  console.log(`\nTesting menu_items insert for category "${sampleCat.name}" (${sampleCat.id})...`);
  const { data: itemData, error: itemErr } = await supabase
    .from("menu_items")
    .insert({
      tenant_id: sampleCat.tenant_id,
      restaurant_id: sampleCat.restaurant_id,
      category_id: sampleCat.id,
      name: "Verification Signature Dish",
      description: "Delicately prepared for E2E testing.",
      price: 299.00,
      is_veg: true,
      is_available: true,
    })
    .select("*")
    .single();

  if (itemErr) {
    console.error("❌ menu_items insert test failed:", itemErr.message);
  } else {
    console.log(`✅ SUCCESS! Inserted menu_item ID: ${itemData.id} ("${itemData.name}")`);
    // Cleanup verification item
    await supabase.from("menu_items").delete().eq("id", itemData.id);
    console.log("✓ Test item cleaned up.");
  }
}

syncCategories();
