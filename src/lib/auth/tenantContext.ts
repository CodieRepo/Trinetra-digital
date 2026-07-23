import { NextRequest } from "next/server";

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export function resolveTenantId(request: NextRequest | Request): string {
  // 1. Header check
  const headerTenant = request.headers.get("x-tenant-id") || request.headers.get("x-organization-id");
  if (headerTenant && headerTenant.trim()) {
    return headerTenant.trim();
  }

  // 2. Query param check
  try {
    const url = new URL(request.url);
    const queryTenant = url.searchParams.get("tenant_id") || url.searchParams.get("organization_id");
    if (queryTenant && queryTenant.trim()) {
      return queryTenant.trim();
    }
  } catch (e) {}

  // 3. Fallback to default system tenant
  return DEFAULT_TENANT_ID;
}
