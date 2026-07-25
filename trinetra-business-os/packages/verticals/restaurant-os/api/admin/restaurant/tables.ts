import { NextResponse } from "next/server";
import { verifyAdmin } from "@trinetra/core/auth";
import { getDatabaseClient } from "@trinetra/core/database";
import { isUuid } from "../types";

export const dynamic = "force-dynamic";

type RestaurantRecord = {
  id: string;
  setup_status: "pending" | "provisioned";
};

type TableRecord = {
  id: string;
  table_number: string;
  table_token: string;
  is_active: boolean;
  created_at: string;
};

async function getRestaurantByClientId(clientId: string) {
  const supabase = getSupabaseAdmin();
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("id, setup_status")
    .eq("client_id", clientId)
    .maybeSingle<RestaurantRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return restaurant;
}

export async function GET(request: Request) {
  try {
    await verifyAdmin();

    const url = new URL(request.url);
    const clientId = (url.searchParams.get("client_id") || "").trim();

    if (!isUuid(clientId)) {
      return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
    }

    const restaurant = await getRestaurantByClientId(clientId);
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: tables, error } = await supabase
      .from("restaurant_tables")
      .select("id, table_number, table_token, is_active, created_at")
      .eq("restaurant_id", restaurant.id)
      .order("table_number", { ascending: true })
      .returns<TableRecord[]>();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      setup_status: restaurant.setup_status,
      tables: tables ?? [],
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : message.includes("not found")
          ? 404
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdmin();

    const body = await request.json();
    const clientId =
      typeof body?.client_id === "string" ? body.client_id.trim() : "";
    const requestedCount = Number(body?.table_count);
    const requestedTableNumbers = Array.isArray(body?.table_numbers)
      ? (body.table_numbers as unknown[])
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      : [];

    if (!isUuid(clientId)) {
      return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
    }

    if (
      requestedTableNumbers.length === 0 &&
      (!Number.isInteger(requestedCount) ||
        requestedCount < 1 ||
        requestedCount > 500)
    ) {
      return NextResponse.json(
        {
          error:
            "Provide either table_numbers or table_count between 1 and 500",
        },
        { status: 400 },
      );
    }

    const restaurant = await getRestaurantByClientId(clientId);
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existingTables, error: existingTablesError } = await supabase
      .from("restaurant_tables")
      .select("table_number")
      .eq("restaurant_id", restaurant.id);

    if (existingTablesError) {
      throw new Error(existingTablesError.message);
    }

    const existingSet = new Set(
      (existingTables ?? []).map((table) => String(table.table_number)),
    );

    let tableNumbersToCreate: string[] = [];

    if (requestedTableNumbers.length > 0) {
      const uniqueRequested = Array.from(new Set(requestedTableNumbers));
      const duplicates = uniqueRequested.filter((tableNumber) =>
        existingSet.has(tableNumber),
      );

      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            error: `Duplicate table numbers already exist: ${duplicates.join(", ")}`,
          },
          { status: 409 },
        );
      }

      tableNumbersToCreate = uniqueRequested;
    } else {
      let next = 1;
      while (tableNumbersToCreate.length < requestedCount) {
        const candidate = String(next);
        if (!existingSet.has(candidate)) {
          tableNumbersToCreate.push(candidate);
          existingSet.add(candidate);
        }
        next += 1;
      }
    }

    const { data: createdTables, error: insertError } = await supabase
      .from("restaurant_tables")
      .insert(
        tableNumbersToCreate.map((tableNumber) => ({
          restaurant_id: restaurant.id,
          table_number: tableNumber,
        })),
      )
      .select("id, table_number, table_token, is_active, created_at")
      .order("table_number", { ascending: true })
      .returns<TableRecord[]>();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({
      created_count: createdTables?.length ?? 0,
      tables: createdTables ?? [],
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("duplicate key")
      ? 409
      : message.includes("Unauthorized")
        ? 401
        : message.includes("Forbidden")
          ? 403
          : message.includes("not found")
            ? 404
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyAdmin();

    const body = await request.json();
    const clientId =
      typeof body?.client_id === "string" ? body.client_id.trim() : "";
    const tableId =
      typeof body?.table_id === "string" ? body.table_id.trim() : "";

    if (!isUuid(clientId)) {
      return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
    }

    if (!isUuid(tableId)) {
      return NextResponse.json({ error: "Invalid table_id" }, { status: 400 });
    }

    const restaurant = await getRestaurantByClientId(clientId);
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("restaurant_tables")
      .delete()
      .eq("id", tableId)
      .eq("restaurant_id", restaurant.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : message.includes("not found")
          ? 404
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
