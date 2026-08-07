# Milestone 3 — Restaurant Provisioning & Settings Specification

**Document Version:** `v1.1.0` (Frozen Architecture Specification)  
**Status:** **SPECIFICATION COMPLETE & FROZEN — READY FOR APPROVAL**  
**Product Scope:** Trinetra Restaurant OS — Milestone 3: Provisioning, Setup Wizard, & Multi-Branch Architecture

---

## 1. Executive Summary & Provisioning Architecture

Trinetra Restaurant OS is an operating system for real restaurant operations. Restaurant provisioning is the foundation upon which Menu Management, Table & Floor Management, POS, Kitchen Display Systems (KDS), Inventory, Billing, and Reports operate.

The provisioning architecture must remain 100% independent, transactional, and resilient against partial failure.

### Provisioning Flow Architecture
```
Trinetra CRM Super Admin Portal / Self-Signup Engine
                        │
                        ▼
   Execute Atomic Provisioning RPC Transaction (BEGIN ... COMMIT)
                        │
                        ▼
   Create Tenant Record (public.tenants)
                        │
                        ▼
   Create Restaurant & Primary Branch (public.restaurants)
                        │
                        ▼
   Seed Tri-Layer Default Data (System Defaults + Restaurant Defaults)
                        │
                        ▼
   Generate Owner Credentials & Temporary Password
                        │
                        ▼
   Set Status: "Setup Pending"
                        │
                        ▼
   Owner First Login ➔ 8-Step Setup Wizard ➔ Terminal Pairing ➔ Status: "Operational"
```

---

## 2. Expanded Restaurant Lifecycle Status Model

To provide operational clarity, every restaurant location transitions through a strict 7-state lifecycle:

```
[ Provisioning ] ──► [ Setup Pending ] ──► [ Ready ] ──► [ Operational ]
                                                            │
                                  ┌─────────────────────────┼─────────────────────────┐
                                  ▼                         ▼                         ▼
                           [ Maintenance ]           [ Suspended ]              [ Archived ]
```

1. **`Provisioning`**: Atomic transaction in progress. Database tables, schema records, and default configurations are being created.
2. **`Setup Pending`**: Restaurant provisioned and owner credentials generated. Awaiting owner first-time login and completion of the 8-Step Setup Wizard.
3. **`Ready`**: Setup wizard completed, tax rules configured, staff PINs set, and initial floor/table layouts approved. Awaiting terminal pairing.
4. **`Operational`**: Hardware terminals paired, shifts open, active POS orders, KDS routing, and billing in progress.
5. **`Maintenance`**: Temporarily closed for inventory auditing, menu restructuring, or holiday maintenance. Hardware terminals remain paired but block new table sessions.
6. **`Suspended`**: Administratively paused due to billing hold or security alert. Terminal sessions revoked instantly.
7. **`Archived`**: Permanently closed or soft-deleted location. Data retained for fiscal, tax, and audit compliance.

---

## 3. 8-Step Restaurant Setup Wizard

The first-time owner login experience is a guided, touch-first 8-step setup wizard designed for speed and clarity:

### Step 1: Restaurant Identity
- **Restaurant Name**: Legal and public operating name.
- **Brand Logo & Favicon**: Image upload with automatic resolution optimization.
- **Brand Accent Color**: Theme customization (amber, emerald, cobalt, crimson).
- **Primary Phone & Support Email**: Operational contact details.

### Step 2: Business Information
- **GSTIN / Tax Identification Number**: Regional tax registration code.
- **FSSAI License Number**: Food safety regulatory license number.
- **Physical Address**: Street address, city, state, postal code, and country.
- **Timezone**: Operational timezone (Default: `Asia/Kolkata`).
- **Currency**: Primary billing currency (Default: `INR ₹`).

### Step 3: Operating Configuration
- **Opening & Closing Hours**: Shift windows (e.g. `10:00 AM – 11:00 PM`).
- **Order Number Prefix**: Daily order code prefix (e.g. `ORD-`).
- **Invoice / Bill Prefix**: Fiscal tax invoice prefix (e.g. `INV-2026-`).
- **Fiscal Year Cycle**: Accounting start month (Default: `April`).

