import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext } from "../context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const statusFilter = searchParams.get("status") || "all"; // 'all' | 'closed' | 'active'
    const searchQuery = searchParams.get("search")?.toLowerCase().trim() || "";

    const db = getSupabaseAdmin();
    const { tenantId, restaurantId } = await resolveRestaurantContext(request);
    if (!restaurantId) return NextResponse.json({ sessions: [], metrics: {} });

    let query = db
      .from("restaurant_table_sessions")
      .select("id, table_id, status, opened_at, paid_at, customer_name, customer_phone, payment_status, session_token")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .order("opened_at", { ascending: false })
      .limit(limit);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: sessions, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const enriched = await Promise.all(
      (sessions || []).map(async (session) => {
        let table = null;
        if (session.table_id) {
          const { data: tableData } = await db
            .from("restaurant_tables")
            .select("id, table_number")
            .eq("id", session.table_id)
            .eq("tenant_id", tenantId)
            .maybeSingle();
          table = tableData || null;
        }

        const { data: orders } = await db
          .from("restaurant_orders")
          .select("id, status, total_amount, created_at")
          .eq("table_session_id", session.id)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true });

        const enrichedOrders = await Promise.all(
          (orders || []).map(async (order) => {
            const { data: items } = await db
              .from("restaurant_order_items")
              .select("id, name, quantity, price, notes")
              .eq("order_id", order.id)
              .eq("tenant_id", tenantId);
            return { ...order, items: items || [] };
          })
        );

        const { data: bill } = await db
          .from("restaurant_bills")
          .select("*")
          .eq("session_id", session.id)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        const orderCount = enrichedOrders.length;
        const sessionTotal = enrichedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const paymentMethod = (session as any).payment_method || bill?.payment_method || "CASH";
        const tipAmount = Number((session as any).tip_amount || bill?.tip_amount || 0);

        return {
          ...session,
          payment_method: paymentMethod,
          tip_amount: tipAmount,
          customer_utr: (session as any).customer_utr || null,
          table: table || null,
          orders: enrichedOrders,
          order_count: orderCount,
          session_total: sessionTotal,
          bill: bill || null
        };
      })
    );

    // Apply search filtering in memory if query provided
    let filteredSessions = enriched;
    if (searchQuery) {
      filteredSessions = enriched.filter((s) => {
        const custName = (s.customer_name || "").toLowerCase();
        const custPhone = (s.customer_phone || "").toLowerCase();
        const tableNo = (s.table?.table_number || "").toLowerCase();
        const utr = (s.customer_utr || "").toLowerCase();
        const sessionId = (s.id || "").toLowerCase();
        return (
          custName.includes(searchQuery) ||
          custPhone.includes(searchQuery) ||
          tableNo.includes(searchQuery) ||
          utr.includes(searchQuery) ||
          sessionId.includes(searchQuery)
        );
      });
    }

    // Revenue metrics calculation
    const paidSessions = enriched.filter((s) => s.payment_status === "paid");
    const totalRevenue = paidSessions.reduce((acc, s) => acc + (s.bill?.grand_total || s.session_total || 0), 0);
    const totalCash = paidSessions.filter((s) => (s.payment_method || s.bill?.payment_method || "").toLowerCase() === "cash").reduce((acc, s) => acc + (s.bill?.grand_total || s.session_total || 0), 0);
    const totalUPI = paidSessions.filter((s) => (s.payment_method || s.bill?.payment_method || "").toLowerCase() === "upi").reduce((acc, s) => acc + (s.bill?.grand_total || s.session_total || 0), 0);
    const totalCard = paidSessions.filter((s) => (s.payment_method || s.bill?.payment_method || "").toLowerCase() === "card").reduce((acc, s) => acc + (s.bill?.grand_total || s.session_total || 0), 0);
    const totalTips = paidSessions.reduce((acc, s) => acc + (Number(s.tip_amount) || Number(s.bill?.tip_amount) || 0), 0);

    return NextResponse.json({
      sessions: filteredSessions,
      metrics: {
        totalSessions: enriched.length,
        closedSessionsCount: enriched.filter((s) => s.status === "closed").length,
        totalRevenue,
        totalCash,
        totalUPI,
        totalCard,
        totalTips,
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
