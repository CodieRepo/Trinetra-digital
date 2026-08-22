import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  resolveRestaurantContext,
  requireStaffRole,
  RestaurantContextError,
} from "../context";
import {
  CANONICAL_STAFF_ROLES,
  encodeStaffRole,
  decodeStaffRecord,
} from "@/lib/auth/role-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request);
    if (!restaurantId || !tenantId) return NextResponse.json({ staff: [] });

    const { data: staffRows, error } = await db
      .from("restaurant_staff")
      .select("id, name, role, is_active, created_at")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Derive has_pin boolean safely without exposing pin_hash
    const staffIds = (staffRows || []).map((s) => s.id);
    let pinStaffIds = new Set<string>();
    if (staffIds.length > 0) {
      const { data: pinRows } = await db
        .from("restaurant_staff_pins")
        .select("staff_id")
        .in("staff_id", staffIds);
      if (pinRows) {
        pinStaffIds = new Set(pinRows.map((p) => p.staff_id));
      }
    }

    const staff = (staffRows || []).map((s) => {
      const decoded = decodeStaffRecord(s);
      return {
        id: decoded.id,
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        name: decoded.name,
        role: decoded.role,
        is_active: decoded.is_active,
        created_at: decoded.created_at,
        has_pin: pinStaffIds.has(decoded.id),
      };
    });

    return NextResponse.json({ staff });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();

    // Enforce role authorization: only owner and manager can create staff
    const caller = await requireStaffRole(request, ["owner", "manager"], body);

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Staff member name is required." }, { status: 400 });
    }

    const requestedRole = (body.role || "").toLowerCase().trim();
    if (!CANONICAL_STAFF_ROLES.includes(requestedRole as any)) {
      return NextResponse.json(
        {
          error: `Invalid role: '${body.role}'. Must be one of: ${CANONICAL_STAFF_ROLES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const { dbName, dbRole } = encodeStaffRole(body.name, requestedRole);

    const { data, error } = await db
      .from("restaurant_staff")
      .insert({
        tenant_id: caller.tenantId,
        restaurant_id: caller.restaurantId,
        name: dbName,
        role: dbRole,
        is_active: true,
      })
      .select("id, name, role, is_active, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const decoded = decodeStaffRecord(data);

    return NextResponse.json({
      staff: {
        ...decoded,
        has_pin: false,
      },
    });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();

    // Enforce role authorization: only owner and manager can edit or reactivate staff
    const caller = await requireStaffRole(request, ["owner", "manager"], body);

    if (!body.staff_id || typeof body.staff_id !== "string") {
      return NextResponse.json({ error: "staff_id is required." }, { status: 400 });
    }

    // Fetch existing staff to maintain name/role when only updating one field
    const { data: existingStaff, error: fetchErr } = await db
      .from("restaurant_staff")
      .select("id, name, role, is_active")
      .eq("id", body.staff_id)
      .eq("tenant_id", caller.tenantId)
      .eq("restaurant_id", caller.restaurantId)
      .maybeSingle();

    if (fetchErr || !existingStaff) {
      return NextResponse.json(
        { error: "Staff member not found in this restaurant." },
        { status: 404 }
      );
    }

    const decodedExisting = decodeStaffRecord(existingStaff);
    const updatePayload: Record<string, any> = {};

    let targetName = decodedExisting.name;
    let targetRole = decodedExisting.role;

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Staff member name cannot be empty." }, { status: 400 });
      }
      targetName = body.name.trim();
    }

    if (body.role !== undefined) {
      const role = String(body.role).toLowerCase().trim();
      if (!CANONICAL_STAFF_ROLES.includes(role as any)) {
        return NextResponse.json(
          {
            error: `Invalid role: '${body.role}'. Must be one of: ${CANONICAL_STAFF_ROLES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      targetRole = role;
    }

    const { dbName, dbRole } = encodeStaffRole(targetName, targetRole);
    updatePayload.name = dbName;
    updatePayload.role = dbRole;

    if (body.is_active !== undefined) {
      updatePayload.is_active = Boolean(body.is_active);
    }

    const { data, error } = await db
      .from("restaurant_staff")
      .update(updatePayload)
      .eq("id", body.staff_id)
      .eq("tenant_id", caller.tenantId)
      .eq("restaurant_id", caller.restaurantId)
      .select("id, name, role, is_active, created_at")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) {
      return NextResponse.json(
        { error: "Staff member not found in this restaurant." },
        { status: 404 }
      );
    }

    // Check PIN status
    const { data: pinRow } = await db
      .from("restaurant_staff_pins")
      .select("staff_id")
      .eq("staff_id", data.id)
      .maybeSingle();

    const decoded = decodeStaffRecord(data);

    return NextResponse.json({
      staff: {
        ...decoded,
        has_pin: Boolean(pinRow),
      },
    });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();

    // Enforce role authorization: only owner and manager can delete staff
    const caller = await requireStaffRole(request, ["owner", "manager"], body);

    if (!body.staff_id) {
      return NextResponse.json({ error: "staff_id is required." }, { status: 400 });
    }

    // 1. Delete associated PIN credentials so terminal access stops immediately
    await db
      .from("restaurant_staff_pins")
      .delete()
      .eq("staff_id", body.staff_id);

    // 2. Clean up any registered mobile push devices
    try {
      await db
        .from("staff_push_devices")
        .delete()
        .eq("staff_id", body.staff_id);
    } catch {}

    // 3. Permanently delete staff record from database
    const { error } = await db
      .from("restaurant_staff")
      .delete()
      .eq("id", body.staff_id)
      .eq("tenant_id", caller.tenantId)
      .eq("restaurant_id", caller.restaurantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: "Staff member permanently deleted." });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
