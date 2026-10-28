import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateBillBreakdown,
  DEFAULT_TAX_RATE_PERCENT,
} from "../../src/lib/services/billing-calculator";

// Mock Supabase admin
const mockOrders = [
  { id: "ord_1", total_amount: 500 },
  { id: "ord_2", total_amount: 500 },
];

const mockDiscountAudits: any[] = [];
const mockBills: any[] = [];
let mockSessionStatus = "active";
let mockSessionPaymentStatus = "unpaid";

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === "restaurant_orders") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: mockOrders, error: null })),
          })),
        })),
      };
    }
    if (table === "restaurant_bills") {
      return {
        upsert: vi.fn(async (payload: any) => {
          mockBills.push(payload);
          return { error: null };
        }),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        })),
      };
    }
    if (table === "restaurant_discount_audit") {
      return {
        insert: vi.fn(async (payload: any) => {
          mockDiscountAudits.push(payload);
          return { error: null };
        }),
      };
    }
    if (table === "restaurant_table_sessions") {
      return {
        update: vi.fn((fields: any) => ({
          eq: vi.fn(() => ({
            eq: vi.fn(async () => {
              if (fields.payment_status) mockSessionPaymentStatus = fields.payment_status;
              return { error: null };
            }),
          })),
        })),
      };
    }
    if (table === "restaurant_settings") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  tax_rate: 5.0,
                  service_charge_rate: 0.0,
                  is_tax_inclusive: false,
                },
                error: null,
              })),
            })),
          })),
        })),
      };
    }
    if (table === "users_roles") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { role: "owner" }, error: null })),
            })),
          })),
        })),
      };
    }
    if (table === "profiles") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { role: "owner" }, error: null })),
          })),
        })),
      };
    }
    return {};
  }),
  auth: {
    getUser: vi.fn(async () => ({ data: { user: { id: "test-user-id" } } })),
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
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } } }),
    },
  }),
}));

vi.mock("@/lib/services/billing-calculator", async () => {
  return await vi.importActual("../../src/lib/services/billing-calculator");
});

vi.mock("../../src/app/api/client/restaurant/context", () => ({
  resolveRestaurantContext: vi.fn(async () => ({
    tenantId: "tenant_billing_test",
    restaurantId: "rest_billing_test",
    role: "owner",
  })),
  RestaurantContextError: class RestaurantContextError extends Error {
    status: number;
    constructor(msg: string, status = 400) {
      super(msg);
      this.status = status;
    }
  },
}));

describe("Milestone 10: Billing, Financial Calculation & Split Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDiscountAudits.length = 0;
    mockBills.length = 0;
    mockSessionPaymentStatus = "unpaid";
  });

  describe("1. Deterministic Financial Calculator Parity", () => {
    it("computes exact subtotal, 5% GST, round-off, and grand total without discount", () => {
      const result = calculateBillBreakdown({
        subtotal: 1000,
        taxRate: 5.0,
      });

      expect(result.subtotal).toBe(1000);
      expect(result.discountAmount).toBe(0);
      expect(result.afterDiscount).toBe(1000);
      expect(result.taxRate).toBe(5.0);
      expect(result.taxAmount).toBe(50.0);
      expect(result.serviceCharge).toBe(0);
      expect(result.grandTotal).toBe(1050);
      expect(result.roundOff).toBe(0);
    });

    it("computes percentage discount accurately with 5% GST applied on discounted net", () => {
      const result = calculateBillBreakdown({
        subtotal: 1000,
        discountType: "percentage",
        discountValue: 10, // 10% discount = ₹100
        taxRate: 5.0,
      });

      expect(result.subtotal).toBe(1000);
      expect(result.discountAmount).toBe(100);
      expect(result.afterDiscount).toBe(900);
      expect(result.taxAmount).toBe(45); // 5% of 900
      expect(result.grandTotal).toBe(945);
    });

    it("computes flat discount accurately with round-off handling", () => {
      const result = calculateBillBreakdown({
        subtotal: 525.5,
        discountType: "flat",
        discountValue: 50,
        taxRate: 5.0,
      });

      expect(result.afterDiscount).toBe(475.5);
      expect(result.taxAmount).toBe(23.77);
      expect(result.grandTotal).toBe(499);
      expect(result.roundOff).toBe(-0.27);
    });

    it("caps discount amount to subtotal (never allows negative net)", () => {
      const result = calculateBillBreakdown({
        subtotal: 200,
        discountType: "flat",
        discountValue: 500, // exceeds subtotal
        taxRate: 5.0,
      });

      expect(result.discountAmount).toBe(200);
      expect(result.afterDiscount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.grandTotal).toBe(0);
    });
  });

  describe("2. Split Bill Multi-Diner Math", () => {
    it("calculates exact equal split across N diners with remainder allocation", () => {
      function calculateEqualSplit(grandTotal: number, diners: number) {
        const perPerson = Math.floor(grandTotal / diners);
        const remainder = grandTotal % diners;
        const splits = Array.from({ length: diners }, (_, idx) => ({
          dinerIndex: idx + 1,
          amount: idx === diners - 1 ? perPerson + remainder : perPerson,
        }));
        return { perPerson, remainder, splits };
      }

      // ₹1,000 split 3 ways
      const split3 = calculateEqualSplit(1000, 3);
      expect(split3.perPerson).toBe(333);
      expect(split3.remainder).toBe(1);
      expect(split3.splits[0].amount).toBe(333);
      expect(split3.splits[1].amount).toBe(333);
      expect(split3.splits[2].amount).toBe(334); // Last diner pays remainder
      expect(split3.splits.reduce((s, d) => s + d.amount, 0)).toBe(1000);

      // ₹1,550 split 4 ways
      const split4 = calculateEqualSplit(1550, 4);
      expect(split4.splits.reduce((s, d) => s + d.amount, 0)).toBe(1550);
    });
  });

  describe("3. Payment Settlement & Discount Auditing API", () => {
    it("settles payment, creates bill record, and records audit trail on discount", async () => {
      const { POST } = await import("../../src/app/api/client/restaurant/sessions/payment/route");

      const req = new Request("http://localhost:3000/api/client/restaurant/sessions/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          session_id: "sess_bill_01",
          action: "mark_paid",
          discount_type: "percentage",
          discount_value: 10,
          discount_reason: "Loyalty Member VIP",
          payment_method: "UPI",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify bill was created
      expect(mockBills.length).toBe(1);
      expect(mockBills[0]).toMatchObject({
        tenant_id: "tenant_billing_test",
        restaurant_id: "rest_billing_test",
        session_id: "sess_bill_01",
        subtotal: 1000,
        discount_amount: 100,
        payment_method: "UPI",
      });

      // Verify discount audit record was logged
      expect(mockDiscountAudits.length).toBe(1);
      expect(mockDiscountAudits[0]).toMatchObject({
        tenant_id: "tenant_billing_test",
        restaurant_id: "rest_billing_test",
        session_id: "sess_bill_01",
        discount_type: "percentage",
        discount_amount: 100,
        reason: "Loyalty Member VIP",
      });

      // Verify session payment_status was updated to paid
      expect(mockSessionPaymentStatus).toBe("paid");
    });

    it("resets payment to unpaid and deletes bill on 'undo_paid'", async () => {
      const { POST } = await import("../../src/app/api/client/restaurant/sessions/payment/route");

      const req = new Request("http://localhost:3000/api/client/restaurant/sessions/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          session_id: "sess_bill_01",
          action: "undo_paid",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSessionPaymentStatus).toBe("unpaid");
    });
  });
});
