import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  try {
    const body = await request.json();
    const {
      restaurant_name,
      owner_name,
      email,
      phone,
      address,
      plan,
      password,
    } = body;

    if (!restaurant_name || !owner_name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Restaurant Name, Owner Name, Email, and Password are required." },
        { status: 400 }
      );
    }

    // 1. Create User in Supabase Auth
    console.log(`[Onboarding] Creating auth user: ${email}...`);
    const { data: authUser, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: owner_name, phone },
    });

    if (authError || !authUser.user) {
      console.error("[Onboarding] Auth creation failed:", authError);
      return NextResponse.json(
        { success: false, error: authError?.message || "Failed to create authentication account." },
        { status: 400 }
      );
    }

    const userId = authUser.user.id;
    const tenantId = crypto.randomUUID();
    const slug = restaurant_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // 2. Insert Tenant record
    console.log(`[Onboarding] Creating tenant Org: ${tenantId}...`);
    const { error: tenantErr } = await db.from("tenants").insert({
      id: tenantId,
      name: `${restaurant_name} Org`,
      slug,
      plan: plan || "pro",
      status: "active",
    });

    if (tenantErr) {
      console.error("[Onboarding] Tenant insert failed:", tenantErr);
      await db.auth.admin.deleteUser(userId); // Rollback auth user
      return NextResponse.json({ success: false, error: tenantErr.message }, { status: 500 });
    }

    // 3. Insert Profile record (legacy profiles system check)
    const { error: profileErr } = await db.from("profiles").insert({
      id: userId,
      tenant_id: tenantId,
      username: email,
      role: "client_admin",
    });

    if (profileErr) {
      console.warn("[Onboarding] Profile insert note:", profileErr.message);
    }

    // 4. Insert Restaurant record
    console.log(`[Onboarding] Creating restaurant profile...`);
    const { data: restaurant, error: restErr } = await db
      .from("restaurants")
      .insert({
        tenant_id: tenantId,
        name: restaurant_name,
        address: address || null,
        currency: "INR",
        is_active: true,
      })
      .select("id")
      .single();

    if (restErr || !restaurant) {
      console.error("[Onboarding] Restaurant profile creation failed:", restErr);
      // Clean up tenant
      await db.from("tenants").delete().eq("id", tenantId);
      await db.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { success: false, error: restErr?.message || "Failed to create restaurant profile." },
        { status: 500 }
      );
    }

    const restaurantId = restaurant.id;

    // 5. Insert Users Roles assignment
    await db.from("users_roles").insert({
      user_id: userId,
      tenant_id: tenantId,
      role: "owner",
    });

    // 6. Seed Default Menu Categories
    console.log("[Onboarding] Seeding menu categories...");
    await db.from("menu_categories").insert([
      { tenant_id: tenantId, restaurant_id: restaurantId, name: "Starters", display_order: 1 },
      { tenant_id: tenantId, restaurant_id: restaurantId, name: "Main Course", display_order: 2 },
      { tenant_id: tenantId, restaurant_id: restaurantId, name: "Beverages", display_order: 3 },
    ]);

    // 7. Seed Default Tables
    console.log("[Onboarding] Seeding tables...");
    await db.from("restaurant_tables").insert([
      { tenant_id: tenantId, restaurant_id: restaurantId, table_number: "Table 1" },
      { tenant_id: tenantId, restaurant_id: restaurantId, table_number: "Table 2" },
      { tenant_id: tenantId, restaurant_id: restaurantId, table_number: "Table 3" },
    ]);

    console.log(`[Onboarding] Onboarding successfully finished for ${restaurant_name}!`);
    return NextResponse.json({
      success: true,
      tenant_id: tenantId,
      restaurant_id: restaurantId,
      owner_id: userId,
      login_url: "/restaurant",
    });
  } catch (err: any) {
    console.error("❌ Onboarding Exception:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
