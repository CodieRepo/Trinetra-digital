# Milestone 3 — Production Database Review Gate

**Auditor Role:** Principal Database Architect  
**Date:** 2026-08-05  
**Migration Under Review:** [`0017_restaurant_provisioning_system.sql`](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/supabase/migrations/0017_restaurant_provisioning_system.sql)  
**Full Schema Context:** Migrations 0001–0017 (19 files)  
**Specification:** [M3_RESTAURANT_PROVISIONING_SPEC.md v1.1.0](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/milestones/M3_RESTAURANT_PROVISIONING_SPEC.md)

---

## Verdict: ❌ CONDITIONAL FAIL — 7 Critical Issues Must Be Fixed Before Phase 2

---

## Critical Issues Found

### 🔴 CRITICAL-1: `restaurant_staff.role` CHECK Constraint Mismatch

> **The owner of a provisioned restaurant is being inserted with role `'waiter'` instead of `'owner'`.**

**Root Cause:** Migration `0008_restaurant_module.sql` defines `restaurant_staff.role` with `CHECK (role IN ('kitchen', 'waiter'))`. Migration `0016` does **not** ALTER this constraint. The provisioning RPC was forced to use `'waiter'` as a workaround because `'owner'` violates the constraint.

**Impact:**
- The restaurant owner has no distinguishing role in the database.
- The readiness check (`validate_restaurant_readiness_rpc`) checks for "any active staff" instead of "an owner or manager" — because `'owner'` cannot exist.
- The demo seeder inserts `'Suresh Mehta'` as `'waiter'` instead of `'manager'` and `'Anita Roy'` as `'kitchen'` instead of `'cashier'`.
- The AGENTS.md-specified 7 roles (`owner`, `manager`, `cashier`, `waiter`, `kitchen`, `inventory`, `accountant`) cannot be stored.
- **Manager Elevation** (`request_manager_elevation_rpc` in 0016) checks for `role IN ('admin', 'manager')` — neither `'admin'` nor `'owner'` can exist.

**Required Fix:** Create migration `0018_provisioning_remediation.sql`:
```sql
-- Must be run by table owner (postgres role) or via SECURITY DEFINER
ALTER TABLE public.restaurant_staff DROP CONSTRAINT IF EXISTS restaurant_staff_role_check;
ALTER TABLE public.restaurant_staff
  ADD CONSTRAINT restaurant_staff_role_check
  CHECK (role IN ('owner', 'manager', 'cashier', 'waiter', 'kitchen', 'inventory', 'accountant'));
```

> **NOTE:** This ALTER TABLE requires the `postgres` role (table owner). If we cannot run it as `postgres`, we need a privileged migration path or Supabase Dashboard SQL execution.

---

### 🔴 CRITICAL-2: `provision_restaurant_rpc` Is NOT Idempotent

**Problem:** Calling `provision_restaurant_rpc` twice with the same `p_tenant_name` and `p_restaurant_name` creates **duplicate tenants and duplicate restaurants**. There is no uniqueness guard.

**Impact:**
- Concurrent API requests or retries can create orphan tenants.
- No way to detect "restaurant already exists for this name."
- Violates the specification's "Zero Partial State Rule."

**Required Fix:** Add idempotency guard:
```sql
-- Option A: Add UNIQUE constraint on tenants
ALTER TABLE public.tenants ADD CONSTRAINT unique_tenant_name UNIQUE (name);

-- Option B: Use SELECT-before-INSERT pattern in the RPC
-- Check if tenant+restaurant already exists, return existing IDs if so.
```

---

### 🔴 CRITICAL-3: SECURITY DEFINER RPCs Missing `search_path` Pinning

> **All 3 SECURITY DEFINER RPCs are vulnerable to search_path injection attacks.**

**Problem:** None of the SECURITY DEFINER functions set `SET search_path = public, pg_temp`. A malicious actor could create objects in a schema that appears earlier in `search_path`, hijacking function calls.

