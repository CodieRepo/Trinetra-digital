import { NextResponse } from "next/server";
import { isUuid, RESTAURANT_STAFF_ROLES } from "../types";
import { getApiErrorStatus, getErrorMessage, requireRestaurantClientContext } from "../../services/server";

export const dynamic = "force-dynamic";

type StaffRecord = {
  id: string;
  name: string;
  role: "kitchen" | "waiter";
  access_token: string;
  is_active: boolean;
  created_at: string;
};

export async function GET() {
  try {
    const context = await requireRestaurantClientContext();
    const { data: staff, error } = await getDatabaseClient()
      .from("restaurant_staff")
      .select("id, name, role, access_token, is_active, created_at")
      .eq("restaurant_id", context.restaurant.id)
      .order("created_at", { ascending: false })
      .returns<StaffRecord[]>();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ restaurant_id: context.restaurant.id, staff: staff ?? [] });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireRestaurantClientContext();
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const role = typeof body?.role === "string" ? body.role.trim() : "";

    if (!name || !RESTAURANT_STAFF_ROLES.includes(role as "kitchen" | "waiter")) {
      return NextResponse.json({ error: "Invalid staff payload" }, { status: 400 });
    }

    const { data: staffMember, error } = await getDatabaseClient()
      .from("restaurant_staff")
      .insert({
        restaurant_id: context.restaurant.id,
        name,
        role,
      })
      .select("id, name, role, access_token, is_active, created_at")
      .single<StaffRecord>();

    if (error || !staffMember) {
      throw new Error(error?.message || "Failed to create staff member");
    }

    return NextResponse.json({ staff: staffMember, restaurant_id: context.restaurant.id });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: getApiErrorStatus(message) });
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireRestaurantClientContext();
    const body = await request.json();
    const staffId = typeof body?.staff_id === "string" ? body.staff_id.trim() : "";

    if (!isUuid(staffId)) {
      return NextResponse.json({ error: "Invalid staff_id" }, { status: 400 });
    }

    const { error } = await getDatabaseClient()
      .from("restaurant_staff")
      .delete()
      .eq("id", staffId)
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