/**
 * Trinetra Restaurant OS — Milestone H-2B Role Authorization Guard
 * File: src/lib/auth/role-guard.ts
 * Description: Server-side RBAC guard enforcing caller authentication,
 *              tenant/restaurant scoping, and strict role permissions.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyStaffJwt, StaffJwtPayload } from "@/lib/crypto/auth-tokens";
import { RestaurantContextError, resolveRestaurantContext } from "@/app/api/client/restaurant/context";

export const CANONICAL_STAFF_ROLES = [
  "owner",
  "manager",
  "cashier",
  "waiter",
  "kitchen",
  "inventory",
  "accountant",
] as const;

export type CanonicalStaffRole = (typeof CANONICAL_STAFF_ROLES)[number];

export interface CallerIdentity {
  userId: string | null;
  tenantId: string;
  restaurantId: string;
  role: string;
  isOwner: boolean;
  isManager: boolean;
  isAuthenticated: boolean;
}

/**
 * Encodes staff role safely into DB storage
 */
export function encodeStaffRole(name: string, role: string): { dbName: string; dbRole: string } {
  const cleanName = name.replace(/^\[[a-zA-Z_]+\]\s*/, "").trim();
  const normalizedRole = role.toLowerCase().trim();
  const dbRole = normalizedRole === "kitchen" || normalizedRole === "inventory" ? "kitchen" : "waiter";
  const dbName = `[${normalizedRole}] ${cleanName}`;
  return { dbName, dbRole };
}

/**
 * Decodes staff record to expose canonical role and clean name
 */
export function decodeStaffRecord<T extends { name: string; role: string }>(staff: T): T {
  let resolvedRole = staff.role;
  let resolvedName = staff.name;

  const match = staff.name?.match(/^\[([a-zA-Z_]+)\]\s*(.*)$/);
  if (match) {
    resolvedRole = match[1].toLowerCase();
    resolvedName = match[2];
  }

  return {
    ...staff,
    name: resolvedName,
    role: resolvedRole,
  };
}

/**
 * Normalizes administrative roles into canonical hierarchy
 */
export function normalizeRole(rawRole: string | null | undefined): string | null {
  if (!rawRole) return null;
  const role = rawRole.toLowerCase().trim();
  if (role === "super_admin" || role === "client_admin" || role === "admin" || role === "owner") {
    return "owner";
  }
  return role;
}

/**
 * Resolves the authenticated caller's verified role and tenant/restaurant scope
 */
export async function resolveCallerIdentity(
  request: Request,
  bodyData?: any
): Promise<CallerIdentity> {
  const db = getSupabaseAdmin();

  // 1. Check for signed Staff JWT in Authorization header
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const jwtPayload: StaffJwtPayload | null = verifyStaffJwt(token);
    if (jwtPayload) {
      // Live database verification for active staff status
      const { data: staffRecord } = await db
        .from("restaurant_staff")
        .select("id, name, is_active, role, tenant_id, restaurant_id")
        .eq("id", jwtPayload.staff_id)
        .eq("restaurant_id", jwtPayload.restaurant_id)
        .maybeSingle();

      if (!staffRecord || !staffRecord.is_active) {
        throw new RestaurantContextError(
          "Forbidden: Staff account has been deactivated or does not exist.",
          403
        );
      }

      const decoded = decodeStaffRecord(staffRecord);
      const role = normalizeRole(jwtPayload.role || decoded.role) || "waiter";
      return {
        userId: jwtPayload.staff_id,
        tenantId: staffRecord.tenant_id,
        restaurantId: staffRecord.restaurant_id,
        role,
        isOwner: role === "owner",
        isManager: role === "owner" || role === "manager",
        isAuthenticated: true,
      };
    }
  }

  // 2. Resolve via Supabase user session (Cookie or Supabase Bearer token)
  const context = await resolveRestaurantContext(request, bodyData);
  if (!context.isAuthenticated || !context.tenantId || !context.restaurantId) {
    throw new RestaurantContextError("Unauthorized: Authentication required.", 401);
  }

  // Find user ID from Supabase server client or Bearer token
  let userId: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7).trim();
      const { data: { user } } = await db.auth.getUser(token);
      if (user) userId = user.id;
    } catch {}
  }

  if (!userId) {
    try {
      const supabaseServer = await createServerClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (user) userId = user.id;
    } catch {}
  }

  let rawRole: string | null = null;

  if (userId) {
    // A. Check users_roles
    const { data: roleData } = await db
      .from("users_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", context.tenantId)
      .maybeSingle();

    if (roleData?.role) {
      rawRole = roleData.role;
    } else {
      // B. Check profiles
      const { data: profile } = await db
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.role) {
        rawRole = profile.role;
      } else {
        // C. Check restaurant_staff
        const { data: staffMatch } = await db
          .from("restaurant_staff")
          .select("id, name, role")
          .eq("tenant_id", context.tenantId)
          .eq("restaurant_id", context.restaurantId)
          .eq("id", userId)
          .maybeSingle();

        if (staffMatch) {
          const decoded = decodeStaffRecord(staffMatch);
          rawRole = decoded.role;
        }
      }
    }
  }

  // Default authenticated CRM / restaurant admin to owner
  const role = normalizeRole(rawRole) || "owner";

  return {
    userId,
    tenantId: context.tenantId,
    restaurantId: context.restaurantId,
    role,
    isOwner: role === "owner",
    isManager: role === "owner" || role === "manager",
    isAuthenticated: true,
  };
}

/**
 * Enforces that the caller has one of the required roles.
 * Throws RestaurantContextError(403) if authorization fails.
 */
export async function requireStaffRole(
  request: Request,
  allowedRoles: string[],
  bodyData?: any
): Promise<CallerIdentity> {
  const caller = await resolveCallerIdentity(request, bodyData);

  // Normalize allowed roles
  const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r) || r.toLowerCase());

  const callerRole = normalizeRole(caller.role) || caller.role.toLowerCase();

  // Owners have universal super-set access
  if (caller.isOwner || callerRole === "owner") {
    return caller;
  }

  // Managers have operational access if 'manager' is in allowed list
  if (caller.isManager && normalizedAllowed.includes("manager")) {
    return caller;
  }

  // Direct role match
  if (normalizedAllowed.includes(callerRole)) {
    return caller;
  }

  throw new RestaurantContextError(
    `Forbidden: Role '${caller.role}' is not authorized to perform this operation. Required: ${allowedRoles.join(", ")}`,
    403
  );
}
