import { describe, it, expect, vi, beforeEach } from "vitest";

function createChain(resolvedData: any = null) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    not: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: resolvedData, error: null })),
    single: vi.fn(async () => ({ data: resolvedData, error: null })),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    then: (resolve: any) => Promise.resolve({ data: resolvedData, error: null }).then(resolve),
  };
  return chain;
}

const mockDb: any = {
  from: vi.fn(() => createChain(null)),
  auth: {
    getUser: vi.fn(),
  },
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => mockDb,
}));

vi.mock("../../src/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => mockDb,
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

let mockContextAuth = false;
let mockContextRole = "owner";

vi.mock("@/app/api/client/restaurant/context", () => ({
  resolveRestaurantContext: vi.fn(async () => ({
    tenantId: "tenant-uuid-1",
    restaurantId: "restaurant-uuid-1",
    role: mockContextRole,
    isAuthenticated: mockContextAuth,
  })),
  RestaurantContextError: class RestaurantContextError extends Error {
    status: number;
    constructor(msg: string, status = 400) {
      super(msg);
      this.status = status;
    }
  },
}));

vi.mock("../../src/app/api/client/restaurant/context", () => ({
  resolveRestaurantContext: vi.fn(async () => ({
    tenantId: "tenant-uuid-1",
    restaurantId: "restaurant-uuid-1",
    role: mockContextRole,
    isAuthenticated: mockContextAuth,
  })),
  RestaurantContextError: class RestaurantContextError extends Error {
    status: number;
    constructor(msg: string, status = 400) {
      super(msg);
      this.status = status;
    }
  },
}));

let mockCrmAuthResult: any = {
  isAuthorized: false,
  error: "Unauthorized: Authentication required",
  statusCode: 401,
};

vi.mock("@/lib/auth/crm-auth", () => ({
  verifyAuthenticatedCrmUser: vi.fn(async () => mockCrmAuthResult),
}));

vi.mock("../../src/lib/auth/crm-auth", () => ({
  verifyAuthenticatedCrmUser: vi.fn(async () => mockCrmAuthResult),
}));

describe("Phase 4 & 5 Hardening: Restaurant Workflows & CRM Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextAuth = false;
    mockContextRole = "owner";
    mockCrmAuthResult = {
      isAuthorized: false,
      error: "Unauthorized: Authentication required",
      statusCode: 401,
    };
    mockDb.from.mockImplementation(() => createChain(null));
  });

  describe("1. CRM Provider Settings Authorization (/api/v1/settings/providers)", () => {
    it("rejects unauthenticated GET /api/v1/settings/providers with 401", async () => {
      mockCrmAuthResult = {
        isAuthorized: false,
        error: "Unauthorized: Authentication required",
        statusCode: 401,
      };

      const { GET } = await import("@/app/api/v1/settings/providers/route");
      const req = new Request("http://localhost:3000/api/v1/settings/providers", {
        method: "GET",
      });

      const res = await GET(req as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Authentication required");
    });

    it("rejects non-admin role with 403 when updating provider settings", async () => {
      mockCrmAuthResult = {
        isAuthorized: true,
        userId: "viewer-123",
        tenantId: "tenant-crm-1",
        role: "viewer",
      };

      const { POST } = await import("@/app/api/v1/settings/providers/route");
      const req = new Request("http://localhost:3000/api/v1/settings/providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-viewer-token",
        },
        body: JSON.stringify({
          provider_key: "whatsapp_bhash",
          config_json: { api_key: "tampered" },
        }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Forbidden");
    });
  });

  describe("2. Restaurant Sessions Security & Lifecycle", () => {
    it("rejects unauthenticated session closure with 401 (/api/client/restaurant/sessions/close)", async () => {
      mockContextAuth = false;

      const { POST } = await import("@/app/api/client/restaurant/sessions/close/route");
      const req = new Request("http://localhost:3000/api/client/restaurant/sessions/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: "sess-99" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("prevents waiter role from undoing paid bills (/api/client/restaurant/sessions/payment)", async () => {
      mockContextAuth = true;
      mockContextRole = "waiter";

      // Authenticated user
      mockDb.auth.getUser.mockResolvedValue({
        data: { user: { id: "waiter-user-id" } },
      });

      mockDb.from.mockImplementation((table: string) => {
        if (table === "users_roles") {
          return createChain({ role: "waiter" });
        }
        if (table === "profiles") {
          return createChain({ role: "waiter" });
        }
        return createChain(null);
      });

      const { POST } = await import("@/app/api/client/restaurant/sessions/payment/route");
      const req = new Request("http://localhost:3000/api/client/restaurant/sessions/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer waiter-token",
        },
        body: JSON.stringify({
          session_id: "sess-paid-123",
          action: "undo_paid",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("authorized");
    });
  });

  describe("3. Lead Ingestion Tenant Isolation (leadIngestionService)", () => {
    it("strictly isolates lead creation to tenant_id and does not cross-link to other tenants", async () => {
      const { leadIngestionService } = await import("@/services/leadIngestionService");

      mockDb.from.mockImplementation((table: string) => {
        if (table === "leads") {
          return createChain({
            id: "lead-tenant-b-1",
            tenant_id: "tenant-b",
            phone: "919999988888",
            name: "Tenant B Customer",
            status: "new",
          });
        }
        if (table === "contacts") {
          return createChain({ id: "contact-b-1" });
        }
        if (table === "conversations") {
          return createChain({ id: "conv-b-1", tenant_id: "tenant-b" });
        }
        if (table === "messages") {
          return createChain({ id: "msg-b-1", tenant_id: "tenant-b" });
        }
        if (table === "lead_activities") {
          return createChain({ id: "time-b-1" });
        }
        return createChain(null);
      });

      const result = await leadIngestionService.processInboundMessage({
        tenant_id: "tenant-b",
        phone: "+91 99999 88888",
        message: "Hello from restaurant B customer",
      });

      expect(result.lead.id).toBe("lead-tenant-b-1");
      expect(result.lead.tenant_id).toBe("tenant-b");
    });
  });
});