**PostgreSQL Security Advisory:** [CVE-2018-1058](https://wiki.postgresql.org/wiki/A_Guide_to_CVE-2018-1058:_Protect_Your_Search_Path)

**Required Fix:** Add to all 3 RPCs:
```sql
CREATE OR REPLACE FUNCTION public.provision_restaurant_rpc(...)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ADD THIS
AS $$ ... $$;
```

This also affects the 5 SECURITY DEFINER RPCs in migration `0016`.

---

### 🔴 CRITICAL-4: `restaurants` Table Missing Spec-Required Columns

**Problem:** The M3 specification requires these columns on `public.restaurants`:

| Column | Purpose | Status |
|--------|---------|--------|
| `status` | 7-state lifecycle (`Provisioning`→`Archived`) | ❌ MISSING |
| `wizard_step` | Resume wizard (1–8) | ❌ MISSING |
| `wizard_completed` | Boolean flag | ❌ MISSING |
| `wizard_completed_at` | Completion timestamp | ❌ MISSING |
| `wizard_version` | Schema version (`v1.1`) | ❌ MISSING |
| `restaurant_type` | `FineDining`, `Cafe`, etc. | ❌ MISSING |
| `cuisine_type` | `MultiCuisine`, etc. | ❌ MISSING |
| `logo` | Brand image URL | ❌ MISSING |
| `brand_theme` | Theme color | ❌ MISSING |
| `gstin` | Tax ID | ❌ MISSING |
| `fssai_license` | Food license | ❌ MISSING |
| `phone` | Contact | ❌ MISSING |
| `email` | Contact | ❌ MISSING |
| `timezone` | Operational TZ | ❌ MISSING |
| `order_prefix` | e.g., `ORD-` | ❌ MISSING |
| `bill_prefix` | e.g., `INV-2026-` | ❌ MISSING |
| `opening_time` | Operating hours | ❌ MISSING |
| `closing_time` | Operating hours | ❌ MISSING |
| `fiscal_start_month` | Accounting year | ❌ MISSING |

**Root Cause:** The `restaurants` table is owned by `postgres` (created in 0007), and the migration runs as `trinetra_app` which cannot ALTER the table.

**Impact:**
- The Setup Wizard (Steps 1–3) has no columns to write to.
- The 7-state lifecycle cannot be tracked.
- Wizard resume is impossible.
- The `provision_restaurant_rpc` returns `'status': 'Setup Pending'` but this is a JSONB fiction — the actual table row has no `status` column.

**Required Fix:** Two options:

**Option A (Preferred):** Create a separate `restaurant_profiles` table owned by `trinetra_app`:
```sql
CREATE TABLE public.restaurant_profiles (
    restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Provisioning'
        CHECK (status IN ('Provisioning','Setup Pending','Ready','Operational','Maintenance','Suspended','Archived')),
    restaurant_type TEXT NOT NULL DEFAULT 'FineDining'
        CHECK (restaurant_type IN ('FineDining','CasualDining','Cafe','QSR','CloudKitchen','PubBar','Bakery')),
    cuisine_type TEXT DEFAULT 'MultiCuisine',
    logo TEXT,
    brand_theme TEXT DEFAULT 'amber',
    gstin TEXT,
    fssai_license TEXT,
    phone TEXT,
    email TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    order_prefix TEXT DEFAULT 'ORD-',
    bill_prefix TEXT DEFAULT 'INV-',
    opening_time TIME DEFAULT '10:00',
    closing_time TIME DEFAULT '23:00',
    fiscal_start_month INTEGER DEFAULT 4 CHECK (fiscal_start_month BETWEEN 1 AND 12),
    wizard_step INTEGER NOT NULL DEFAULT 1 CHECK (wizard_step BETWEEN 1 AND 8),
    wizard_completed BOOLEAN NOT NULL DEFAULT false,
    wizard_completed_at TIMESTAMPTZ,
    wizard_version TEXT NOT NULL DEFAULT 'v1.1',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Option B:** Execute ALTER TABLE via Supabase Dashboard SQL (runs as `postgres`).

---

### 🔴 CRITICAL-5: `provision_restaurant_rpc` Uses Hardcoded Fake PIN Hash

**Problem:** Line 210:
```sql
v_pin_hash := '$2b$10$3euPzD15cO.w.aU9.w.aUe8v/9v/9v/9v/9v/9v/9v/9v/9v/9v/9v/';
```

This is **not a valid bcrypt hash** of any PIN. It's a fabricated string. Any PIN verification against this hash will fail.

**Impact:**
- The owner created by provisioning can **never log in** via PIN.
- The `verify_staff_pin_rpc` compares actual bcrypt hashes — this fake hash will never match.
- First-login flow is broken.

**Required Fix:** Either:
1. Accept the PIN as a parameter and hash it in the RPC using `crypt(p_pin, gen_salt('bf'))` (requires pgcrypto).
2. Or leave PIN unset and force PIN creation via the Setup Wizard (Step 6).

Recommended approach:
```sql
-- In provision_restaurant_rpc, replace fake hash with actual bcrypt:
v_pin_hash := crypt('0000', gen_salt('bf'));  -- Temp PIN, force change on first login
```

---

### 🟠 CRITICAL-6: Duplicate Tables Across Migrations (Schema Confusion)

**Problem:** Two different sets of restaurant-related tables exist:

| 0007/0008 Tables | 0016 Tables | Conflict |
|------------------|-------------|----------|
| `table_sessions` (0007) | `terminal_sessions` (0016) | Different models |
| `orders` (0007) | `restaurant_orders` (0008) | Duplicate order tables |
| `order_items` (0007) | `restaurant_order_items` (0008) | Duplicate order item tables |
| `invoices` (0009b) | `restaurant_bills` (0009b) | Both billing tables exist |

**Impact:** It's unclear which tables the Restaurant OS should use. The 0007/0008 migration created restaurant tables as part of a CRM module, and 0008 created restaurant-specific versions. Both sets exist in the live database.

**Required Fix:** This is a known tech debt. Document explicitly which tables are canonical for Restaurant OS. For Milestone 3, the provisioning RPC should only seed canonical tables.

---

### 🟠 CRITICAL-7: `restaurant_tables` Missing `floor_id` and `capacity` Columns

**Problem:** The M3 spec requires tables to be linked to floors:
- Step 4 (Dining Configuration): Table → Floor association
- `restaurant_floors` table was created but `restaurant_tables` has no `floor_id` FK

**Impact:**
- Tables cannot be assigned to floors.
- The floor layout feature is incomplete.
- POS table view cannot group tables by floor.

**Required Fix:** ALTER `restaurant_tables` to add:
```sql
ALTER TABLE public.restaurant_tables ADD COLUMN floor_id UUID REFERENCES public.restaurant_floors(id) ON DELETE SET NULL;
ALTER TABLE public.restaurant_tables ADD COLUMN capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0);
```

Again, this requires `postgres` ownership. Alternative: add via Supabase Dashboard SQL or create a `restaurant_table_assignments` join table.

---

## Detailed Audit Across 20 Areas

### 1. Schema Normalization (3NF)

**Score: 7/10**

- ✅ `restaurant_feature_flags` properly separated from `restaurants` (1:1, extension table pattern).
- ✅ `restaurant_settings` properly separated (tax config isolated).
- ✅ `restaurant_floors` properly normalized (1:N from restaurants).
- ✅ `provisioning_audit_events` follows event sourcing pattern.
- ❌ Restaurant profile data (wizard state, branding, business info) should be in a separate table but is entirely absent.
- ❌ The `tenant_id` column is denormalized across every table for RLS performance — acceptable trade-off, but increases write surface.

### 2. Foreign Key Correctness

**Score: 9/10**

- ✅ All 4 new tables have correct FK references to `restaurants(id)` and `tenants(id)`.
- ✅ FK directions are correct (child → parent).
- ❌ `provisioning_audit_events.triggered_by` has no FK constraint — it should reference `restaurant_staff(id)` or at minimum document why it's untyped.

### 3. Cascade / Restrict / Set Null Decisions

**Score: 8/10**

- ✅ All child tables use `ON DELETE CASCADE` from `restaurants` — correct for provisioning (delete restaurant = delete all children).
- ✅ All child tables use `ON DELETE CASCADE` from `tenants` — correct for tenant deletion.
- ⚠️ `provisioning_audit_events` using CASCADE from restaurants means deleting a restaurant erases its provisioning audit trail. For compliance (`Archived` state), consider `ON DELETE RESTRICT` or `SET NULL`.

### 4. Composite Indexes and Query Performance

**Score: 8/10**

- ✅ `idx_feature_flags_tenant(tenant_id)` — covers RLS filter.
- ✅ `idx_settings_tenant(tenant_id)` — covers RLS filter.
- ✅ `idx_floors_restaurant(restaurant_id, display_order)` — covers floor listing query.
- ✅ `idx_prov_events_restaurant(restaurant_id, created_at DESC)` — covers audit log pagination.
- ❌ Missing: `idx_prov_events_tenant(tenant_id, created_at DESC)` for tenant-level audit queries.
- ❌ Missing: `idx_floors_tenant(tenant_id)` for RLS-filtered floor queries.

### 5. RLS Correctness and Possible Tenant Leaks

**Score: 6/10**

> ⚠️ **Duplicate RLS policies create unpredictable behavior.**

Each new table has BOTH a `SELECT` policy AND an `ALL` policy with identical `USING` clauses. PostgreSQL RLS evaluates policies with OR logic within the same operation. For SELECT operations, both `feature_flags_select_policy` and `feature_flags_all_policy` apply — this is redundant but not harmful.

However:
- ❌ The `ALL` policy covers INSERT, UPDATE, DELETE but lacks `WITH CHECK` clauses. This means:
  - A user could INSERT a row with a **different tenant_id** (their own JWT tenant_id would pass the USING clause on the existing rows, but the new row's tenant_id is not validated).
  - Fix: Add `WITH CHECK (tenant_id::text = public.get_jwt_claim('tenant_id'))` to all `ALL` policies.
- ❌ The provisioning audit events table has a separate `INSERT` policy but the `SELECT` policy alone doesn't prevent UPDATE/DELETE via the missing `ALL` policy path.
- ⚠️ `provisioning_audit_events` should be **immutable** (insert-only). Add explicit `FOR UPDATE USING (false)` and `FOR DELETE USING (false)` policies.

### 6. RPC Security

**Score: 5/10**

> ⚠️ Multiple security concerns.

- ❌ **Missing `SET search_path`** on all 3 RPCs (CRITICAL-3 above).
- ❌ **No authorization check** in `provision_restaurant_rpc` — anyone who can call the function can create tenants. Should verify the caller has Super Admin rights.
- ❌ **No authorization check** in `seed_demo_restaurant_rpc` — callable by any authenticated user.
- ❌ **No authorization check** in `validate_restaurant_readiness_rpc` — though read-only, it leaks configuration state.
- ⚠️ `SECURITY DEFINER` runs as the function owner, bypassing all RLS. This is correct for provisioning but must be tightly scoped.

### 7. Transaction Rollback Guarantees

**Score: 8/10**

- ✅ PL/pgSQL functions run in an implicit transaction — all INSERTs succeed or all fail.
- ✅ `EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION` properly re-raises, causing transaction abort.
- ⚠️ The exception handler catches ALL errors and re-raises with a generic message. Consider logging the original error details in the audit table before re-raising.
- ⚠️ `seed_demo_restaurant_rpc` uses `ON CONFLICT ... DO UPDATE` which won't roll back — it's idempotent by design. Correct.

### 8. Race Conditions and Concurrent Provisioning

**Score: 5/10**

- ❌ **No advisory lock or mutex** for provisioning. Two concurrent calls create two tenants.
- ❌ No `UNIQUE` constraint on `tenants.name` or `restaurants.name` within a tenant.
- ❌ The `unique_tenant_restaurant` constraint on `restaurants(tenant_id)` from migration 0008 limits each tenant to ONE restaurant — this blocks multi-branch architecture!
- Fix: The `unique_tenant_restaurant` constraint must be dropped to allow multiple restaurants per tenant.

### 9. Multi-Tenant Isolation

**Score: 8/10**

- ✅ Every new table includes `tenant_id` column.
- ✅ RLS policies filter by `tenant_id` from JWT claims.
- ✅ SECURITY DEFINER RPCs create all records with consistent `tenant_id`.
- ❌ RLS `WITH CHECK` gap (see #5 above).
- ❌ The RPCs have no caller authorization — a user from Tenant A could call `provision_restaurant_rpc` and create a new Tenant B.

### 10. Multi-Branch Compatibility

**Score: 4/10**

> ⚠️ **The existing `UNIQUE (tenant_id)` constraint on `restaurants` prevents multi-branch.**

- ❌ Migration 0008 defines `CONSTRAINT unique_tenant_restaurant UNIQUE (tenant_id)` on `public.restaurants`. This means each tenant can have exactly ONE restaurant. Multi-branch is blocked.
- ❌ The provisioning RPC creates a new tenant for each restaurant. Multi-branch should create multiple restaurants under ONE tenant.
- Fix: Drop the unique constraint and redesign provisioning to accept an optional `p_tenant_id` for adding branches.

### 11. Future Compatibility with Milestones 4–15

**Score: 6/10**

- ✅ Feature flags table can gate modules for M5 (Menu), M8 (POS), M9 (KDS), etc.
- ✅ Settings table supports M10 (Billing) tax configuration.
- ✅ Floors table supports M6 (Floor & Table Management).
- ❌ Missing `restaurant_profiles` blocks M4 (Restaurant Settings).
- ❌ Missing `floor_id` on tables blocks M6.
- ❌ Role constraint blocks M7 (Customer Sessions) and M8 (POS) staff assignment.

### 12. Naming Consistency

**Score: 7/10**

- ✅ All new tables follow `restaurant_` prefix convention.
- ✅ Columns use consistent `snake_case`.
- ⚠️ `provisioning_audit_events` vs `auth_audit_logs` (0016) — inconsistent naming for audit tables.
- ⚠️ `cgst_pct` / `sgst_pct` vs `tax_rate` (0013) — duplicate tax columns in different tables.
- ⚠️ `updated_at` present on some tables but not `restaurant_floors`.

### 13. Soft Delete vs Hard Delete Strategy

**Score: 6/10**

- ✅ `restaurant_floors.is_active` supports soft-disable.
- ❌ No `deleted_at` column on any new table.
- ❌ Provisioning audit events use hard CASCADE delete from restaurants — should be retained for compliance.
- ⚠️ No soft-delete strategy documented. Some existing tables (`leads`) use `deleted_at`, but restaurant tables don't.

### 14. Audit Log Completeness

**Score: 6/10**

- ✅ `provisioning_audit_events` captures `restaurant.created` event.
- ❌ No `restaurant.activated` event logged.
- ❌ No `wizard.step_completed` event logged per wizard step.
- ❌ No `settings.updated` event logged.
- ❌ No `feature_flags.updated` event logged.
- ❌ `triggered_by` column has no FK — could contain invalid UUIDs.

### 15. Seed Strategy Correctness

**Score: 7/10**

- ✅ Tri-layer separation is architecturally sound.
- ✅ Default floors (3) and tables (7) are reasonable defaults.
- ✅ Default tax rates (CGST 2.5%, SGST 2.5%) are correct for India.
- ❌ Default tables are not linked to floors (no `floor_id`).
- ❌ Owner staff is created with role `'waiter'` (CRITICAL-1).
- ❌ PIN hash is fake (CRITICAL-5).

### 16. DemoSeeder Isolation from Production

**Score: 8/10**

- ✅ Uses deterministic hardcoded UUIDs — won't collide with `gen_random_uuid()`.
- ✅ Uses `ON CONFLICT ... DO UPDATE` — idempotent and safe to re-run.
- ❌ No guard preventing DemoSeeder from being called in production. Should check environment or require a flag.
- ❌ Demo staff roles are incorrect (`'waiter'` instead of `'manager'`, `'kitchen'` instead of `'cashier'`).

### 17. Wizard Resume Logic

**Score: 1/10**

> ⚠️ **Wizard resume is completely unimplemented at the database level.**

- ❌ No `wizard_step` column exists on any table.
- ❌ No `wizard_completed` flag exists.
- ❌ No `wizard_version` tracking exists.
- ❌ The `provision_restaurant_rpc` returns `wizard_step: 1` in JSONB but this is ephemeral — not persisted.

### 18. Feature Flags Architecture

**Score: 8/10**

- ✅ 9 boolean flags covering all current and planned modules.
- ✅ Sensible defaults (POS/KDS/Inventory/Billing/CRM enabled, QR/Reservations/Loyalty/AI disabled).
- ✅ 1:1 relationship with restaurants.
- ⚠️ Missing `created_at` column for audit trail.
- ⚠️ No `updated_by` column to track who changed flags.

### 19. Restaurant Lifecycle Transitions

**Score: 1/10**

> ⚠️ **Lifecycle state machine is completely unimplemented.**

- ❌ No `status` column on `restaurants` or any profile table.
- ❌ No CHECK constraint enforcing the 7 valid states.
- ❌ No state transition validation function.
- ❌ No audit logging for state transitions.

### 20. Readiness Validation Coverage

**Score: 6/10**

- ✅ 6 checks implemented (branch, owner, settings, pins, floors, tables).
- ❌ `has_owner` check weakened to "any active staff" instead of "owner or manager role."
- ❌ Missing `has_menu` check (noted as future but should be flagged).
- ❌ Missing `has_terminal` check.
- ❌ No check for wizard completion state.
- ❌ No check for restaurant status being in correct state for transition.

---

## Explicit Questions — Answers

### Can any tenant access another tenant's data?

**Partially yes.** The RLS `ALL` policies lack `WITH CHECK` clauses. A tenant could theoretically INSERT a row with a different `tenant_id` into `restaurant_feature_flags`, `restaurant_settings`, or `restaurant_floors`. The USING clause only filters reads, not writes to new rows.

**Fix:** Add `WITH CHECK` to all `ALL` policies.

### Can provisioning leave orphan records?

**No, within a single RPC call.** PL/pgSQL implicit transactions ensure atomicity. However, if a partial provisioning is retried, it creates an entirely new duplicate set (see CRITICAL-2).

### Can the DemoSeeder affect production restaurants?

**No.** It uses hardcoded UUIDs and `ON CONFLICT DO UPDATE`. It will only modify the Spice Garden demo restaurant. However, there's no runtime guard preventing accidental invocation in production.

### Can two provisioning requests create duplicate restaurants?

**Yes.** No UNIQUE constraint on restaurant name per tenant. No idempotency key. Two concurrent requests will create two tenants and two restaurants.

### Are all RPCs idempotent where required?

- `seed_demo_restaurant_rpc` — ✅ Yes (uses ON CONFLICT).
- `provision_restaurant_rpc` — ❌ No. Creates new records every time.
- `validate_restaurant_readiness_rpc` — ✅ Yes (read-only).

### Are there any missing unique constraints?

| Table | Missing Constraint |
|-------|-------------------|
| `tenants` | `UNIQUE(name)` or `UNIQUE(slug)` — slug is unique but name is not |
| `restaurants` | Need `UNIQUE(tenant_id, name)` for multi-branch (after dropping `UNIQUE(tenant_id)`) |
| `provisioning_audit_events` | None needed (event log) |

### Are there any missing CHECK constraints?

| Table | Missing CHECK |
|-------|--------------|
| `restaurant_settings` | `CHECK (cgst_pct >= 0)`, `CHECK (sgst_pct >= 0)`, `CHECK (service_charge_pct >= 0 AND service_charge_pct <= 100)` |
| `restaurant_floors` | `CHECK (display_order > 0)` |
| `provisioning_audit_events` | `CHECK (event_name <> '')` |

### Are there any missing NOT NULL constraints?

| Table | Column | Issue |
|-------|--------|-------|
| `provisioning_audit_events` | `triggered_by` | Nullable — acceptable if system events have no actor |
| `restaurant_floors` | All critical columns covered | ✅ |

### Are there any missing indexes?

| Missing Index | Reason |
|---------------|--------|
| `idx_prov_events_tenant(tenant_id, created_at DESC)` | Tenant-scoped audit queries |
| `idx_floors_tenant(tenant_id)` | RLS filter performance |
| `idx_feature_flags_restaurant(restaurant_id)` | Already PK, but tenant queries need tenant index (exists) |

### Which tables are expected to grow the fastest?

1. **`provisioning_audit_events`** — Every provisioning action and lifecycle event creates rows. At 10K restaurants with 10 events each = 100K rows.
2. **`restaurant_floors`** — Moderate (3 per restaurant × 10K = 30K rows).
3. **`restaurant_feature_flags`** / **`restaurant_settings`** — Low (1:1 with restaurants).

### Which queries will become slow first?

1. **Audit event pagination** (`provisioning_audit_events` by `created_at DESC`) — mitigated by index.
2. **Cross-tenant admin queries** (Super Admin listing all restaurants) — no index supports this outside RLS.
3. **Readiness validation** running 6 EXISTS subqueries — acceptable until 100K+ rows per table.

### What should be partitioned in the future?

1. **`provisioning_audit_events`** — partition by `created_at` (monthly) after 1M+ rows.
2. **`auth_audit_logs`** (from M2) — same strategy.
3. **`restaurant_orders`** — partition by `restaurant_id` or `created_at` after high volume.

### Which parts may require redesign after 10,000 restaurants?

1. **RLS performance** — `get_jwt_claim()` parsing JSON on every row check may become slow. Consider caching or session variables.
2. **The `unique_tenant_restaurant` constraint** — must be dropped before multi-branch can work.
3. **Readiness validation** — 6 sequential EXISTS queries could be replaced with a single JOIN query.
4. **Feature flags as boolean columns** — at 20+ features, consider a JSONB column or a separate `feature_flag_entries` table with `(restaurant_id, feature_name, is_enabled)`.

---

## Remediation Plan

### Phase 1a: Immediate Fixes (Before Phase 2)

| # | Fix | Priority | Effort |
|---|-----|----------|--------|
| 1 | Fix `restaurant_staff.role` CHECK constraint to include all 7 roles | 🔴 Critical | Low |
| 2 | Add `SET search_path = public, pg_temp` to all SECURITY DEFINER RPCs (0016 + 0017) | 🔴 Critical | Low |
| 3 | Create `restaurant_profiles` table for wizard state, lifecycle, branding | 🔴 Critical | Medium |
| 4 | Fix PIN hash to use real `crypt()` or defer PIN creation | 🔴 Critical | Low |
| 5 | Add `WITH CHECK` to all RLS `ALL` policies | 🟠 High | Low |
| 6 | Add missing CHECK constraints on `restaurant_settings` | 🟡 Medium | Low |
| 7 | Drop `unique_tenant_restaurant` constraint for multi-branch | 🟠 High | Low |
| 8 | Add `floor_id` FK to `restaurant_tables` | 🟠 High | Medium |
| 9 | Make provisioning audit events immutable (deny UPDATE/DELETE RLS) | 🟡 Medium | Low |
| 10 | Add authorization checks to RPCs | 🟠 High | Medium |

### Phase 1b: Deferred Improvements (Can Wait for M4+)

| # | Improvement | Priority |
|---|-------------|----------|
| 1 | Implement state transition validation function | M4 |
| 2 | Add idempotency key to provisioning | M4 |
| 3 | Add `updated_by` / `created_by` audit columns | M4 |
| 4 | Document canonical tables vs legacy CRM tables | M4 |
| 5 | Add soft-delete strategy | M4 |

---

## Scores

| Category | Score | Notes |
|----------|-------|-------|
| **Architecture** | **62/100** | Solid table design, but missing spec-required columns (lifecycle, wizard, profiles). Multi-branch blocked. |
| **Security** | **52/100** | SECURITY DEFINER without search_path pinning. Missing RLS WITH CHECK. No authorization on RPCs. Fake PIN hash. |
| **Scalability** | **72/100** | Good indexing strategy. RLS function-call overhead is the main concern at scale. Partitioning path is clear. |
| **Maintainability** | **68/100** | Clean SQL, good naming, but duplicate table sets across migrations create confusion. Role constraint mismatch is a landmine. |
| **Production Readiness** | **38/100** | Cannot create a real owner. Cannot log in with provisioned PIN. Wizard state not persisted. Lifecycle not tracked. Multi-branch blocked. |

### Overall: **58/100 — NOT READY FOR PHASE 2**

---

## Gate Decision

> **GATE STATUS: ❌ FAIL**
> 
> 7 critical issues must be resolved before proceeding to Phase 2.
> The top 4 blockers are:
> 1. Staff role constraint (owner cannot exist)
> 2. Missing restaurant profiles/lifecycle table
> 3. SECURITY DEFINER search_path vulnerability
> 4. Fake PIN hash
> 
> **Once a remediation migration (0018) is applied and verified, this gate can be re-evaluated.**
