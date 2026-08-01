# Multi-Tenant Architecture & RLS Specification — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Platform Core Blueprint  
> **Related Documents**: [SYSTEM_ARCHITECTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/SYSTEM_ARCHITECTURE.md), [DATABASE_SCHEMA.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/03_Database/DATABASE_SCHEMA.md)

---

## 1. Purpose

This document provides the complete technical specification for **Trinetra's Multi-Tenant Architecture**. It defines the tenant hierarchy, PostgreSQL Row-Level Security (RLS) policies, JWT claim injection mechanisms, and cross-tenant data isolation rules.

---

## 2. Multi-Tenant Entity Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TENANT HIERARCHY TREE                           │
├────────────────────────────────────────────────────────────────────────┤
│  Level 1: Organization (Legal Business Entity / Brand)                 │
│    │                                                                   │
│    └── Level 2: Restaurant (Brand Concept / Chain Name)                │
│          │                                                             │
│          └── Level 3: Branch (Physical Outlet / Location Site)         │
│                │                                                       │
│                ├── Level 4: Department (Kitchen, Bar, Floor, Cashier)  │
│                └── Level 4: Workstation (POS-01, KDS-01, KDS-02)       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. JWT Tenant Claim Injection

When a user authenticates via Supabase Auth, custom JWT claims embed the active `organization_id`, `restaurant_id`, `branch_id`, and `role` into the session token:

```json
{
  "sub": "usr_9988776655",
  "email": "manager@downtownbistro.com",
  "role": "authenticated",
  "app_metadata": {
    "organization_id": "org_112233",
    "restaurant_id": "rest_445566",
    "active_branch_id": "br_778899",
    "user_role": "RESTAURANT_MANAGER"
  }
}
```

---

## 4. PostgreSQL Row-Level Security (RLS) Policy Blueprint

Every database table containing tenant data implements RLS policies filtering records by `branch_id`:

```sql
-- Enable RLS on Orders Table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Helper Function: Extract Active Branch ID from JWT
CREATE OR REPLACE FUNCTION current_branch_id() 
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'active_branch_id', '')::UUID;
$$ LANGUAGE sql STABLE;

-- RLS Policy: Users can only read/write orders belonging to their active branch
CREATE POLICY branch_orders_isolation_policy ON public.orders
  FOR ALL
  USING (branch_id = current_branch_id())
  WITH CHECK (branch_id = current_branch_id());
```

---

## 5. Middleware Context Injection Example

```typescript
// src/modules/core/middleware/tenant-context.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function tenantContextMiddleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => req.cookies.get(name)?.value } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return res;

  const branchId = session.user.app_metadata.active_branch_id;
  if (!branchId && req.nextUrl.pathname.startsWith('/pos')) {
    // Redirect to branch selection if no active branch is set
    return NextResponse.redirect(new URL('/select-branch', req.url));
  }

  res.headers.set('x-tenant-branch-id', branchId);
  return res;
}
```

---

## 6. Developer & Security Invariants

- **Invariant**: No SQL query may execute without `branch_id` filtering, either via RLS or explicit Prisma `where` clause filters.
- **Cross-Tenant Testing**: QA test suites must assert that API requests with Branch A credentials return `403 Forbidden` when attempting to access Branch B resources.
