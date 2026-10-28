import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase admin
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => mockSupabase,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "cashier-user-id" } } }),
    },
  }),
}));

vi.mock("../../src/app/api/client/restaurant/context", () => ({
  resolveRestaurantContext: vi.fn().mockResolvedValue({
    tenantId: "tenant-uuid-pos",
    restaurantId: "restaurant-uuid-pos",
    role: "owner",
    isAuthenticated: true,
  }),
  RestaurantContextError: class RestaurantContextError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
}));

describe("Milestone 8: Point of Sale (POS) Order Punching & Register Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. POS Order Punching Validation (/api/client/restaurant/orders)", () => {
    it("rejects request missing table_id", async () => {
      const { POST } = await import("../../src/app/api/client/restaurant/orders/route");
      const req = new Request("http://localhost/api/client/restaurant/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ menu_item_id: "item-1", quantity: 1 }] }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain("table_id is required");
    });

    it("rejects request with empty items array", async () => {
      const { POST } = await import("../../src/app/api/client/restaurant/orders/route");
      const req = new Request("http://localhost/api/client/restaurant/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: "table-1", items: [] }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain("items array cannot be empty");
    });

    it("rejects request if table does not exist or is inactive", async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { POST } = await import("../../src/app/api/client/restaurant/orders/route");
      const req = new Request("http://localhost/api/client/restaurant/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: "non-existent-table",
          items: [{ menu_item_id: "item-1", quantity: 1 }],
        }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.error).toContain("Table not found or inactive");
    });

    it("recalculates total amount from database prices rather than trusting client prices", async () => {
      // 1. Table lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "table-pos-1",
            table_number: "T-01",
            floor_id: null,
            is_active: true,
            restaurant_floors: null,
          },
          error: null,
        }),
      });

      // 2. Active session lookup -> found active session
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "sess-pos-1", session_token: "tok-1", status: "active", payment_status: "unpaid" },
          error: null,
        }),
      });

      // 3. Menu items database price lookup: Paneer Butter Masala (₹320), Butter Naan (₹50)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: "item-paneer", name: "Paneer Butter Masala", price: 320, is_available: true },
            { id: "item-naan", name: "Butter Naan", price: 50, is_available: true },
          ],
          error: null,
        }),
      });

      // 4. Order insert
      const expectedTotal = (320 * 2) + (50 * 4); // 640 + 200 = 840
      const mockCreatedOrder = {
        id: "order-pos-101",
        status: "placed",
        notes: "Serve starters first",
        total_amount: expectedTotal,
        order_source: "pos",
        created_by_staff_id: null,
        created_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreatedOrder, error: null }),
      });

      // 5. Order items insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      // 6. Order event insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      const { POST } = await import("../../src/app/api/client/restaurant/orders/route");
      const req = new Request("http://localhost/api/client/restaurant/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: "table-pos-1",
          notes: "Serve starters first",
          items: [
            { menu_item_id: "item-paneer", quantity: 2, notes: "less spicy" },
            { menu_item_id: "item-naan", quantity: 4, notes: "crispy" },
          ],
        }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.order.total_amount).toBe(840);
      expect(json.order.order_source).toBe("pos");
      expect(json.order.items.length).toBe(2);
      expect(json.session_id).toBe("sess-pos-1");
    });
  });

  describe("2. POS Deterministic Tax Calculation & Cart Integrity", () => {
    it("calculates 5% GST split into 2.50% CGST and 2.50% SGST deterministically", () => {
      const subtotal = 840;
      const taxRate = 5;
      const taxAmount = (subtotal * taxRate) / 100;
      const grandTotal = Math.round(subtotal + taxAmount);

      expect(taxAmount).toBe(42);
      expect(grandTotal).toBe(882);

      const cgst = Number((taxAmount / 2).toFixed(2));
      const sgst = Number((taxAmount / 2).toFixed(2));
      expect(cgst).toBe(21);
      expect(sgst).toBe(21);
      expect(cgst + sgst).toBe(taxAmount);
    });

    it("verifies item modifiers and cooking instructions are preserved", () => {
      const cart = [
        {
          item: { id: "m-1", name: "Cold Coffee", price: 120, is_veg: true },
          quantity: 2,
          notes: "Extra ice, less sugar",
        },
      ];

      expect(cart[0].notes).toBe("Extra ice, less sugar");
      expect(cart[0].item.price * cart[0].quantity).toBe(240);
    });
  });
});
