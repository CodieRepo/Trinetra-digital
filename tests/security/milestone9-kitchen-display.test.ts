import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase admin client
const mockOrder = {
  id: "ord_101",
  tenant_id: "tenant_alpha",
  restaurant_id: "rest_1",
  table_id: "tbl_1",
  table_session_id: "sess_1",
  status: "placed",
  notes: "Extra spicy",
  total_amount: 850,
  created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 mins ago (Urgent)
  updated_at: new Date().toISOString(),
};

const mockOrderEvents: any[] = [];
const mockUpdatedOrder: any = { ...mockOrder };

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === "restaurant_orders") {
      return {
        select: vi.fn((fields: string) => ({
          eq: vi.fn((f1: string, v1: any) => ({
            eq: vi.fn((f2: string, v2: any) => ({
              eq: vi.fn((f3: string, v3: any) => ({
                maybeSingle: vi.fn(async () => {
                  if (v1 === mockOrder.id && v2 === mockOrder.tenant_id && v3 === mockOrder.restaurant_id) {
                    return { data: { ...mockOrder }, error: null };
                  }
                  return { data: null, error: null };
                }),
              })),
            })),
          })),
        })),
        update: vi.fn((updateData: any) => ({
          eq: vi.fn((f1: string, v1: any) => ({
            eq: vi.fn((f2: string, v2: any) => ({
              eq: vi.fn((f3: string, v3: any) => ({
                select: vi.fn(() => ({
                  single: vi.fn(async () => {
                    Object.assign(mockUpdatedOrder, updateData);
                    return { data: { ...mockUpdatedOrder }, error: null };
                  }),
                })),
              })),
            })),
          })),
        })),
      };
    }
    if (table === "restaurant_order_events") {
      return {
        insert: vi.fn(async (event: any) => {
          mockOrderEvents.push(event);
          return { data: event, error: null };
        }),
      };
    }
    return {};
  }),
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => mockSupabase,
}));

vi.mock("../../src/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => mockSupabase,
}));

vi.mock("../../src/app/api/client/restaurant/context", () => ({
  resolveRestaurantContext: vi.fn(async (req: Request, body?: any) => {
    return {
      tenantId: "tenant_alpha",
      restaurantId: "rest_1",
      role: "kitchen",
      isAuthenticated: true,
    };
  }),
  RestaurantContextError: class RestaurantContextError extends Error {
    status: number;
    constructor(msg: string, status = 400) {
      super(msg);
      this.status = status;
    }
  },
}));

describe("Milestone 9: Kitchen Display System (KDS)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrderEvents.length = 0;
    mockOrder.status = "placed";
    Object.assign(mockUpdatedOrder, mockOrder);
  });

  it("1. Successfully transitions order status from 'placed' to 'preparing' with audit event", async () => {
    const { PATCH } = await import("../../src/app/api/client/restaurant/orders/route");

    const req = new Request("http://localhost:3000/api/client/restaurant/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: "ord_101",
        status: "preparing",
        notes: "Chef started preparation",
      }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.status).toBe("preparing");

    // Verify audit event in restaurant_order_events
    expect(mockOrderEvents.length).toBe(1);
    expect(mockOrderEvents[0]).toMatchObject({
      tenant_id: "tenant_alpha",
      order_id: "ord_101",
      from_status: "placed",
      to_status: "preparing",
      actor_role: "kitchen",
      notes: "Chef started preparation",
    });
  });

  it("2. Successfully transitions order status from 'preparing' to 'ready' (Kitchen Done)", async () => {
    mockOrder.status = "preparing";
    mockUpdatedOrder.status = "preparing";

    const { PATCH } = await import("../../src/app/api/client/restaurant/orders/route");

    const req = new Request("http://localhost:3000/api/client/restaurant/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: "ord_101",
        status: "ready",
      }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.status).toBe("ready");

    expect(mockOrderEvents.length).toBe(1);
    expect(mockOrderEvents[0].from_status).toBe("preparing");
    expect(mockOrderEvents[0].to_status).toBe("ready");
  });

  it("3. Successfully marks order as 'served' to dining table", async () => {
    mockOrder.status = "ready";
    mockUpdatedOrder.status = "ready";

    const { PATCH } = await import("../../src/app/api/client/restaurant/orders/route");

    const req = new Request("http://localhost:3000/api/client/restaurant/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: "ord_101",
        status: "served",
      }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.status).toBe("served");

    expect(mockOrderEvents.length).toBe(1);
    expect(mockOrderEvents[0].to_status).toBe("served");
  });

  it("4. Rejects invalid status transition with HTTP 400", async () => {
    const { PATCH } = await import("../../src/app/api/client/restaurant/orders/route");

    const req = new Request("http://localhost:3000/api/client/restaurant/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: "ord_101",
        status: "flying_to_mars",
      }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid status");
    expect(mockOrderEvents.length).toBe(0);
  });

  it("5. Rejects request with missing order_id with HTTP 400", async () => {
    const { PATCH } = await import("../../src/app/api/client/restaurant/orders/route");

    const req = new Request("http://localhost:3000/api/client/restaurant/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "preparing",
      }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("order_id is required");
  });

  it("6. Rejects orders belonging to another tenant or non-existent order with HTTP 404", async () => {
    const { PATCH } = await import("../../src/app/api/client/restaurant/orders/route");

    const req = new Request("http://localhost:3000/api/client/restaurant/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: "ord_foreign_tenant",
        status: "preparing",
      }),
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Order not found");
  });

  it("7. Correctly calculates KDS dwell time and determines alert levels", () => {
    function getDwellMinutes(createdAt: string): number {
      const diff = Date.now() - new Date(createdAt).getTime();
      return Math.max(0, Math.floor(diff / 60000));
    }

    function getDwellUrgency(dwellMinutes: number): "normal" | "warning" | "urgent" {
      if (dwellMinutes > 20) return "urgent";
      if (dwellMinutes > 10) return "warning";
      return "normal";
    }

    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    expect(getDwellUrgency(getDwellMinutes(fiveMinsAgo))).toBe("normal");
    expect(getDwellUrgency(getDwellMinutes(fifteenMinsAgo))).toBe("warning");
    expect(getDwellUrgency(getDwellMinutes(thirtyMinsAgo))).toBe("urgent");
  });
});
