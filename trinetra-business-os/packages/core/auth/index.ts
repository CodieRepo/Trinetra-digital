export interface TenantUser {
  id: string;
  email?: string;
  role: 'owner' | 'admin' | 'manager' | 'sales' | 'support' | 'viewer';
  organizationId: string;
  tenantSlug: string;
}

export interface TenantContext {
  organizationId: string;
  user: TenantUser;
}

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_TENANT_SLUG = "default-org";

export async function resolveTenantContext(request?: Request): Promise<TenantContext> {
  const headerTenantId = request?.headers?.get("x-tenant-id");
  const organizationId = headerTenantId || DEFAULT_TENANT_ID;

  return {
    organizationId,
    user: {
      id: "usr-trinetra-admin",
      email: "admin@trinetra.com",
      role: "owner",
      organizationId,
      tenantSlug: DEFAULT_TENANT_SLUG,
    },
  };
}

export function createDefaultTenantContext(organizationId = DEFAULT_TENANT_ID): TenantContext {
  return {
    organizationId,
    user: {
      id: "usr-trinetra-admin",
      role: "owner",
      organizationId,
      tenantSlug: DEFAULT_TENANT_SLUG,
    },
  };
}

