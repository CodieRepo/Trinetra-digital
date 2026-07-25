import { NextResponse } from "next/server";
import { getErrorMessage } from "../../services/server";
import { getDatabaseClient } from "@trinetra/core/database";

export const dynamic = "force-dynamic";

type TableRecord = {
  id: string;
  restaurant_id: string;
  table_number: string;
  table_token: string;
  is_active: boolean;
};

type RestaurantRecord = {
  id: string;
  name: string;
  address: string | null;
  currency: string | null;
  is_active: boolean;
};

type MenuCategoryRecord = {
  id: string;
  restaurant_id: string;
  name: string;
  display_order: number | null;
  is_active: boolean;
};

type MenuItemRecord = {
  id: string;
  category_id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  is_available: boolean;
  is_veg: boolean;
  display_order: number | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ table_token: string }> },
) {
  try {
    const { table_token: tableToken } = await params;
    if (!tableToken) {
      return NextResponse.json({ error: "Missing table token" }, { status: 400 });
    }

    const getDatabaseClient() = getSupabaseAdmin();
    const { data: table, error: tableError } = await getDatabaseClient()
      .from("restaurant_tables")
      .select("id, restaurant_id, table_number, table_token, is_active")
      .eq("table_token", tableToken)
      .maybeSingle<TableRecord>();

    if (tableError) {
      throw new Error(tableError.message);
    }

    if (!table || !table.is_active) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const [{ data: restaurant, error: restaurantError }, { data: categories, error: categoriesError }, { data: items, error: itemsError }] = await Promise.all([
      getDatabaseClient()
        .from("restaurants")
        .select("id, name, address, currency, is_active")
        .eq("id", table.restaurant_id)
        .maybeSingle<RestaurantRecord>(),
      getDatabaseClient()
        .from("menu_categories")
        .select("id, restaurant_id, name, display_order, is_active")
        .eq("restaurant_id", table.restaurant_id)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true })
        .returns<MenuCategoryRecord[]>(),
      getDatabaseClient()
        .from("menu_items")
        .select("id, category_id, restaurant_id, name, description, price, image_url, is_available, is_veg, display_order")
        .eq("restaurant_id", table.restaurant_id)
        .eq("is_available", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true })
        .returns<MenuItemRecord[]>(),
    ]);

    if (restaurantError || categoriesError || itemsError) {
      throw new Error(
        restaurantError?.message || categoriesError?.message || itemsError?.message || "Failed to load menu",
      );
    }

    if (!restaurant || !restaurant.is_active) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        currency: restaurant.currency || "INR",
      },
      table: {
        id: table.id,
        table_number: table.table_number,
        table_token: table.table_token,
      },
      menu: {
        categories: categories ?? [],
        items:
          items?.map((item) => ({
            ...item,
            price: Number(item.price),
          })) ?? [],
      },
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
