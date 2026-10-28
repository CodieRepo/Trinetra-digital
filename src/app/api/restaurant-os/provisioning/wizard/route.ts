import { NextRequest, NextResponse } from 'next/server';
import { ProvisioningService } from '@/lib/services/provisioningService';
import { WizardStepData } from '@/types/restaurant-os/provisioning';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { verifySuperAdminAccess } from '@/lib/auth/admin-guard';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolves caller permissions for a specific restaurant in the setup wizard.
 */
async function verifyWizardAccess(
  req: NextRequest,
  restaurantId: string,
  requiredRole: "read" | "write"
): Promise<{ isAuthorized: boolean; error?: string; statusCode?: number }> {
  // 1. Super-admin or dedicated admin key check
  const superAdminCheck = await verifySuperAdminAccess(req);
  if (superAdminCheck.isAuthorized) {
    return { isAuthorized: true };
  }

  const db = getSupabaseAdmin();
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  let authUser: any = null;

  // 2. Resolve user from Bearer JWT
  if (bearerToken && bearerToken.split(".").length === 3) {
    try {
      const { data: { user } } = await db.auth.getUser(bearerToken);
      if (user) authUser = user;
    } catch {}
  }

  // 3. Resolve user from cookie session
  if (!authUser) {
    try {
      const supabaseServer = await createServerClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      if (user) authUser = user;
    } catch {}
  }

  if (!authUser) {
    return {
      isAuthorized: false,
      error: "Unauthorized: Authentication required to access setup wizard",
      statusCode: 401,
    };
  }

  // 4. Resolve restaurant tenant
  const { data: restRow } = await db
    .from("restaurants")
    .select("tenant_id")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restRow?.tenant_id) {
    return {
      isAuthorized: false,
      error: "Restaurant not found",
      statusCode: 404,
    };
  }

  const tenantId = restRow.tenant_id;
  const userId = authUser.id;

  // 5. Query user's role for this tenant
  const [roleRes, profileRes] = await Promise.all([
    db.from("users_roles").select("role").eq("user_id", userId).eq("tenant_id", tenantId).maybeSingle(),
    db.from("profiles").select("role").eq("id", userId).maybeSingle(),
  ]);

  const userRole = roleRes.data?.role || profileRes.data?.role;

  if (!userRole) {
    return {
      isAuthorized: false,
      error: "Forbidden: You do not have access to this restaurant",
      statusCode: 403,
    };
  }

  const normalizedRole = userRole.toLowerCase().trim();

  if (requiredRole === "read") {
    // Any tenant member with admin/owner/manager role
    if (["super_admin", "client_admin", "owner", "admin", "manager"].includes(normalizedRole)) {
      return { isAuthorized: true };
    }
  } else if (requiredRole === "write") {
    // Only owner, manager, or super_admin can mutate wizard state
    if (["super_admin", "client_admin", "owner", "admin", "manager"].includes(normalizedRole)) {
      return { isAuthorized: true };
    }
  }

  return {
    isAuthorized: false,
    error: `Forbidden: Role '${userRole}' is not authorized to modify setup wizard settings`,
    statusCode: 403,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId query parameter is required' },
        { status: 400 }
      );
    }

    const authCheck = await verifyWizardAccess(req, restaurantId, "read");
    if (!authCheck.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || "Unauthorized" },
        { status: authCheck.statusCode || 401 }
      );
    }

    const profile = await ProvisioningService.getRestaurantProfile(restaurantId);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: `Restaurant profile for ${restaurantId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: profile }, { status: 200 });
  } catch (error: any) {
    console.error('[Wizard GET API Error]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch wizard profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantId, stepData } = body as {
      restaurantId: string;
      stepData: WizardStepData;
    };

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required' },
        { status: 400 }
      );
    }

    if (!stepData || typeof stepData.step !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Valid stepData with step number is required' },
        { status: 400 }
      );
    }

    const authCheck = await verifyWizardAccess(req, restaurantId, "write");
    if (!authCheck.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || "Unauthorized" },
        { status: authCheck.statusCode || 401 }
      );
    }

    const updatedProfile = await ProvisioningService.updateWizardStep(restaurantId, stepData);

    return NextResponse.json({ success: true, data: updatedProfile }, { status: 200 });
  } catch (error: any) {
    console.error('[Wizard PATCH API Error]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update wizard step' },
      { status: 500 }
    );
  }
}
