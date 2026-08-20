import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get("session_token");

    const supabase = getSupabaseAdmin();

    // Fetch order details
    let orderQuery = supabase
      .from("restaurant_orders")
      .select("*")
      .eq("id", orderId);

    if (sessionToken) {
      orderQuery = orderQuery.eq("session_token", sessionToken);
    }

    const { data: order, error: orderErr } = await orderQuery.maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch restaurant info
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, name, address, currency")
      .eq("id", order.restaurant_id)
      .maybeSingle();

    // Fetch table info
    let table = null;
    if (order.table_id) {
      const { data: tableData } = await supabase
        .from("restaurant_tables")
        .select("id, table_number, table_token, floor_id")
        .eq("id", order.table_id)
        .maybeSingle();

      if (tableData) {
        let floorName: string | null = null;
        if (tableData.floor_id) {
          const { data: floor } = await supabase
            .from("restaurant_floors")
            .select("name")
            .eq("id", tableData.floor_id)
            .maybeSingle();
          if (floor) {
            floorName = floor.name;
          }
        }
        table = {
          ...tableData,
          floor_name: floorName || "Main Dining",
        };
      }
    }

    // Fetch order items
    const { data: items } = await supabase
      .from("restaurant_order_items")
      .select("*")
      .eq("order_id", order.id);

    // Fetch order events
    const { data: events } = await supabase
      .from("restaurant_order_events")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    const eventList = (events && events.length > 0)
      ? events
      : [
          {
            id: `evt-${order.id}`,
            from_status: null,
            to_status: order.status || "placed",
            actor_role: "customer",
            created_at: order.created_at || new Date().toISOString()
          }
        ];

    return NextResponse.json({
      order,
      restaurant,
      table,
      items: items || [],
      events: eventList,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
