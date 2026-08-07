# Milestone 3 — Architecture Remediation Plan

**Document Version:** `v1.0.0`  
**Status:** PENDING APPROVAL  
**Migration:** `0018_m3_architecture_remediation.sql`  
**Prerequisite:** [M3_DATABASE_REVIEW_GATE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/milestones/M3_DATABASE_REVIEW_GATE.md) (FAILED — 7 Critical Issues)  
**Date:** 2026-08-07

---

## 1. Canonical Schema Registry

Before any remediation, we must establish which tables are authoritative for Restaurant OS and which are legacy CRM artifacts.

### 1.1 Canonical Restaurant OS Tables (Active Development)

These tables are the **source of truth** for Restaurant OS. All future milestones (M4–M15) build exclusively on these.

| Table | Created In | Domain | Owner | Status |
|-------|-----------|--------|-------|--------|
| `tenants` | 0007 | Platform | postgres | **Canonical** — shared SaaS platform root |
| `restaurants` | 0008 | Restaurant OS | postgres | **Canonical** — core restaurant entity |
| `restaurant_staff` | 0008 | Restaurant OS | postgres | **Canonical** — staff registry |
| `restaurant_tables` | 0008 | Restaurant OS | postgres | **Canonical** — physical table registry |
| `restaurant_table_sessions` | 0008 | Restaurant OS | postgres | **Canonical** — active dine-in sessions |
| `restaurant_orders` | 0008 | Restaurant OS | postgres | **Canonical** — POS orders |
| `restaurant_order_items` | 0008 | Restaurant OS | postgres | **Canonical** — line items |
| `restaurant_order_events` | 0008 | Restaurant OS | postgres | **Canonical** — order state machine audit |
| `menu_categories` | 0008 | Restaurant OS | postgres | **Canonical** — menu structure |
| `menu_items` | 0008 | Restaurant OS | postgres | **Canonical** — menu content |
| `restaurant_bills` | 0009b | Restaurant OS | postgres | **Canonical** — billing records |
| `restaurant_discount_audit` | 0009b | Restaurant OS | postgres | **Canonical** — discount compliance trail |
| `restaurant_terminals` | 0016 | Auth | trinetra_app | **Canonical** — hardware device registry |
| `restaurant_staff_pins` | 0016 | Auth | trinetra_app | **Canonical** — PIN security |
| `terminal_sessions` | 0016 | Auth | trinetra_app | **Canonical** — active terminal sessions |
| `auth_audit_logs` | 0016 | Auth | trinetra_app | **Canonical** — auth event trail |
| `restaurant_feature_flags` | 0017 | Provisioning | trinetra_app | **Canonical** — module gating |
| `restaurant_settings` | 0017 | Provisioning | trinetra_app | **Canonical** — tax/operational config |
| `restaurant_floors` | 0017 | Provisioning | trinetra_app | **Canonical** — floor layout |
| `provisioning_audit_events` | 0017 | Provisioning | trinetra_app | **Canonical** — provisioning trail |
| `restaurant_profiles` | **0018 (NEW)** | Restaurant OS | trinetra_app | **Canonical** — lifecycle, wizard, branding |

### 1.2 Legacy CRM Tables (Deprecated for Restaurant OS)

These tables belong to the CRM module. They will NOT receive Restaurant OS development. No data will be deleted.

| Table | Created In | Domain | Status |
|-------|-----------|--------|--------|
| `leads` | 0007 | CRM | **Legacy** — CRM lead pipeline |
| `conversations` | 0007 | CRM | **Legacy** — CRM messaging |
| `messages` | 0007 | CRM | **Legacy** — CRM messages |
| `timeline_events` | 0007 | CRM | **Legacy** — CRM activity feed |
| `tasks` | 0007 | CRM | **Legacy** — CRM task management |
| `lead_notes` | 0007 | CRM | **Legacy** — CRM notes |
| `webhook_logs` | 0007 | CRM | **Legacy** — webhook processing |
| `background_jobs` | 0007 | CRM | **Legacy** — job queue |
| `audit_logs` | 0007 | CRM | **Legacy** — generic CRM audit |
| `notifications` | 0007 | CRM | **Legacy** — CRM notifications |
| `provider_configs` | 0007 | CRM | **Legacy** — integration config |
| `ai_prompts` | 0007 | CRM | **Legacy** — AI prompt management |
| `system_error_logs` | 0007 | CRM | **Legacy** — error tracking |
| `users_roles` | 0007 | Platform | **Legacy** — CRM RBAC (superseded by restaurant_staff for Restaurant OS) |

