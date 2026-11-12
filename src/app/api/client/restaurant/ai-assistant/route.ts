import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveRestaurantContext } from "../context";
import { callEdgeAiRoute } from "@/services/ai/edgeWorkerClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const context = await resolveRestaurantContext(request);
  if (!context.isAuthenticated || !context.tenantId || !context.restaurantId) {
    return NextResponse.json({ error: "Unauthorized restaurant session" }, { status: 401 });
  }

  let body: { question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = String(body.question || "").trim();
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [ordersRes, tablesRes, inventoryRes] = await Promise.all([
    db
      .from("restaurant_orders")
      .select("id, status, total_amount, created_at")
      .eq("restaurant_id", context.restaurantId)
      .gte("created_at", startOfDay.toISOString()),
    db
      .from("restaurant_tables")
      .select("id, status, table_number")
      .eq("restaurant_id", context.restaurantId)
      .eq("is_active", true),
    db
      .from("restaurant_inventory_items")
      .select("name, current_stock, min_stock, unit")
      .eq("restaurant_id", context.restaurantId),
  ]);

  const orders = ordersRes.data || [];
  const activeOrders = orders.filter((o) => !["completed", "cancelled", "paid"].includes(o.status || "")).length;
  const todayRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const tables = tablesRes.data || [];
  const occupiedTables = tables.filter((t) => t.status === "occupied").length;

  const lowStockItems = (inventoryRes.data || [])
    .filter((item) => Number(item.current_stock ?? 0) <= Number(item.min_stock ?? 0))
    .slice(0, 10)
    .map((item) => `${item.name} (${item.current_stock} ${item.unit || "units"})`);

  const snapshot = {
    todayOrdersCount: orders.length,
    activeOrders,
    todayRevenue,
    totalTables: tables.length,
    occupiedTables,
    lowStockCount: lowStockItems.length,
    lowStockItems,
  };

  const edgeRes = await callEdgeAiRoute("/ai/restro-copilot", { question, snapshot });
  if (edgeRes.ok && edgeRes.reply) {
    return NextResponse.json({
      success: true,
      reply: edgeRes.reply,
      snapshot,
      source: "cloudflare-workers-ai",
    });
  }

  const fallbackReply = `Today: ${snapshot.todayOrdersCount} orders (${snapshot.activeOrders} active), revenue ₹${snapshot.todayRevenue.toFixed(0)}, ${snapshot.occupiedTables}/${snapshot.totalTables} tables occupied, and ${snapshot.lowStockCount} low-stock items${lowStockItems.length ? ` (${lowStockItems.slice(0, 3).join(", ")})` : ""}.`;
  return NextResponse.json({
    success: true,
    reply: fallbackReply,
    snapshot,
    source: "deterministic-fallback",
  });
}
