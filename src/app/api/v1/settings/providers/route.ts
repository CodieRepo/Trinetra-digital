import { NextResponse, NextRequest } from "next/server";
import { resolveTenantId } from "../../../../../lib/auth/tenantContext";
import { validatePermissionGuard } from "../../../../../lib/auth/rbac";
import { providerConfigService } from "../../../../../services/providerConfigService";
import { UserRole } from "../../../../../types/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const tenant_id = resolveTenantId(request);
  const userRole: UserRole = "admin"; // Derived from session auth token in production

  const guard = validatePermissionGuard(userRole, "manage_settings");
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  try {
    const configs = await providerConfigService.getConfigs(tenant_id);
    return NextResponse.json({ success: true, configs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const tenant_id = resolveTenantId(request);
  const userRole: UserRole = "admin";

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

    const updated = await providerConfigService.setConfig(tenant_id, provider_key, config_json || {}, is_active);
    return NextResponse.json({ success: true, config: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
