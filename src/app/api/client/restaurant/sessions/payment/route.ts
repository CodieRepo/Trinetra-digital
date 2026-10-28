import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { resolveRestaurantContext, RestaurantContextError } from "../../context";
import {
  calculateBillBreakdown,
  resolveRestaurantTaxConfig,
} from "@/lib/services/billing-calculator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request, body);
    const { session_id, action, discount_type, discount_value, discount_reason, tax_rate, service_charge_rate, payment_method, tip_amount } = body;

    if (!session_id || !action) {
      return NextResponse.json({ error: "session_id and action required" }, { status: 400 });
    }

    // 1. Resolve User and Role for Audit (supports both Supabase Auth & Staff Terminal JWT)
    let userId: string | null = null;
    let authUserId: string | null = null;
    let role: string = "owner";

    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      try {
        const { verifyStaffJwt } = await import("@/lib/crypto/auth-tokens");
        const jwtPayload = verifyStaffJwt(token);
        if (jwtPayload?.staff_id) {
          userId = jwtPayload.staff_id;
          role = jwtPayload.role;
        }
      } catch {}

      if (!userId) {
        try {
          const { data: { user: tokenUser } } = await db.auth.getUser(token);
          if (tokenUser) {
            userId = tokenUser.id;
            authUserId = tokenUser.id;
          }
        } catch {}
      }
    }

    if (!userId) {
      try {
        const supabase = await createServerClient();
        const { data: { user: cookieUser } } = await supabase.auth.getUser();
        if (cookieUser) {
          userId = cookieUser.id;
          authUserId = cookieUser.id;
        }
      } catch {}
    }

    if (!userId) {
      return NextResponse.json({ error: "Authentication credentials required for billing actions." }, { status: 401 });
    }

    // Lookup user role if not already determined from signed staff JWT
    if (role === "owner") {
      const { data: roleData } = await db
        .from("users_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (roleData?.role) {
        role = roleData.role;
      } else {
        const { data: profile } = await db
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.role) {
          role = profile.role === "super_admin" || profile.role === "client_admin" ? "owner" : profile.role;
        }
      }
    }

    if (action === "mark_paid") {
      // 2. Fetch all orders for this table session to compute subtotal
      const { data: orders, error: orderErr } = await db
        .from("restaurant_orders")
        .select("total_amount")
        .eq("table_session_id", session_id)
        .eq("tenant_id", tenantId);

      if (orderErr) {
        return NextResponse.json({ error: orderErr.message }, { status: 500 });
      }

      const subtotal = (orders || []).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      // 3. Role-Based Discount Validation
      const type = discount_type || "none";
      const value = Number(discount_value) || 0;

      if (type === "percentage") {
        if (role === "waiter" && value > 5) {
          return NextResponse.json({ error: "Waiters are restricted to a maximum discount of 5%." }, { status: 403 });
        }
        if (role === "manager" && value > 20) {
          return NextResponse.json({ error: "Managers are restricted to a maximum discount of 20%." }, { status: 403 });
        }
      } else if (type === "flat") {
        if (role === "waiter" && value > 0) {
          return NextResponse.json({ error: "Waiters are not authorized to apply flat discounts." }, { status: 403 });
        }
        if (role === "manager" && value > (subtotal * 0.20)) {
          return NextResponse.json({ error: "Managers are restricted to a maximum discount of 20% of subtotal." }, { status: 403 });
        }
      }

      // 4. Resolve tax config if not explicitly provided in request
      const configuredTax = await resolveRestaurantTaxConfig(restaurantId, tenantId);
      const effectiveTaxRate = tax_rate !== undefined && tax_rate !== null && !isNaN(Number(tax_rate))
        ? Number(tax_rate)
        : configuredTax.taxRate;
      const effectiveServiceRate = service_charge_rate !== undefined && service_charge_rate !== null && !isNaN(Number(service_charge_rate))
        ? Number(service_charge_rate)
        : configuredTax.serviceChargeRate;

      // 5. Unified billing calculation
      const billMath = calculateBillBreakdown({
        subtotal,
        discountType: type,
        discountValue: value,
        discountReason: discount_reason,
        taxRate: effectiveTaxRate,
        serviceChargeRate: effectiveServiceRate,
      });

      const finalPaymentMethod = payment_method || "cash";
      const finalTipAmount = Number(tip_amount) || 0;

      // 6. Insert Bill Record (upsert style on session unique key)
      const billPayload: any = {
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        session_id,
        subtotal: billMath.subtotal,
        discount_type: billMath.discountType,
        discount_value: billMath.discountValue,
        discount_amount: billMath.discountAmount,
        discount_reason: billMath.discountReason,
        tax_amount: billMath.taxAmount,
        service_charge: billMath.serviceCharge,
        round_off: billMath.roundOff,
        grand_total: billMath.grandTotal,
        created_by: authUserId || null,
      };

      // Try inserting with payment_method and tip_amount
      const { error: billErr } = await db
        .from("restaurant_bills")
        .upsert({
          ...billPayload,
          payment_method: finalPaymentMethod,
          tip_amount: finalTipAmount,
        }, { onConflict: "session_id" });

      if (billErr) {
        // Fallback without extended columns if table schema doesn't have them yet
        const { error: fallbackErr } = await db
          .from("restaurant_bills")
          .upsert(billPayload, { onConflict: "session_id" });

        if (fallbackErr) {
          return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
        }
      }

      // 6. Log Audit Trail if discount applied
      if (billMath.discountAmount > 0 && authUserId) {
        const { error: auditErr } = await db
          .from("restaurant_discount_audit")
          .insert({
            tenant_id: tenantId,
            restaurant_id: restaurantId,
            session_id,
            actor_id: authUserId,
            actor_role: role,
            before_amount: billMath.subtotal,
            after_amount: billMath.grandTotal,
            discount_type: billMath.discountType,
            discount_value: billMath.discountValue,
            discount_amount: billMath.discountAmount,
            reason: discount_reason || "None specified"
          });

        if (auditErr) {
          console.error("⚠️ Discount Audit insert failed:", auditErr.message);
        }
      }

      // 7. Update Session status
      const { error: sessionErr } = await db
        .from("restaurant_table_sessions")
        .update({ payment_status: "paid", paid_at: new Date().toISOString() })
        .eq("id", session_id)
        .eq("tenant_id", tenantId);

      if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "undo_paid") {
      if (role === "waiter") {
        return NextResponse.json({ error: "Only managers or owners are authorized to reopen or void settled bills." }, { status: 403 });
      }

      // Record audit before reversing
      try {
        await db
          .from("restaurant_discount_audit")
          .insert({
            tenant_id: tenantId,
            restaurant_id: restaurantId,
            session_id,
            actor_id: userId,
            actor_role: role,
            reason: "Payment reversed / session reopened by authorized staff"
          });
      } catch (auditErr) {
        console.warn("[PaymentApi] Void audit trail insert notice:", auditErr);
      }

      // Delete associated bill record to clear accounting reports
      await db
        .from("restaurant_bills")
        .delete()
        .eq("session_id", session_id)
        .eq("tenant_id", tenantId);

      const { error } = await db
        .from("restaurant_table_sessions")
        .update({ payment_status: "unpaid", paid_at: null })
        .eq("id", session_id)
        .eq("tenant_id", tenantId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof RestaurantContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
