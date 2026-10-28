/**
 * Trinetra Restaurant OS — Unified Billing & Financial Calculation Engine
 * File: src/lib/services/billing-calculator.ts
 * Description: Single authoritative calculation path for subtotal, discounts,
 *              taxes (GST), service charges, round-offs, and grand totals.
 *              Guarantees 100% mathematical parity across Staff POS and Admin Cockpit.
 */

import { getSupabaseAdmin } from "../supabase/admin";

export interface BillCalculationInput {
  subtotal: number;
  discountType?: "percentage" | "flat" | "none" | string;
  discountValue?: number;
  discountReason?: string | null;
  taxRate?: number; // Total GST % (e.g. 5.0 for 5%)
  serviceChargeRate?: number; // Service charge % (e.g. 0.0 for 0%)
}

export interface BillCalculationResult {
  subtotal: number;
  discountType: "percentage" | "flat" | "none";
  discountValue: number;
  discountAmount: number;
  discountReason: string | null;
  afterDiscount: number;
  taxRate: number;
  taxAmount: number;
  serviceChargeRate: number;
  serviceCharge: number;
  totalBeforeRoundOff: number;
  grandTotal: number;
  roundOff: number;
}

export interface RestaurantTaxConfig {
  taxRate: number;
  serviceChargeRate: number;
  isTaxInclusive: boolean;
  cgstPct: number;
  sgstPct: number;
}

export const DEFAULT_TAX_RATE_PERCENT = 5.0; // 2.5% CGST + 2.5% SGST standard Indian restaurant GST
export const DEFAULT_SERVICE_CHARGE_PERCENT = 0.0;

/**
 * Pure, deterministic mathematical calculation for restaurant bills.
 */
export function calculateBillBreakdown(input: BillCalculationInput): BillCalculationResult {
  const subtotal = Math.max(0, Number(input.subtotal) || 0);

  // 1. Calculate discount
  const rawType = (input.discountType || "none").toLowerCase();
  const discountType: "percentage" | "flat" | "none" =
    rawType === "percentage" || rawType === "flat" ? rawType : "none";
  const discountValue = Math.max(0, Number(input.discountValue) || 0);

  let discountAmount = 0;
  if (discountType === "percentage") {
    discountAmount = (subtotal * discountValue) / 100;
  } else if (discountType === "flat") {
    discountAmount = discountValue;
  }

  // Discount cannot exceed subtotal and cannot be negative
  discountAmount = Math.min(subtotal, Math.max(0, Number(discountAmount.toFixed(2))));
  const afterDiscount = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  // 2. Tax & Service Charge rates
  const taxRate = input.taxRate !== undefined && input.taxRate !== null && !isNaN(Number(input.taxRate))
    ? Math.max(0, Number(input.taxRate))
    : DEFAULT_TAX_RATE_PERCENT;

  const serviceChargeRate = input.serviceChargeRate !== undefined && input.serviceChargeRate !== null && !isNaN(Number(input.serviceChargeRate))
    ? Math.max(0, Number(input.serviceChargeRate))
    : DEFAULT_SERVICE_CHARGE_PERCENT;

  // 3. Tax and Service Charge calculations
  const taxAmount = Number(((afterDiscount * taxRate) / 100).toFixed(2));
  const serviceCharge = Number(((afterDiscount * serviceChargeRate) / 100).toFixed(2));

  // 4. Grand Total & Round-off
  const totalBeforeRoundOff = Number((afterDiscount + taxAmount + serviceCharge).toFixed(2));
  const grandTotal = Math.round(totalBeforeRoundOff);
  const roundOff = Number((grandTotal - totalBeforeRoundOff).toFixed(2));

  return {
    subtotal,
    discountType,
    discountValue,
    discountAmount,
    discountReason: input.discountReason || null,
    afterDiscount,
    taxRate,
    taxAmount,
    serviceChargeRate,
    serviceCharge,
    totalBeforeRoundOff,
    grandTotal,
    roundOff,
  };
}

/**
 * Resolves the configured tax rates and service charges for a restaurant.
 * Checks restaurant_settings first, then tenant_settings, and falls back to 5.0% GST.
 */
export async function resolveRestaurantTaxConfig(
  restaurantId?: string | null,
  tenantId?: string | null
): Promise<RestaurantTaxConfig> {
  const db = getSupabaseAdmin();

  try {
    // 1. Check restaurant_settings (migration 0013 / 0027 schema)
    if (restaurantId) {
      const { data: restSettings } = await db
        .from("restaurant_settings")
        .select("cgst_pct, sgst_pct, service_charge_pct, is_tax_inclusive")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (restSettings) {
        const cgst = Number(restSettings.cgst_pct) || 0;
        const sgst = Number(restSettings.sgst_pct) || 0;
        const taxRate = cgst + sgst;
        const serviceChargeRate = Number(restSettings.service_charge_pct) || 0;
        return {
          taxRate: taxRate > 0 ? taxRate : DEFAULT_TAX_RATE_PERCENT,
          serviceChargeRate,
          isTaxInclusive: Boolean(restSettings.is_tax_inclusive),
          cgstPct: cgst,
          sgstPct: sgst,
        };
      }
    }

    // 2. Check tenant_settings custom payment_settings feature flags
    if (tenantId) {
      const { data: tenantSettings } = await db
        .from("tenant_settings")
        .select("feature_flags")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const ps = tenantSettings?.feature_flags?.payment_settings;
      if (ps && (ps.tax_rate_percent !== undefined || ps.service_charge_percent !== undefined)) {
        const taxRate = ps.tax_rate_percent !== undefined ? Number(ps.tax_rate_percent) : DEFAULT_TAX_RATE_PERCENT;
        const serviceChargeRate = ps.service_charge_percent !== undefined ? Number(ps.service_charge_percent) : DEFAULT_SERVICE_CHARGE_PERCENT;
        return {
          taxRate: isNaN(taxRate) ? DEFAULT_TAX_RATE_PERCENT : taxRate,
          serviceChargeRate: isNaN(serviceChargeRate) ? DEFAULT_SERVICE_CHARGE_PERCENT : serviceChargeRate,
          isTaxInclusive: false,
          cgstPct: taxRate / 2,
          sgstPct: taxRate / 2,
        };
      }
    }
  } catch (err) {
    console.warn("[BillingCalculator] Tax config resolution notice:", err);
  }

  // Fallback defaults: 5.0% GST (2.5% CGST + 2.5% SGST), 0% service charge
  return {
    taxRate: DEFAULT_TAX_RATE_PERCENT,
    serviceChargeRate: DEFAULT_SERVICE_CHARGE_PERCENT,
    isTaxInclusive: false,
    cgstPct: 2.5,
    sgstPct: 2.5,
  };
}
