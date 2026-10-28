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

vi.mock("@/services/leadIngestionService", () => ({
  leadIngestionService: {
    processInboundMessage: vi.fn().mockResolvedValue({ lead: { id: "lead-1" }, isNewLead: false }),
  },
}));

vi.mock("../../src/services/leadIngestionService", () => ({
  leadIngestionService: {
    processInboundMessage: vi.fn().mockResolvedValue({ lead: { id: "lead-1" }, isNewLead: false }),
  },
}));

vi.mock("@/services/leadClassifierService", () => ({
  classifyInboundMessage: vi.fn().mockReturnValue({ intent: "general", score: 50 }),
}));

vi.mock("../../src/services/leadClassifierService", () => ({
  classifyInboundMessage: vi.fn().mockReturnValue({ intent: "general", score: 50 }),
}));

vi.mock("@/app/api/client/restaurant/context", () => ({
  resolveRestaurantContext: vi.fn().mockResolvedValue({
    tenantId: "tenant-111",
    restaurantId: "rest-222",
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

vi.mock("../../src/app/api/client/restaurant/context", () => ({
  resolveRestaurantContext: vi.fn().mockResolvedValue({
    tenantId: "tenant-111",
    restaurantId: "rest-222",
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

describe("Phase 1: Critical Security Gates & Credential Hardening", () => {
  const originalScraperSecret = process.env.SCRAPER_SECRET;
  const originalJobSecret = process.env.JOB_SECRET_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SCRAPER_SECRET = "production_scraper_secret_2026";
    process.env.JOB_SECRET_KEY = "production_job_secret_2026";
  });

  describe("1. Bhash Sync Cron Secret Enforcement", () => {
    it("rejects POST /api/v1/bhash/sync when secret is completely omitted from body", async () => {
      const { POST: bhashSyncHandler } = await import("../../src/app/api/v1/bhash/sync/route");
      const req = new Request("http://localhost:3000/api/v1/bhash/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: [] }),
      });

      const res = await bhashSyncHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/unauthorized/i);
    });

    it("rejects POST /api/v1/bhash/sync when wrong secret is provided", async () => {
      const { POST: bhashSyncHandler } = await import("../../src/app/api/v1/bhash/sync/route");
      const req = new Request("http://localhost:3000/api/v1/bhash/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "wrong_secret_attempt", leads: [] }),
      });

      const res = await bhashSyncHandler(req);
      expect(res.status).toBe(401);
    });

    it("accepts POST /api/v1/bhash/sync when correct secret is provided in body", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          })),
        })),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }));

      const { POST: bhashSyncHandler } = await import("../../src/app/api/v1/bhash/sync/route");
      const req = new Request("http://localhost:3000/api/v1/bhash/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "production_scraper_secret_2026", leads: [{ phone: "9876543210", message: "Hi" }] }),
      });

      const res = await bhashSyncHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe("2. Background Job Worker Secret Gate", () => {
    it("rejects /api/jobs/run when secret header and query are missing", async () => {
      const { POST: runJobHandler } = await import("../../src/app/api/jobs/run/route");
      const req = new Request("http://localhost:3000/api/jobs/run", {
        method: "POST",
      });

      const res = await runJobHandler(req);
      expect(res.status).toBe(401);
    });

    it("rejects /api/jobs/run when attacker tries fallback secret outbox_worker_secret_123", async () => {
      const { POST: runJobHandler } = await import("../../src/app/api/jobs/run/route");
      const req = new Request("http://localhost:3000/api/jobs/run?secret=outbox_worker_secret_123", {
        method: "POST",
      });

      const res = await runJobHandler(req);
      expect(res.status).toBe(401);
    });

    it("accepts /api/jobs/run with valid Bearer token", async () => {
      const { POST: runJobHandler } = await import("../../src/app/api/jobs/run/route");
      const req = new Request("http://localhost:3000/api/jobs/run", {
        method: "POST",
        headers: { Authorization: "Bearer production_job_secret_2026" },
      });

      const res = await runJobHandler(req);
      expect(res.status).toBe(200);
    });
  });

  describe("3. Super-Admin Privilege Escalation Prevention", () => {
    it("rejects user who sets user_metadata.role = 'super_admin' when DB profile has no admin role", async () => {
      const { verifySuperAdminAccess } = await import("../../src/lib/auth/admin-guard");

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: "attacker-user-id",
            email: "attacker@gmail.com",
            user_metadata: { role: "super_admin" }, // Client-supplied metadata!
          },
        },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "users_roles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [{ role: "waiter" }] })),
            })),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: { role: "waiter" } })),
              })),
            })),
          };
        }
        return { select: vi.fn() };
      });

      const fakeJwt = "header.payload.signature";
      const req = new Request("http://localhost:3000/api/v1/admin/delete-restaurant", {
        headers: { Authorization: `Bearer ${fakeJwt}` },
      });

      const authResult = await verifySuperAdminAccess(req);
      expect(authResult.isAuthorized).toBe(false);
      expect(authResult.statusCode).toBe(403);
    });
  });

  describe("4. Fail-Closed Role Resolution (No Default to 'owner')", () => {
    it("throws 403 instead of defaulting to 'owner' when authenticated user has no role in DB", async () => {
      const { resolveCallerIdentity } = await import("../../src/lib/auth/role-guard");

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: "user-without-role",
            email: "random@user.com",
            user_metadata: {},
          },
        },
      });

      const chainMock: any = {
        select: vi.fn(() => chainMock),
        eq: vi.fn(() => chainMock),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
      };
      mockSupabase.from.mockImplementation(() => chainMock);

      const fakeJwt = "header.payload.signature";
      const req = new Request("http://localhost:3000/api/client/restaurant/orders", {
        headers: { Authorization: `Bearer ${fakeJwt}` },
      });

      await expect(resolveCallerIdentity(req)).rejects.toThrow(/Forbidden/i);
    });
  });
});
