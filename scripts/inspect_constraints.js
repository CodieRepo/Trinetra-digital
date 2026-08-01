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

async function inspect() {
  const { data: cats } = await supabase.from("menu_categories").select("*").limit(5);
  console.log("Existing categories:", cats);

  if (cats && cats.length > 0) {
    const cat = cats[0];
    console.log("Testing insert into menu_items with cat:", cat);
    const { data, error } = await supabase.from("menu_items").insert({
      tenant_id: cat.tenant_id,
      restaurant_id: cat.restaurant_id,
      category_id: cat.id,
      name: "Test Inspection Item",
      price: 99.00
    }).select("*");
    console.log("Insert result:", data, "Error:", error);
    if (data && data.length > 0) {
      await supabase.from("menu_items").delete().eq("id", data[0].id);
    }
  }
}

inspect();
