import { NextResponse, NextRequest } from "next/server";
import { verifyAuthenticatedCrmUser } from "@/lib/auth/crm-auth";
import { validatePermissionGuard } from "@/lib/auth/rbac";
import { providerConfigService } from "@/services/providerConfigService";
import { UserRole } from "@/types/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await verifyAuthenticatedCrmUser(request);
  if (!auth.isAuthorized || !auth.tenantId) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.statusCode || 401 });
  }

  const userRole = (auth.role as UserRole) || "admin";
  const guard = validatePermissionGuard(userRole, "manage_settings");
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  try {
    const configs = await providerConfigService.getConfigs(auth.tenantId);
    return NextResponse.json({ success: true, configs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthenticatedCrmUser(request);
  if (!auth.isAuthorized || !auth.tenantId) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.statusCode || 401 });
  }

  const userRole = (auth.role as UserRole) || "admin";
  const guard = validatePermissionGuard(userRole, "manage_settings");
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { provider_key, config_json, is_active = true } = body;

    if (!provider_key) {
      return NextResponse.json({ error: "provider_key is required" }, { status: 400 });
    }

    const updated = await providerConfigService.setConfig(auth.tenantId, provider_key, config_json || {}, is_active);
    return NextResponse.json({ success: true, config: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
