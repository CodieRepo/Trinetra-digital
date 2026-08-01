# Database Verification Report — Sprint 1

## Overview
This document records the database schema, foreign key, index, RLS policy, and PostgreSQL trigger verification for Trinetra Restaurant OS.

---

## 1. Schema & Table Audit

| Table Name | Status | Foreign Keys | RLS Status |
| :--- | :--- | :--- | :--- |
| `public.restaurants` | VERIFIED | `tenant_id` -> `tenants(id)` | Enabled |
| `public.restaurant_tables` | VERIFIED | `restaurant_id` -> `restaurants(id)`, `tenant_id` -> `tenants(id)` | Enabled |
| `public.restaurant_staff` | VERIFIED | `restaurant_id` -> `restaurants(id)`, `tenant_id` -> `tenants(id)` | Enabled |
| `public.menu_categories` | VERIFIED | `restaurant_id` -> `restaurants(id)`, `tenant_id` -> `tenants(id)` | Enabled |
| `public.menu_items` | VERIFIED | `category_id` -> `menu_categories(id)`, `restaurant_id` -> `restaurants(id)` | Enabled |
| `public.restaurant_table_sessions` | VERIFIED | `table_id` -> `restaurant_tables(id)`, `lead_id` -> `leads(id)` | Enabled |
| `public.restaurant_orders` | VERIFIED | `table_session_id` -> `restaurant_table_sessions(id)` | Enabled |
| `public.restaurant_order_items` | VERIFIED | `order_id` -> `restaurant_orders(id)` | Enabled |
| `public.restaurant_order_events` | VERIFIED | `order_id` -> `restaurant_orders(id)` | Enabled |
| `public.leads` | VERIFIED | `tenant_id` -> `tenants(id)` | Enabled |

---

## 2. Trigger Function Verification (`trg_sync_restaurant_session_lead`)

### Trigger Definition
```sql
CREATE TRIGGER trg_sync_restaurant_session_lead
  AFTER INSERT OR UPDATE OF customer_name, customer_phone
  ON public.restaurant_table_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_restaurant_session_to_lead();
```

### Live Trigger Execution Test Log
- **Input Action:** Inserted session with `customer_name: "Aarav Sharma Test"`, `customer_phone: "+919999888877"`.
- **Observed Behavior:**
  1. Trigger fired automatically `AFTER INSERT`.
  2. Searched `public.leads` for matching `phone = '+919999888877'`.
  3. Created new lead record `addbc2a1-faee-46cb-b8c7-4ac4d762f026`.
  4. Populated lead attributes: `service_interest = 'Restaurant Dine-in'`, `source = 'Restaurant Session'`, `status = 'new'`.
  5. Linked `lead_id` back onto `restaurant_table_sessions.lead_id`.
- **Verdict:** PASS
