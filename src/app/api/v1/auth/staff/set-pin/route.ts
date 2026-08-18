/**
 * Trinetra Restaurant OS — Milestone H-2B Authentication & Terminal Security
 * Route: POST /api/v1/auth/staff/set-pin
 * Description: Secure handler for setting or resetting a staff member's PIN.
 *              Enforces server-side authentication, tenant/restaurant scoping,
 *              and caller role verification (Owner or Manager only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRole, RestaurantContextError } from '@/app/api/client/restaurant/context';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Enforce caller authorization: only owner or manager can set/reset staff PINs
    const caller = await requireStaffRole(req, ['owner', 'manager'], body);

    const { staff_id, pin } = body;

    // 2. Validate input parameters
    if (!staff_id || typeof staff_id !== 'string') {
      return NextResponse.json(
        { success: false, error: { message: 'staff_id is required' } },
        { status: 400 }
      );
    }

    if (!pin || typeof pin !== 'string' || !/^\d{4,6}$/.test(pin.trim())) {
      return NextResponse.json(
        { success: false, error: { message: 'PIN must be between 4 and 6 numeric digits' } },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();

    // 3. Verify target staff member exists in caller's tenant and restaurant
    const { data: targetStaff, error: staffErr } = await db
      .from('restaurant_staff')
      .select('id, name, is_active, tenant_id, restaurant_id')
      .eq('id', staff_id)
      .eq('tenant_id', caller.tenantId)
      .eq('restaurant_id', caller.restaurantId)
      .maybeSingle();

    if (staffErr || !targetStaff) {
      return NextResponse.json(
        { success: false, error: { message: 'Staff member not found in this restaurant.' } },
        { status: 404 }
      );
    }

    if (!targetStaff.is_active) {
      return NextResponse.json(
        { success: false, error: { message: 'Cannot set PIN for a deactivated staff member.' } },
        { status: 400 }
      );
    }

    // 4. Call canonical Security Definer RPC: set_staff_pin_rpc
    const { error: rpcErr } = await db.rpc('set_staff_pin_rpc', {
      p_staff_id: targetStaff.id,
      p_restaurant_id: caller.restaurantId,
      p_raw_pin: pin.trim(),
    });

    if (rpcErr) {
      return NextResponse.json(
        { success: false, error: { message: rpcErr.message } },
        { status: 500 }
      );
    }

    // 5. Log immutable audit trail
    await db.from('auth_audit_logs').insert({
      tenant_id: caller.tenantId,
      restaurant_id: caller.restaurantId,
      actor_id: caller.userId,
      actor_role: caller.role,
      event_type: 'auth.staff.pin_updated',
      metadata: { target_staff_id: targetStaff.id, target_staff_name: targetStaff.name },
    });

    return NextResponse.json({
      success: true,
      data: {
        staff_id: targetStaff.id,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json(
        { success: false, error: { message: err.message } },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
}
