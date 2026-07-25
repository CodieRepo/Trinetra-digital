import { getDatabaseClient } from "@trinetra/core/database";
import type { RestaurantStaffRole } from "@trinetra/restaurant-os/types";

/**
 * Extract a Bearer token from the Authorization header.
 * Expected format: "Bearer <token>"
 */
export function extractBearerToken(request: Request): string {
  const auth = request.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  return "";
}

export type VerifiedStaff = {
  staff_id: string;
  restaurant_id: string;
  role: RestaurantStaffRole;
  name: string;
};

type StaffRecord = {
  id: string;
  restaurant_id: string;
  role: RestaurantStaffRole;
  name: string;
  is_active: boolean;
};

/**
 * Looks up a staff member by their `access_token`.
 * Returns a `VerifiedStaff` object on success, or `null` when the token is
 * invalid, the record does not exist, or the staff member is inactive.
 */
export async function verifyStaffToken(
  accessToken: string,
): Promise<VerifiedStaff | null> {
  if (!accessToken) {
    return null;
  }

  const getDatabaseClient() = getSupabaseAdmin();
  const { data: staff, error } = await getDatabaseClient()
    .from("restaurant_staff")
    .select("id, restaurant_id, role, name, is_active")
    .eq("access_token", accessToken)
    .maybeSingle<StaffRecord>();

  if (error || !staff || !staff.is_active) {
    return null;
  }

  return {
    staff_id: staff.id,
    restaurant_id: staff.restaurant_id,
    role: staff.role,
    name: staff.name,
  };
}
