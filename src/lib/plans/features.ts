/**
 * Trinetra Restaurant OS — SaaS Subscription Plans & Feature Matrix
 * File: src/lib/plans/features.ts
 *
 * Canonical specification of the 3-Tier commercial SaaS plans:
 * 1. Starter (₹1,999/mo) — Small Cafes, QSRs, Cloud Kitchens, Takeaways
 * 2. Pro / Growth (₹2,999/mo) — Full Dine-In Casual & Fine Dining Restaurants (Recommended)
 * 3. Enterprise (₹8,999/mo) — Resto-Bars, Breweries, Fine Dining & Multi-Branch Brands
 */

export type RestaurantPlanTier = "starter" | "pro" | "growth" | "enterprise";

export interface PlanFeatureConfig {
  tier: RestaurantPlanTier;
  displayName: string;
  monthlyPriceInr: number;
  pitchTitle: string;
  pitchSubtitle: string;
  limits: {
    maxTables: number; // -1 = unlimited
    maxFloors: number; // -1 = unlimited
    maxStaffAccounts: number; // -1 = unlimited
  };
  features: {
    qrMenu: boolean;
    waiterPos: boolean;
    thermalPrinting: boolean;
    kitchenKds: boolean;
    multiFloors: boolean;
    staffPinSecurity: boolean;
    splitBills: boolean;
    roleBasedDiscounts: boolean;
    dayEndReports: boolean;
    inventoryTracking: boolean;
    recipeBOM: boolean;
    whatsAppBilling: boolean;
    customerCrm: boolean;
    prioritySupport: boolean;
  };
}

export const PLAN_CONFIGS: Record<RestaurantPlanTier, PlanFeatureConfig> = {
  starter: {
    tier: "starter",
    displayName: "Starter Plan",
    monthlyPriceInr: 1999,
    pitchTitle: "Small Cafes, QSRs & Cloud Kitchens",
    pitchSubtitle: "Essential digital menu, waiter mobile POS, and fast billing.",
    limits: {
      maxTables: 10,
      maxFloors: 1,
      maxStaffAccounts: 3,
    },
    features: {
      qrMenu: true,
      waiterPos: true,
      thermalPrinting: true,
      kitchenKds: false,
      multiFloors: false,
      staffPinSecurity: true,
      splitBills: false,
      roleBasedDiscounts: false,
      dayEndReports: false,
      inventoryTracking: false,
      recipeBOM: false,
      whatsAppBilling: false,
      customerCrm: false,
      prioritySupport: false,
    },
  },
  pro: {
    tier: "pro",
    displayName: "Pro Plan",
    monthlyPriceInr: 2999,
    pitchTitle: "Full Dine-in Casual & Family Restaurants",
    pitchSubtitle: "Paperless Kitchen KDS, unlimited tables, multi-floor, and split bills.",
    limits: {
      maxTables: -1, // Unlimited
      maxFloors: -1, // Unlimited
      maxStaffAccounts: -1, // Unlimited
    },
    features: {
      qrMenu: true,
      waiterPos: true,
      thermalPrinting: true,
      kitchenKds: true,
      multiFloors: true,
      staffPinSecurity: true,
      splitBills: true,
      roleBasedDiscounts: true,
      dayEndReports: true,
      inventoryTracking: false,
      recipeBOM: false,
      whatsAppBilling: false,
      customerCrm: false,
      prioritySupport: false,
    },
  },
  growth: {
    tier: "growth",
    displayName: "Pro Plan",
    monthlyPriceInr: 2999,
    pitchTitle: "Full Dine-in Casual & Family Restaurants",
    pitchSubtitle: "Paperless Kitchen KDS, unlimited tables, multi-floor, and split bills.",
    limits: {
      maxTables: -1, // Unlimited
      maxFloors: -1, // Unlimited
      maxStaffAccounts: -1, // Unlimited
    },
    features: {
      qrMenu: true,
      waiterPos: true,
      thermalPrinting: true,
      kitchenKds: true,
      multiFloors: true,
      staffPinSecurity: true,
      splitBills: true,
      roleBasedDiscounts: true,
      dayEndReports: true,
      inventoryTracking: false,
      recipeBOM: false,
      whatsAppBilling: false,
      customerCrm: false,
      prioritySupport: false,
    },
  },
  enterprise: {
    tier: "enterprise",
    displayName: "Enterprise Plan",
    monthlyPriceInr: 8999,
    pitchTitle: "High-Volume Restaurants, Resto-Bars & Multi-Branch",
    pitchSubtitle: "Full inventory with recipe auto-deductions, WhatsApp billing, and dedicated SLA.",
    limits: {
      maxTables: -1,
      maxFloors: -1,
      maxStaffAccounts: -1,
    },
    features: {
      qrMenu: true,
      waiterPos: true,
      thermalPrinting: true,
      kitchenKds: true,
      multiFloors: true,
      staffPinSecurity: true,
      splitBills: true,
      roleBasedDiscounts: true,
      dayEndReports: true,
      inventoryTracking: true,
      recipeBOM: true,
      whatsAppBilling: true,
      customerCrm: true,
      prioritySupport: true,
    },
  },
};

/**
 * Returns canonical plan config with fallback to starter if tier string is unknown.
 */
export function getPlanConfig(tier?: string | null): PlanFeatureConfig {
  if (!tier) return PLAN_CONFIGS.starter;
  const normalized = tier.toLowerCase().trim() as RestaurantPlanTier;
  return PLAN_CONFIGS[normalized] || PLAN_CONFIGS.starter;
}

/**
 * Checks if a specific feature is unlocked on the given plan tier.
 */
export function isFeatureAllowed(
  tier: string | null | undefined,
  featureKey: keyof PlanFeatureConfig["features"]
): boolean {
  const config = getPlanConfig(tier);
  return Boolean(config.features[featureKey]);
}