### 1.3 Shared Platform Tables (Used by Both)

| Table | Notes |
|-------|-------|
| `tenants` | Shared root entity. Used by both CRM and Restaurant OS. |
| `profiles` | Supabase auth profiles. Shared. |

---

## 2. Remediation Design — Priority A Fixes

### Fix 1: Staff Role Constraint Expansion

**Problem:** `restaurant_staff.role` CHECK allows only `('kitchen', 'waiter')`.  
**Required:** 7 production roles: `owner`, `manager`, `cashier`, `waiter`, `kitchen`, `inventory`, `accountant`.

**Design:**
```sql
ALTER TABLE public.restaurant_staff
    DROP CONSTRAINT IF EXISTS restaurant_staff_role_check;

ALTER TABLE public.restaurant_staff
    ADD CONSTRAINT restaurant_staff_role_check
    CHECK (role IN ('owner', 'manager', 'cashier', 'waiter', 'kitchen', 'inventory', 'accountant'));
```

**Data Migration:** Update existing demo data rows to use correct roles.

**Backward Compatibility:** Additive change. Old values `'kitchen'` and `'waiter'` remain valid.

---

### Fix 2: `search_path` Pinning on All SECURITY DEFINER RPCs

**Problem:** 9 SECURITY DEFINER functions across 3 migrations lack `SET search_path`.  
**CVE:** [CVE-2018-1058](https://wiki.postgresql.org/wiki/A_Guide_to_CVE-2018-1058)

**Design:** Re-create each function with `SET search_path = public, pg_temp` added.

**Functions to patch (9 total, 8 unique):**

| Function | Migration | Language |
|----------|-----------|----------|
| `current_tenant_id()` | 0012 | plpgsql |
| `get_jwt_claim(text)` | 0016 | sql |
| `set_staff_pin_rpc(uuid, uuid, text)` | 0016 | plpgsql |
| `pair_terminal_device_rpc(...)` | 0016 | plpgsql |
| `verify_staff_pin_rpc(...)` | 0016 | plpgsql |
| `revoke_terminal_device_rpc(...)` | 0016 | plpgsql |
| `provision_restaurant_rpc(...)` | 0017 | plpgsql |
| `validate_restaurant_readiness_rpc(uuid)` | 0017 | plpgsql |
| `seed_demo_restaurant_rpc()` | 0017 | plpgsql |

**Backward Compatibility:** Behavioral no-op. Only the search_path changes.

---

### Fix 3: `restaurant_profiles` Extension Table

**Problem:** No table stores lifecycle status, wizard progress, branding, or business metadata.

**Design:** Create a 1:1 extension table:

```sql
CREATE TABLE public.restaurant_profiles (
    restaurant_id     UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Lifecycle State Machine
    status            TEXT NOT NULL DEFAULT 'Provisioning'
                      CHECK (status IN (
                          'Provisioning', 'Setup Pending', 'Ready',
                          'Operational', 'Maintenance', 'Suspended', 'Archived'
                      )),

    -- Setup Wizard Progress
    wizard_step       INTEGER NOT NULL DEFAULT 1 CHECK (wizard_step BETWEEN 1 AND 8),
    wizard_completed  BOOLEAN NOT NULL DEFAULT false,
    wizard_completed_at TIMESTAMPTZ,
    wizard_version    TEXT NOT NULL DEFAULT 'v1.1',

    -- Restaurant Identity (Wizard Step 1)
    restaurant_type   TEXT NOT NULL DEFAULT 'FineDining'
                      CHECK (restaurant_type IN (
                          'FineDining', 'CasualDining', 'Cafe', 'QSR',
                          'CloudKitchen', 'PubBar', 'Bakery'
                      )),
    cuisine_type      TEXT DEFAULT 'MultiCuisine',
    logo_url          TEXT,
    brand_theme       TEXT NOT NULL DEFAULT 'amber'
                      CHECK (brand_theme IN ('amber', 'emerald', 'cobalt', 'crimson')),

    -- Business Information (Wizard Step 2)
    gstin             TEXT,
    fssai_license     TEXT,
    phone             TEXT,
    email             TEXT,
    timezone          TEXT NOT NULL DEFAULT 'Asia/Kolkata',

    -- Operating Configuration (Wizard Step 3)
    order_prefix      TEXT NOT NULL DEFAULT 'ORD-',
    bill_prefix       TEXT NOT NULL DEFAULT 'INV-',
    opening_time      TIME NOT NULL DEFAULT '10:00',
    closing_time      TIME NOT NULL DEFAULT '23:00',
    fiscal_start_month INTEGER NOT NULL DEFAULT 4
                      CHECK (fiscal_start_month BETWEEN 1 AND 12),

    -- Metadata
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Fix 4: Secure First-Login PIN Strategy

**Problem:** Fake bcrypt hash never matches any PIN.

**Design:**
1. Do NOT create a PIN during provisioning. Owner staff is created without a PIN entry.
2. Force PIN creation during Setup Wizard Step 6.
3. Update `validate_restaurant_readiness_rpc` to check for "owner with PIN."

**Backward Compatibility:** No existing valid PINs are affected.

---

### Fix 5: Multi-Branch Support

**Problem:** `UNIQUE(tenant_id)` on `restaurants` limits each tenant to 1 restaurant.

**Design:**
```sql
ALTER TABLE public.restaurants
    DROP CONSTRAINT IF EXISTS unique_tenant_restaurant;

ALTER TABLE public.restaurants
    ADD CONSTRAINT unique_tenant_restaurant_name UNIQUE (tenant_id, name);
```

Update `provision_restaurant_rpc` to:
- Accept optional `p_tenant_id UUID DEFAULT NULL` for adding branches.
- Include idempotency guard: check existing before inserting.

**Backward Compatibility:** Existing single-restaurant tenants continue to work.

---

### Fix 6: Floor-to-Table Linkage

**Problem:** `restaurant_tables` has no `floor_id` column.

**Design:**
```sql
ALTER TABLE public.restaurant_tables
    ADD COLUMN IF NOT EXISTS floor_id UUID
    REFERENCES public.restaurant_floors(id) ON DELETE SET NULL;

ALTER TABLE public.restaurant_tables
    ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 4
    CHECK (capacity > 0);
```

Backfill existing tables with floor assignments based on naming convention.

**Backward Compatibility:** `floor_id` is nullable. Existing tables remain valid.

---

### Fix 7: RLS `WITH CHECK` Clauses

**Problem:** All `FOR ALL` RLS policies lack `WITH CHECK`, allowing cross-tenant INSERT.

**Design:** For every `FOR ALL` policy, add `WITH CHECK`:

```sql
CREATE POLICY <policy_name> ON <table>
    FOR ALL
    USING (tenant_id::text = public.get_jwt_claim('tenant_id'))
    WITH CHECK (tenant_id::text = public.get_jwt_claim('tenant_id'));
```

**Tables affected:** All M2 and M3 canonical restaurant tables.

**Backward Compatibility:** Only blocks cross-tenant writes. Legitimate operations unaffected.

---

### Fix 8: RPC Authorization Checks

**Problem:** Any authenticated user can call provisioning RPCs.

**Design:**

| RPC | Required Caller |
|-----|----------------|
| `provision_restaurant_rpc` | `service_role` only |
| `seed_demo_restaurant_rpc` | `service_role` only |
| `validate_restaurant_readiness_rpc` | Authenticated user with matching `tenant_id` |

**Backward Compatibility:** Production calls already use service_role. Only blocks unauthorized access.

---

### Fix 9: Immutable Provisioning Audit Events

**Problem:** `provisioning_audit_events` can be updated and deleted via RLS.

**Design:** Replace existing policies with immutable pattern:
- SELECT: tenant-scoped read
- INSERT: tenant-scoped write
- UPDATE: DENY (`USING (false)`)
- DELETE: DENY (`USING (false)`)

---

### Fix 10: Schema Ownership Documentation

**Design:** Add `COMMENT ON TABLE` to every canonical and legacy table, establishing clear ownership boundaries.

---

## 3. Supplementary Fixes

### 3A: Missing CHECK Constraints
- `restaurant_settings.cgst_pct >= 0`
- `restaurant_settings.sgst_pct >= 0`
- `restaurant_settings.service_charge_pct >= 0 AND <= 100`

### 3B: Missing Indexes
- `idx_prov_events_tenant(tenant_id, created_at DESC)`
- `idx_floors_tenant(tenant_id)`
- `idx_profiles_tenant(tenant_id)`
- `idx_profiles_status(status)`
- `idx_tables_floor(floor_id) WHERE floor_id IS NOT NULL`

### 3C: Provisioning Idempotency
- Accept optional `p_idempotency_key`.
- Check existing before inserting.
- Use `UNIQUE(tenant_id, name)` as concurrency-safe guard.

---

## 4. ER Diagram After Remediation

```mermaid
erDiagram
    tenants ||--o{ restaurants : "1:N multi-branch"
    restaurants ||--|| restaurant_profiles : "1:1 extension"
    restaurants ||--|| restaurant_feature_flags : "1:1 extension"
    restaurants ||--|| restaurant_settings : "1:1 extension"
    restaurants ||--o{ restaurant_floors : "1:N"
    restaurants ||--o{ restaurant_tables : "1:N"
    restaurants ||--o{ restaurant_staff : "1:N"
    restaurants ||--o{ restaurant_terminals : "1:N"
    restaurants ||--o{ provisioning_audit_events : "1:N"
    restaurant_floors ||--o{ restaurant_tables : "1:N via floor_id"
    restaurant_staff ||--o| restaurant_staff_pins : "1:0..1"
    restaurant_terminals ||--|| terminal_sessions : "1:1"
    restaurants ||--o{ auth_audit_logs : "1:N"
    restaurants ||--o{ restaurant_table_sessions : "1:N"
    restaurant_tables ||--o{ restaurant_table_sessions : "1:N"
    restaurants ||--o{ restaurant_orders : "1:N"
    restaurants ||--o{ restaurant_bills : "1:N"
    restaurants ||--o{ menu_categories : "1:N"
    menu_categories ||--o{ menu_items : "1:N"

    tenants {
        uuid id PK
        text name
        text slug UK
        text plan
        text status
    }

    restaurants {
        uuid id PK
        uuid tenant_id FK
        text name
        text address
        text currency
        boolean is_active
    }

    restaurant_profiles {
        uuid restaurant_id PK_FK
        uuid tenant_id FK
        text status
        integer wizard_step
        boolean wizard_completed
        text restaurant_type
        text cuisine_type
        text logo_url
        text brand_theme
        text gstin
        text fssai_license
        text phone
        text email
        text timezone
        text order_prefix
        text bill_prefix
        time opening_time
        time closing_time
        integer fiscal_start_month
    }

    restaurant_floors {
        uuid id PK
        uuid tenant_id FK
        uuid restaurant_id FK
        text name
        integer display_order
        boolean is_active
    }

    restaurant_tables {
        uuid id PK
        uuid tenant_id FK
        uuid restaurant_id FK
        uuid floor_id FK
        text table_number
        integer capacity
        boolean is_active
    }

    restaurant_staff {
        uuid id PK
        uuid tenant_id FK
        uuid restaurant_id FK
        text name
        text role
        boolean is_active
    }
```

---

## 5. Data Migration Strategy

### 5.1 Demo Data Role Corrections

| Staff | UUID | Current Role | Target Role |
|-------|------|-------------|-------------|
| Suresh Mehta | `eabf167a-6fea-4331-81a3-0bc87ee54f5e` | `waiter` | `manager` |
| Rajesh Kumar | `a5b835e8-9cf8-4944-b0da-0d111f329a23` | `waiter` | `waiter` (unchanged) |
| Anita Roy | `c4d5e6f7-8901-2345-6789-0123456789ab` | `kitchen` | `cashier` |

### 5.2 `restaurant_profiles` Backfill

Every existing restaurant gets a profile with `status = 'Setup Pending'`.

### 5.3 Floor-to-Table Backfill

Tables linked to floors by naming convention (`T-*` → Main Hall, `P-*` → Terrace, `VIP-*` → VIP Lounge).

---

## 6. Rollback Strategy

### 6.1 Non-Destructive Guarantees

- No tables are dropped
- No columns are dropped
- No data is deleted
- All new columns have defaults or are nullable
- Role constraint expansion is additive (old values remain valid)

### 6.2 Emergency Rollback Steps

1. Role Constraint: Re-add original constraint
2. `restaurant_profiles`: `DROP TABLE`
3. `floor_id` / `capacity`: `ALTER TABLE ... DROP COLUMN`
4. `unique_tenant_restaurant`: Re-add `UNIQUE(tenant_id)`
5. RPCs: Re-run original migration SQL

### 6.3 Risk Level

| Change | Risk |
|--------|------|
| Role constraint expansion | **Low** |
| `search_path` pinning | **None** |
| `restaurant_profiles` table | **Low** |
| PIN strategy change | **Low** |
| Multi-branch constraint | **Medium** |
| `floor_id` / `capacity` columns | **Low** |
| RLS WITH CHECK | **Low** |
| RPC authorization | **Low** |
| Audit immutability | **None** |
| Table comments | **None** |

---

## 7. Compatibility Analysis

### M2 Authentication
- Terminal Pairing: Unaffected
- Staff PIN Login: Improved (real roles)
- Manager Elevation: Fixed (`'owner'` and `'manager'` now exist)
- Auto-Lock: Unaffected
- Audit Logs: Unaffected

### M3 Provisioning
- Provisioning RPC: Redesigned with idempotency, authorization, correct roles
- Setup Wizard: Enabled by `restaurant_profiles.wizard_step`
- Readiness Check: Strengthened with owner-specific check
- Demo Seeder: Updated with correct roles

### M4–M15 Future
- M4 Settings: Unblocked by `restaurant_profiles`
- M6 Floor/Table: Unblocked by `floor_id`
- M7 Sessions: Unblocked by role expansion
- M8 POS through M15: All canonical tables ready

---

## 8. Verification Plan

### 8.1 Post-Migration Checks

1. Verify `restaurant_staff_role_check` allows all 7 roles
2. Verify `restaurant_profiles` table exists with all columns
3. Verify `floor_id` and `capacity` on `restaurant_tables`
4. Verify `unique_tenant_restaurant` dropped, `unique_tenant_restaurant_name` exists
5. Verify all CHECK constraints on `restaurant_settings`
6. Call `provision_restaurant_rpc` → owner created with `role = 'owner'`
7. Call again with same names → idempotency (no duplicate)
8. Verify `restaurant_profiles` created with `status = 'Setup Pending'`
9. Verify no PIN created during provisioning
10. Verify `seed_demo_restaurant_rpc` → correct roles
11. Verify all SECURITY DEFINER functions have `SET search_path`
12. Verify provisioning RPCs reject non-service_role callers
13. Verify RLS `WITH CHECK` clauses present
14. Verify audit events deny UPDATE/DELETE
15. `npx tsc --noEmit` — zero errors
16. `npm run build` — passes

### 8.2 Re-run Production Review Gate

Generate `M3_DATABASE_REVIEW_GATE_v2.md` with target score >= 85/100.

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `ALTER TABLE` fails due to ownership | Medium | High | Supabase migrations run as postgres |
| Demo data role update mismatches | Low | Medium | Use exact hardcoded UUIDs |
| Multi-branch constraint drop creates duplicates | Low | Medium | `UNIQUE(tenant_id, name)` replacement |
| `search_path` change breaks resolution | Very Low | High | `public` is already default schema |
| RLS `WITH CHECK` blocks legitimate writes | Very Low | Medium | All writes use matching tenant_id |

---

## 10. Migration Execution Order

```
 1. Expand restaurant_staff role constraint
 2. Create restaurant_profiles table + RLS + indexes
 3. Add floor_id and capacity to restaurant_tables
 4. Drop unique_tenant_restaurant, add unique_tenant_restaurant_name
 5. Add CHECK constraints to restaurant_settings
 6. Add missing indexes
 7. Re-create all SECURITY DEFINER RPCs with search_path pinning
 8. Redesign provision_restaurant_rpc (auth + idempotency + profiles + correct roles)
 9. Redesign validate_restaurant_readiness_rpc (owner-specific checks)
10. Redesign seed_demo_restaurant_rpc (correct roles + profiles)
11. Fix RLS policies with WITH CHECK clauses
12. Make provisioning audit events immutable
13. Add schema ownership comments
14. Backfill data migrations (profiles, floor linkage, role corrections)
```

---

## 11. Acceptance Criteria

- [ ] All 10 Priority A fixes applied
- [ ] All supplementary fixes applied
- [ ] Zero TypeScript compilation errors
- [ ] Zero lint errors
- [ ] Verification script passes 100%
- [ ] Re-run Production Review Gate scores >= 85/100
- [ ] No critical blockers remain
- [ ] Existing demo data works after migration
- [ ] Provisioning creates restaurants with correct roles and lifecycle state
- [ ] Multi-branch provisioning works
