import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCloudflareBindings } from "@/lib/cloudflare/bindings";
import { getCachedMenuPayload, setCachedMenuPayload } from "@/lib/cache/kv-menu-cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tableToken: string }> }
) {
  try {
    const { tableToken } = await params;

    if (!tableToken) {
      return NextResponse.json({ error: "tableToken is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Query table by table_token
    const { data: table, error: tableErr } = await supabase
      .from("restaurant_tables")
      .select("id, restaurant_id, table_number, table_token, floor_id, is_active")
      .eq("table_token", tableToken)
      .maybeSingle();

    if (tableErr || !table || table.is_active === false) {
      return NextResponse.json({ error: "Table not found or inactive" }, { status: 404 });
    }

    const cf = await getCloudflareBindings();
    const cached = await getCachedMenuPayload<Record<string, unknown>>(
      cf?.MENU_CACHE,
      table.restaurant_id,
      tableToken
    );
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "x-trinetra-cache": "HIT",
          "cache-control": "public, max-age=0, must-revalidate",
        },
      });
    }

    let floorName: string | null = null;
    if (table.floor_id) {
      const { data: floor } = await supabase
        .from("restaurant_floors")
        .select("name")
        .eq("id", table.floor_id)
        .maybeSingle();
      if (floor) {
        floorName = floor.name;
      }
    }

    // Query restaurant info (standard guaranteed columns only)
    const { data: restaurant, error: restErr } = await supabase
      .from("restaurants")
      .select("id, tenant_id, name, address, currency")
      .eq("id", table.restaurant_id)
      .maybeSingle();

    if (restErr || !restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Query custom UPI settings safely from tenant_settings if available
    let upiId: string | null = null;
    let upiQrUrl: string | null = null;

    if (restaurant.tenant_id) {
      try {
        const { data: tenantSettings } = await supabase
          .from("tenant_settings")
          .select("feature_flags")
          .eq("tenant_id", restaurant.tenant_id)
          .maybeSingle();

        if (tenantSettings?.feature_flags) {
          const flags = tenantSettings.feature_flags as Record<string, any>;
          const ps =
            flags.payment_settings_by_restaurant?.[table.restaurant_id] ||
            flags.payment_settings;
          if (ps) {
            upiId = ps.upi_id || null;
            upiQrUrl = ps.upi_qr_url || null;
          }
        }
      } catch (tsErr) {
        console.warn("[TableRoute] Tenant settings lookup note:", tsErr);
      }
    }

    // Query menu categories (is_active = true, ordered by display_order)
    const { data: categories } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", table.restaurant_id)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    // Query menu items (is_available = true, ordered by display_order)
    const { data: items } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", table.restaurant_id)
      .eq("is_available", true)
      .order("display_order", { ascending: true });

    const payload = {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        currency: restaurant.currency || "INR",
        upi_id: upiId,
        upi_qr_url: upiQrUrl,
      },
      table: {
        id: table.id,
        table_number: table.table_number,
        table_token: table.table_token,
        floor_id: table.floor_id || null,
        floor_name: floorName || "Dining Area",
      },
      menu: {
        categories: categories || [],
        items: items || [],
      },
    };

    await setCachedMenuPayload(cf?.MENU_CACHE, table.restaurant_id, tableToken, payload, 60);

    return NextResponse.json(payload, {
      headers: {
        "x-trinetra-cache": "MISS",
        "cache-control": "public, max-age=0, must-revalidate",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
