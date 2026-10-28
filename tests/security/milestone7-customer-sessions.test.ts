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
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}));

vi.mock("../../src/app/api/client/restaurant/context", () => ({
  resolveRestaurantContext: vi.fn().mockResolvedValue({
    tenantId: "tenant-uuid-1",
    restaurantId: "restaurant-uuid-1",
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

describe("Milestone 7: Customer Sessions & Table Seating Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/client/restaurant/sessions (Start Dining Session)", () => {
    it("rejects request missing table_id", async () => {
      const { POST } = await import("../../src/app/api/client/restaurant/sessions/route");
      const req = new Request("http://localhost/api/client/restaurant/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain("table_id is required");
    });

    it("rejects request if table does not exist or is inactive", async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { POST } = await import("../../src/app/api/client/restaurant/sessions/route");
      const req = new Request("http://localhost/api/client/restaurant/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: "non-existent-table" }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.error).toContain("Table not found");
    });

    it("returns existing session if table already has an active session (prevents duplicate sessions)", async () => {
      // 1. Table lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "table-1", table_number: "T-01", is_active: true },
          error: null,
        }),
      });

      // 2. Existing active session lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "session-active-1",
            table_id: "table-1",
            customer_name: "Anita Roy",
            customer_phone: "9876543210",
            status: "active",
            opened_at: new Date().toISOString(),
          },
          error: null,
        }),
      });

      const { POST } = await import("../../src/app/api/client/restaurant/sessions/route");
      const req = new Request("http://localhost/api/client/restaurant/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: "table-1" }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.already_active).toBe(true);
      expect(json.session.id).toBe("session-active-1");
    });

    it("successfully creates a new dining session for an available table", async () => {
      // 1. Table lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "table-2", table_number: "T-02", is_active: true },
          error: null,
        }),
      });

      // 2. Existing active session lookup -> null
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // 3. Insert new session
      const mockCreatedSession = {
        id: "new-session-123",
        table_id: "table-2",
        customer_name: "Rahul Verma",
        customer_phone: "9123456789",
        status: "active",
        payment_status: "unpaid",
        opened_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreatedSession, error: null }),
      });

      const { POST } = await import("../../src/app/api/client/restaurant/sessions/route");
      const req = new Request("http://localhost/api/client/restaurant/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: "table-2",
          customer_name: "  Rahul Verma  ",
          customer_phone: "+91 91234 56789",
        }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.session.id).toBe("new-session-123");
      expect(json.session.customer_name).toBe("Rahul Verma");
    });
  });

  describe("PATCH /api/client/restaurant/sessions (Update Session / Table Transfer)", () => {
    it("rejects request missing session_id", async () => {
      const { PATCH } = await import("../../src/app/api/client/restaurant/sessions/route");
      const req = new Request("http://localhost/api/client/restaurant/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await PATCH(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain("session_id is required");
    });

    it("rejects transfer if target table is already occupied", async () => {
      // 1. Current session lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "sess-1", table_id: "table-1", status: "active" },
          error: null,
        }),
      });

      // 2. Target table lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "table-3", table_number: "T-03", is_active: true },
          error: null,
        }),
      });

      // 3. Target table occupancy check -> occupied!
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "another-active-sess" },
          error: null,
        }),
      });

      const { PATCH } = await import("../../src/app/api/client/restaurant/sessions/route");
      const req = new Request("http://localhost/api/client/restaurant/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: "sess-1",
          target_table_id: "table-3",
        }),
      });

      const res = await PATCH(req);
      const json = await res.json();
      expect(res.status).toBe(409);
      expect(json.error).toContain("already occupied");
    });

    it("successfully transfers party to an available table and updates active orders", async () => {
      // 1. Current session lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "sess-1", table_id: "table-1", status: "active" },
          error: null,
        }),
      });

      // 2. Target table lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "table-4", table_number: "T-04", is_active: true },
          error: null,
        }),
      });

      // 3. Target table occupancy check -> null (available)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // 4. Update orders table_id
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      });

      // 5. Update session
      const updatedSess = {
        id: "sess-1",
        table_id: "table-4",
        customer_name: "Pooja Shah",
        customer_phone: null,
        status: "active",
        payment_status: "unpaid",
        opened_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedSess, error: null }),
      });

      const { PATCH } = await import("../../src/app/api/client/restaurant/sessions/route");
      const req = new Request("http://localhost/api/client/restaurant/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: "sess-1",
          target_table_id: "table-4",
          customer_name: "Pooja Shah",
        }),
      });

      const res = await PATCH(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.session.table_id).toBe("table-4");
      expect(json.session.customer_name).toBe("Pooja Shah");
    });
  });

  describe("Multi-diner Table QR Session Resolution", () => {
    it("connects a guest to the table's current active session even if guest token is new", async () => {
      // Table lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "table-5", is_active: true },
          error: null,
        }),
      });

      // Session lookup by token -> null
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Active table session fallback lookup -> found active table session!
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "table-active-sess-5",
            status: "active",
            customer_name: "Table 5 Group",
            customer_phone: null,
            payment_status: "unpaid",
            opened_at: new Date().toISOString(),
          },
          error: null,
        }),
      });

      // Orders lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Bill lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { GET } = await import("../../src/app/api/r/[tableToken]/session/route");
      const req = new Request("http://localhost/api/r/token-table-5/session?session_token=random-new-diner");
      const res = await GET(req, { params: Promise.resolve({ tableToken: "token-table-5" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.session).not.toBeNull();
      expect(json.session.id).toBe("table-active-sess-5");
      expect(json.session.customer_name).toBe("Table 5 Group");
    });
  });
});
