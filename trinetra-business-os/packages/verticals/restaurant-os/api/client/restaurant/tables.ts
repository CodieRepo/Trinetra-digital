import { NextResponse } from "next/server";
import { isUuid } from "../types";
import {
  getApiErrorStatus,
  getErrorMessage,
  requireRestaurantClientContext,
} from "../../services/server";

export const dynamic = "force-dynamic";

type TableRecord = {
  id: string;
  table_number: string;
  table_token: string;
  is_active: boolean;
  created_at: string;
};

export async function GET() {
  try {
    const context = await requireRestaurantClientContext();
    const { data: tables, error } = await getDatabaseClient()
      .from("restaurant_tables")
      .select("id, table_number, table_token, is_active, created_at")
      .eq("restaurant_id", context.restaurant.id)
      .order("table_number", { ascending: true })
      .returns<TableRecord[]>();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ tables: tables ?? [] });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: getApiErrorStatus(message) },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Table creation is restricted to admin panel" },
    { status: 403 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Table deletion is restricted to admin panel" },
    { status: 403 },
  );
}