### Step 4: Dining Configuration
- **Floor Creation**: Configure dining sections (`Main Hall`, `Terrace/Patio`, `VIP Lounge`).
- **Table Setup**: Define tables, capacities, and layout coordinates.
- **Table Numbering Format**: Prefix strategy (e.g. `T-1`, `P-1`, `VIP-1`).

### Step 5: Taxes & Charges
- **GST Rates**: Central GST (`2.5%`) + State GST (`2.5%`) = Total `5.0%`.
- **Service Charge**: Optional service charge percentage (`0.00%` – `10.00%`).
- **Tax Calculation Strategy**: Inclusive vs Exclusive item pricing models.

### Step 6: Staff & RBAC Setup
- **Staff Onboarding**: Invite managers, cashiers, waiters, and kitchen staff.
- **Role Assignment**: Assign one of 7 system roles (`Owner`, `Manager`, `Cashier`, `Waiter`, `Kitchen`, `Inventory`, `Accountant`).
- **PIN Configuration**: Set 4-6 digit numeric PINs for shared terminal login.

### Step 7: Terminal Pairing
- **Hardware Device Registration**: Pair POS tablets, Cashier terminals, and KDS displays using Milestone 2 hardware device pairing protocol.

### Step 8: Restaurant Ready
- **Validation Summary**: Final inspection of configuration.
- **Status Change**: Transitions status from `Setup Pending` to `Operational`.

---

## 4. Tri-Layer Default Data Architecture

To prevent architectural debt, system data is strictly separated into three distinct layers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          1. SYSTEM DEFAULTS                             │
│  Immutable system constants, RBAC roles, standard tax categories, etc.  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     v
┌─────────────────────────────────────────────────────────────────────────┐
│                        2. RESTAURANT DEFAULTS                           │
│  Seeded initial floor layout (Main Hall, Terrace, VIP), tables T-1..T-7 │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     v
┌─────────────────────────────────────────────────────────────────────────┐
│                           3. DEMO DATA                                  │
│  Programmatic versioned demo dataset for testing and sales demos        │
└─────────────────────────────────────────────────────────────────────────┘
```

1. **System Defaults**: Immutable platform structures (7 RBAC roles, standard tax types, system event definitions).
2. **Restaurant Defaults**: Seeded initial branch data created during provisioning (default floor layouts, default table capacities, default GST tax rates).
3. **Demo Data**: Programmatic demo dataset generated strictly via `DemoSeeder` (never hardcoded in application logic).

---

## 5. Programmatic Demo Seeder (`DemoSeeder`)

The "Spice Garden" Flagship Demo Restaurant is generated programmatically using a reusable, versioned `DemoSeeder` module:

- **Restaurant & Branch**: Spice Garden Fine Dining (`tenant_id: 1ab21b6e-d5ea-4395-81e4-ba2d06907194`, `restaurant_id: a3c3e5f7-36e7-4409-8a25-76e4f7f47213`).
- **Staff Members**: Suresh Mehta (`Manager`, PIN `9876`), Rajesh Kumar (`Waiter`, PIN `4321`), Anita Roy (`Cashier`, PIN `1122`).
- **Menu Items**: 25 realistic dishes with categories, modifiers (spice levels, extra cheese), and pricing.
- **Dining Layout**: 12 tables across Main Dining, Patio, and VIP Lounge.
- **Operational Data**: Active table sessions, sample KDS tickets, fiscal invoices, inventory stock levels, and historical analytics.

---

## 6. Multi-Branch & Multi-Tenant Expansion Architecture

Trinetra Restaurant OS supports seamless expansion from single-location restaurants to multi-branch enterprises:

```
                       ┌────────────────────────┐
                       │   Tenant Account (SaaS)│
                       │ (e.g. Royal Hospitality)│
                       └───────────┬────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌────────────────────────────────┐         ┌────────────────────────────────┐
