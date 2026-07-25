import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@trinetra/core/auth";
import { getDatabaseClient } from "@trinetra/core/database";
import { isUuid } from "../types";

export const dynamic = "force-dynamic";

type RestaurantRecord = {
  id: string;
};

type SetupStatus = "pending" | "provisioned";

export async function PATCH(request: Request) {
  try {
    await verifyAdmin();

    const body = await request.json();
    const clientId =
      typeof body?.client_id === "string" ? body.client_id.trim() : "";
    const setupStatus =
      body?.setup_status === "pending" || body?.setup_status === "provisioned"
        ? (body.setup_status as SetupStatus)
        : null;

    if (!isUuid(clientId)) {
      return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
    }

    if (!setupStatus) {
      return NextResponse.json(
        { error: "setup_status must be 'pending' or 'provisioned'" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("client_id", clientId)
      .maybeSingle<RestaurantRecord>();

    if (restaurantError) {
      throw new Error(restaurantError.message);
    }

    // Locked rule: cannot provision without a restaurant record.
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    if (setupStatus === "provisioned") {
      const { count: tableCount, error: tableCountError } = await supabase
        .from("restaurant_tables")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true);

      if (tableCountError) {
        throw new Error(tableCountError.message);
      }

      // Locked rule: cannot provision unless at least one active table exists.
      if (!tableCount || tableCount < 1) {
        return NextResponse.json(
          {
            error:
              "At least one active table is required before marking as provisioned",
          },
          { status: 400 },
        );
      }
    }

    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ setup_status: setupStatus })
      .eq("id", restaurant.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath("/client");
    revalidatePath("/client/dashboard");
    revalidatePath("/client/dashboard/restaurant");

    return NextResponse.json({
      success: true,
      setup_status: setupStatus,
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
