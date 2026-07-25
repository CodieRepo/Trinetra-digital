import { NextResponse } from "next/server";
import { isUuid } from "../types";
import {
  getApiErrorStatus,
  getErrorMessage,
  requireRestaurantClientContext,
} from "../../services/server";

export const dynamic = "force-dynamic";

type MenuCategoryRecord = {
  id: string;
  name: string;
  display_order: number | null;
  is_active: boolean;
};

type MenuItemRecord = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | string;
  image_url: string | null;
  is_available: boolean;
  is_veg: boolean;
  display_order: number | null;
};

export async function GET() {
  try {
    const context = await requireRestaurantClientContext();
    const [{ data: categories, error: categoriesError }, { data: items, error: itemsError }] = await Promise.all([
      getDatabaseClient()
        .from("menu_categories")
        .select("id, name, display_order, is_active")
        .eq("restaurant_id", context.restaurant.id)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true })
        .returns<MenuCategoryRecord[]>(),
      getDatabaseClient()
        .from("menu_items")
        .select("id, category_id, name, description, price, image_url, is_available, is_veg, display_order")
        .eq("restaurant_id", context.restaurant.id)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true })
        .returns<MenuItemRecord[]>(),
    ]);

    if (categoriesError || itemsError) {
      throw new Error(categoriesError?.message || itemsError?.message || "Failed to load menu");
    }

    return NextResponse.json({
      categories: categories ?? [],
      items:
        items?.map((item) => ({
          ...item,
          price: Number(item.price),
        })) ?? [],
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireRestaurantClientContext();
    const body = await request.json();
    const type = body?.type === "category" ? "category" : body?.type === "item" ? "item" : "";

    if (!type) {
      return NextResponse.json({ error: "type must be category or item" }, { status: 400 });
    }

    if (type === "category") {
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      const displayOrder = Number(body?.display_order ?? 0);
      if (!name) {
        return NextResponse.json({ error: "Category name is required" }, { status: 400 });
      }

      const { data: category, error } = await getDatabaseClient()
        .from("menu_categories")
        .insert({
          restaurant_id: context.restaurant.id,
          name,
          display_order: Number.isFinite(displayOrder) ? displayOrder : 0,
          is_active: body?.is_active !== false,
        })
        .select("id, name, display_order, is_active")
        .single<MenuCategoryRecord>();

      if (error || !category) {
        throw new Error(error?.message || "Failed to create category");
      }

      return NextResponse.json({ category });
    }

    const categoryId = typeof body?.category_id === "string" ? body.category_id.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : null;
    const imageUrl = typeof body?.image_url === "string" ? body.image_url.trim() : null;
    const price = Number(body?.price ?? 0);
    const displayOrder = Number(body?.display_order ?? 0);

    if (!isUuid(categoryId) || !name || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Invalid item payload" }, { status: 400 });
    }

    const { data: category, error: categoryError } = await getDatabaseClient()
      .from("menu_categories")
      .select("id")
      .eq("id", categoryId)
      .eq("restaurant_id", context.restaurant.id)
      .maybeSingle<{ id: string }>();

    if (categoryError) {
      throw new Error(categoryError.message);
    }

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const { data: item, error } = await getDatabaseClient()
      .from("menu_items")
      .insert({
        category_id: categoryId,
        restaurant_id: context.restaurant.id,
        name,
        description,
        price,
        image_url: imageUrl,
        is_available: body?.is_available !== false,
        is_veg: body?.is_veg !== false,
        display_order: Number.isFinite(displayOrder) ? displayOrder : 0,
      })
      .select("id, category_id, name, description, price, image_url, is_available, is_veg, display_order")
      .single<MenuItemRecord>();

    if (error || !item) {
      throw new Error(error?.message || "Failed to create item");
    }

    return NextResponse.json({
      item: {
        ...item,
        price: Number(item.price),
      },
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireRestaurantClientContext();
    const body = await request.json();
    const type = body?.type === "category" ? "category" : body?.type === "item" ? "item" : "";
    const id = typeof body?.id === "string" ? body.id.trim() : "";

    if (!type || !isUuid(id)) {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
    }

    if (type === "category") {
      const updates: Record<string, unknown> = {};
      if (typeof body?.name === "string") updates.name = body.name.trim();
      if (body?.display_order !== undefined) updates.display_order = Number(body.display_order || 0);
      if (body?.is_active !== undefined) updates.is_active = Boolean(body.is_active);

      const { data: category, error } = await getDatabaseClient()
        .from("menu_categories")
        .update(updates)
        .eq("id", id)
        .eq("restaurant_id", context.restaurant.id)
        .select("id, name, display_order, is_active")
        .single<MenuCategoryRecord>();

      if (error || !category) {
        throw new Error(error?.message || "Failed to update category");
      }

      return NextResponse.json({ category });
    }

    const updates: Record<string, unknown> = {};
    if (typeof body?.category_id === "string" && isUuid(body.category_id.trim())) updates.category_id = body.category_id.trim();
    if (typeof body?.name === "string") updates.name = body.name.trim();
    if (body?.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
    if (body?.image_url !== undefined) updates.image_url = body.image_url ? String(body.image_url).trim() : null;
    if (body?.price !== undefined) updates.price = Number(body.price);
    if (body?.is_available !== undefined) updates.is_available = Boolean(body.is_available);
    if (body?.is_veg !== undefined) updates.is_veg = Boolean(body.is_veg);
    if (body?.display_order !== undefined) updates.display_order = Number(body.display_order || 0);

    const { data: item, error } = await getDatabaseClient()
      .from("menu_items")
      .update(updates)
      .eq("id", id)
      .eq("restaurant_id", context.restaurant.id)
      .select("id, category_id, name, description, price, image_url, is_available, is_veg, display_order")
      .single<MenuItemRecord>();

    if (error || !item) {
      throw new Error(error?.message || "Failed to update item");
    }

    return NextResponse.json({
      item: {
        ...item,
        price: Number(item.price),
      },
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireRestaurantClientContext();
    const body = await request.json();
    const type = body?.type === "category" ? "category" : body?.type === "item" ? "item" : "";
    const id = typeof body?.id === "string" ? body.id.trim() : "";

    if (!type || !isUuid(id)) {
      return NextResponse.json({ error: "Invalid delete payload" }, { status: 400 });
    }

    const table = type === "category" ? "menu_categories" : "menu_items";
    const { error } = await getDatabaseClient()
      .from(table)
      .delete()
      .eq("id", id)
      .eq("restaurant_id", context.restaurant.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}