│   Branch 1 (Indiranagar)       │         │    Branch 2 (Koramangala)      │
│                                │         │                                │
│ • Independent POS Terminals    │         │ • Independent POS Terminals    │
│ • Independent Shifts & Cash    │         │ • Independent Shifts & Cash    │
│ • Independent Kitchen KDS      │         │ • Independent Kitchen KDS      │
└────────────────┬───────────────┘         └────────────────┬───────────────┘
                 │                                          │
                 └────────────────────┬─────────────────────┘
                                      │
                                      v
                       ┌────────────────────────┐
                       │  Aggregated Enterprise │
                       │  Owner Analytics       │
                       └────────────────────────┘
```

- **Shared Owner Context**: One Owner identity manages multiple branch locations under a single Tenant UUID.
- **Independent Daily Operations**: Orders, active sessions, cash drawers, and KDS tickets operate with 100% branch isolation.
- **Aggregated Enterprise Reporting**: Owner dashboard rolls up multi-branch sales, inventory usage, and tax liabilities into unified reports.

---

## 7. Domain Provisioning Event Architecture

Every provisioning lifecycle event emits a structured domain event for audit logging, realtime webhooks, and automation:

| Event Name | Trigger | Payload |
| :--- | :--- | :--- |
| `restaurant.created` | Restaurant & tenant records provisioned | `tenant_id`, `restaurant_id`, `name`, `created_by` |
| `restaurant.activated` | Status updated to Operational | `tenant_id`, `restaurant_id`, `activated_at` |
| `restaurant.suspended` | Administrative hold applied | `tenant_id`, `restaurant_id`, `reason` |
| `branch.created` | Additional branch added to tenant | `tenant_id`, `branch_id`, `branch_name` |
| `owner.invited` | Owner credentials generated | `tenant_id`, `restaurant_id`, `owner_email` |
| `owner.accepted` | Owner completes first password reset | `tenant_id`, `restaurant_id`, `owner_id` |
| `wizard.completed` | 8-Step setup wizard finalized | `tenant_id`, `restaurant_id`, `completed_at` |
| `settings.updated` | Restaurant configuration modified | `tenant_id`, `restaurant_id`, `updated_fields` |

---

## 8. Transactional Provisioning & Rollback Strategy

Provisioning must be 100% atomic. If any step fails during provisioning, the entire transaction is rolled back immediately:

```sql
DO $$
BEGIN
    -- 1. Create Tenant
    INSERT INTO public.tenants (...) VALUES (...);
    
    -- 2. Create Restaurant Branch
    INSERT INTO public.restaurants (...) VALUES (...);

    -- 3. Seed Default Settings & Taxes
    INSERT INTO public.restaurant_settings (...) VALUES (...);

    -- 4. Seed Default Floors & Tables
    INSERT INTO public.restaurant_floors (...) VALUES (...);

    -- 5. Create Owner Staff Record
    INSERT INTO public.restaurant_staff (...) VALUES (...);

EXCEPTION WHEN OTHERS THEN
    -- Complete Rollback on Any Exception
    RAISE EXCEPTION 'Provisioning failed: %. Transaction rolled back.', SQLERRM;
END $$;
```

**Zero Partial State Rule**: No orphan tenants, no orphan branches, no orphan staff, and no unseeded settings will ever exist in the database.

---

## 9. Definition of Done for Milestone 3

Milestone 3 is complete ONLY when:

1. A brand-new restaurant can be created from scratch and reach **`Operational` ("Ready for Daily Operations")** status with **ZERO manual database intervention**.
2. The 8-Step Setup Wizard functions cleanly from identity configuration to hardware terminal pairing.
3. The programmatic `DemoSeeder` populates the "Spice Garden" demo restaurant flawlessly.
4. Database tables, RPC functions, Zod schemas, domain services, API route handlers, and UI components compile with **0 TypeScript or lint errors**.
5. The Milestone 3 Production Verification Gate passes with a 100% score.
