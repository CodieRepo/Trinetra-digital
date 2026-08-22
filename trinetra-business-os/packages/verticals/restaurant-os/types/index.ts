// ---------------------------------------------------------------------------
// Restaurant domain utilities
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns true when `value` is a valid UUID v4 string. */
export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

// ---------------------------------------------------------------------------
// Staff roles
// ---------------------------------------------------------------------------

export const RESTAURANT_STAFF_ROLES = ["kitchen", "waiter"] as const;
export type RestaurantStaffRole = (typeof RESTAURANT_STAFF_ROLES)[number];

// ---------------------------------------------------------------------------
// Order statuses
// ---------------------------------------------------------------------------

export type RestaurantOrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "served"
  | "closed"
  | "cancelled";

// ---------------------------------------------------------------------------
// QR URL builder
// ---------------------------------------------------------------------------

/** Builds the public QR landing URL for a table token. */
export function buildRestaurantQrUrl(
  baseUrl: string,
  tableToken: string,
): string {
  return `${baseUrl.replace(/\/$/, "")}/r/${tableToken}`;
}

// ---------------------------------------------------------------------------
// Order-status transition rules
// ---------------------------------------------------------------------------

type TransitionMap = Partial<
  Record<RestaurantOrderStatus, RestaurantOrderStatus[]>
>;

const KITCHEN_TRANSITIONS: TransitionMap = {
  placed: ["accepted", "preparing", "cancelled"],
  accepted: ["preparing", "ready", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served"],
};

const WAITER_TRANSITIONS: TransitionMap = {
  placed: ["accepted", "preparing", "cancelled"],
  accepted: ["preparing", "ready", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served"],
  served: ["closed"],
};

const FULL_MANAGEMENT_TRANSITIONS: TransitionMap = {
  placed: ["accepted", "preparing", "cancelled"],
  accepted: ["preparing", "ready", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "closed"],
  served: ["closed"],
};

const TRANSITIONS: Record<string, TransitionMap> = {
  kitchen: KITCHEN_TRANSITIONS,
  waiter: WAITER_TRANSITIONS,
  manager: FULL_MANAGEMENT_TRANSITIONS,
  owner: FULL_MANAGEMENT_TRANSITIONS,
  cashier: FULL_MANAGEMENT_TRANSITIONS,
  admin: FULL_MANAGEMENT_TRANSITIONS,
};

/** Order statuses that represent a finished order (no further transitions). */
export const TERMINAL_ORDER_STATUSES: ReadonlySet<RestaurantOrderStatus> =
  new Set(["served", "closed", "cancelled"]);

/** Returns true when `status` is a terminal (finished) order status. */
export function isTerminalOrderStatus(status: string): boolean {
  return TERMINAL_ORDER_STATUSES.has(status as RestaurantOrderStatus);
}

/** Normalise a phone number to digits-only (with leading +). */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9+]/g, "");
  return digits || "";
}

/**
 * Returns true when `role` is allowed to move an order from `from` → `to`.
 * All arguments are validated at the API boundary before this is called.
 */
export function canStaffTransitionOrder(
  role: string,
  from: RestaurantOrderStatus,
  to: RestaurantOrderStatus,
): boolean {
  const roleMap = TRANSITIONS[role] || FULL_MANAGEMENT_TRANSITIONS;
  const allowed = roleMap[from];
  return Array.isArray(allowed) && allowed.includes(to);
}
