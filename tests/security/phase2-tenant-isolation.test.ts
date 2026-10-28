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

vi.mock("../../src/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => mockSupabase,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}));

vi.mock("../../src/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}));

vi.mock("@/services/notificationOutboxService", () => ({
  notificationOutboxService: {
    processBatch: vi.fn().mockResolvedValue({ processed: 0, failed: 0 }),
  },
}));

vi.mock("../../src/services/notificationOutboxService", () => ({
  notificationOutboxService: {
    processBatch: vi.fn().mockResolvedValue({ processed: 0, failed: 0 }),
  },
}));

describe("Phase 2: Server-Side Authentication & Tenant Isolation Gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      range: vi.fn(() => chain),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "target-rest-uuid", tenant_id: "target-tenant-uuid" }, error: null }),
      single: vi.fn().mockResolvedValue({ data: { id: "target-rest-uuid", tenant_id: "target-tenant-uuid" }, error: null }),
    };
    mockSupabase.from.mockImplementation(() => chain);
  });

  describe("1. CRM Endpoints Authentication Gate", () => {
    it("rejects GET /api/v1/leads when caller is unauthenticated", async () => {
      const { GET: getLeadsHandler } = await import("../../src/app/api/v1/leads/route");
      const req = new Request("http://localhost:3000/api/v1/leads");

      const res = await getLeadsHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/Unauthorized|Authentication required/i);
    });

    it("rejects POST /api/v1/messages when caller is unauthenticated", async () => {
      const { POST: postMessageHandler } = await import("../../src/app/api/v1/messages/route");
      const req = new Request("http://localhost:3000/api/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "9876543210", message: "Attack message" }),
      });

      const res = await postMessageHandler(req);
      expect(res.status).toBe(401);
    });

    it("rejects GET /api/v1/tasks when caller is unauthenticated", async () => {
      const { GET: getTasksHandler } = await import("../../src/app/api/v1/tasks/route");
      const req = new Request("http://localhost:3000/api/v1/tasks");

      const res = await getTasksHandler(req);
      expect(res.status).toBe(401);
    });
  });

  describe("2. Restaurant OS Orders & KDS Authentication Gate", () => {
    it("rejects POST /api/client/restaurant/orders when caller is unauthenticated", async () => {
      const { POST: postOrderHandler } = await import("../../src/app/api/client/restaurant/orders/route");
      const req = new Request("http://localhost:3000/api/client/restaurant/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: "target-rest-uuid",
          table_id: "tbl_1",
          items: [{ item_id: "item_1", quantity: 1 }],
        }),
      });

      const res = await postOrderHandler(req);
      expect(res.status).toBe(401);
    });

    it("rejects PATCH /api/client/restaurant/orders when caller is unauthenticated", async () => {
      const { PATCH: patchOrderHandler } = await import("../../src/app/api/client/restaurant/orders/route");
      const req = new Request("http://localhost:3000/api/client/restaurant/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: "target-rest-uuid",
          order_id: "ord_1",
          status: "cancelled",
        }),
      });

      const res = await patchOrderHandler(req);
      expect(res.status).toBe(401);
    });

    it("rejects GET /api/client/restaurant/settings when caller is unauthenticated", async () => {
      const { GET: getSettingsHandler } = await import("../../src/app/api/client/restaurant/settings/route");
      const req = new Request("http://localhost:3000/api/client/restaurant/settings?restaurant_id=target-rest-uuid");

      const res = await getSettingsHandler(req);
      expect(res.status).toBe(401);
    });
  });
});
