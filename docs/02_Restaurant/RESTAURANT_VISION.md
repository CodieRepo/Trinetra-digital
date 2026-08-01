# Restaurant OS Vision & Strategic Architecture — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Priority 1 (Flagship SaaS Product)  
> **Related Documents**: [PROJECT_VISION.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/00_Project/PROJECT_VISION.md), [RESTAURANT_REQUIREMENTS.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/RESTAURANT_REQUIREMENTS.md)

---

## 1. Purpose

The **Trinetra Restaurant Operating System (Restaurant OS)** is designed as a enterprise-grade, multi-tenant SaaS application capable of powering fast-casual, fine-dining, cloud kitchen, and multi-outlet restaurant chains. The purpose of this document is to define the product vision, core operational capabilities, user experience goals, and architectural pillars of the Restaurant OS module.

---

## 2. Scope

### In-Scope Functional Modules
- **Ultra-Fast POS Billing Engine**: High-velocity order creation, custom item modifiers, split payments, and receipt printing.
- **Realtime Kitchen Display System (KDS)**: Station-routed order tickets, timer warnings, and kitchen bump workflows.
- **Interactive Table & Floor Management**: Dynamic visual layout canvas, live occupancy indicators, and table session lifecycle.
- **Menu & Modifier Management**: Multi-tier menus, variant pricing, stock availability toggles, and add-on modifier groups.
- **QR Code Guest Self-Ordering**: Contactless table ordering and digital payment checkout.
- **Recipe Bill of Materials (BOM) & Inventory**: Automated stock deduction per order, cost-per-dish calculation, and reorder alerts.
- **AI Restaurant Assistant**: Natural language sales query bot, daily closing summary, and predictive inventory reordering.

---

## 3. Responsibilities & Core Pillars

### 3.1 Operational Pillars
1. **Speed & Zero-Downtime Reliability**: Restaurant operations cannot stall due to slow UIs or dropped internet. The POS interface operates with sub-100ms UI responsiveness and offline caching.
2. **Unified Data Synchronicity**: POS terminals, waiter tablets, kitchen displays, and guest QR carts stay in perfect synchronicity via Supabase WebSockets.
3. **Loss Prevention & Transparency**: Price overrides, voided items, bill reprints, and cash drawer opens generate immutable audit trail events.

---

## 4. Architectural Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                      RESTAURANT OS ARCHITECTURE                        │
├────────────────────────────────────────────────────────────────────────┤
│  [ FRONTEND / CLIENT LAYER ]                                           │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐              │
│  │   POS Terminal │ │  KDS Monitors  │ │ Guest QR App   │              │
│  │  (Next.js App) │ │  (Next.js App) │ │ (Edge Mobile)  │              │
│  └───────┬────────┘ └───────┬────────┘ └───────┬────────┘              │
├──────────┼──────────────────┼──────────────────┼───────────────────────┤
│  [ REALTIME & API LAYER ]   │                  │                       │
│  ┌───────▼──────────────────▼──────────────────▼────────┐              │
│  │     Supabase Realtime WebSockets & Next.js API       │              │
│  └──────────────────────────┬───────────────────────────┘              │
├─────────────────────────────┼──────────────────────────────────────────┤
│  [ DOMAIN SERVICE ENGINE ]  │                                          │
│  ┌──────────────────────────▼───────────────────────────┐              │
│  │ Order Lifecycle • Table Engine • BOM Stock Deductor  │              │
│  └──────────────────────────┬───────────────────────────┘              │
├─────────────────────────────┼──────────────────────────────────────────┤
│  [ DATABASE & SECURITY ]    │                                          │
│  ┌──────────────────────────▼───────────────────────────┐              │
│  │  PostgreSQL + Supabase RLS (Tenant Scoped by Branch) │              │
│  └──────────────────────────────────────────────────────┘              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Folder & Code References

```
docs/
├── 02_Restaurant/
│   ├── RESTAURANT_VISION.md          <-- You are here
│   ├── RESTAURANT_REQUIREMENTS.md
│   ├── RESTAURANT_WORKFLOWS.md
│   ├── ORDER_LIFECYCLE.md
│   ├── POS_SYSTEM.md
│   └── KITCHEN_DISPLAY_SYSTEM.md
src/modules/restaurant/
├── components/                       <-- POS, KDS, Table canvas UI components
├── services/                         <-- Order execution, billing, KDS services
├── hooks/                            <-- Realtime subscriptions & keyboard hotkeys
└── types/                            <-- Zod schemas & TypeScript types
```

---

## 6. Dependencies

- Multi-tenant Platform Core: `docs/00_Project/PROJECT_VISION.md`
- Database Schema & RLS: `docs/03_Database/DATABASE_SCHEMA.md`
- API Standards: `docs/04_API/API_STANDARDS.md`

---

## 7. Future Expansion

- **v2.1**: Direct food delivery aggregator order ingestion (Zomato/Swiggy/UberEats API bridge).
- **v2.2**: Automated guest loyalty points system & WhatsApp marketing campaign integration.

---

## 8. Best Practices & Design Patterns

1. **Station Routing Logic**: Decouple order placement from physical printing/displaying. The Order Engine emits `order.placed`, and station routers distribute line items to corresponding KDS monitors.
2. **Optimistic Ticket State**: Kitchen staff bumping a ticket triggers instantaneous visual removal, restoring state only if WebSocket acknowledgment fails.

---

## 9. Concrete Implementation Examples

### 9.1 Restaurant Station Router Type Definition
```typescript
// src/modules/restaurant/types/station.ts

export type KitchenStationType = 'GRILL' | 'PIZZA' | 'BAR' | 'COLD_PREP' | 'PACKAGING';

export interface StationRouteRule {
  categoryId: string;
  stationType: KitchenStationType;
  targetKdsTerminalId: string;
}

export function resolveItemStation(
  categoryId: string,
  rules: StationRouteRule[]
): KitchenStationType {
  const matched = rules.find(r => r.categoryId === categoryId);
  return matched ? matched.stationType : 'GRILL'; // Default fallback
}
```

---

## 10. Developer Notes

- Test POS keyboard hotkey handlers against multiple operating systems (macOS, Windows, ChromeOS).
- Ensure all monetary values are stored in cents/paise (integers) to eliminate floating-point calculation errors.

---

## 11. Common Mistakes & Anti-Patterns to Avoid

- **Storing Currency as Floats**: Calculating order totals with JavaScript floating-point arithmetic (e.g., `0.1 + 0.2 = 0.30000000000000004`). Always store and calculate monetary amounts as integer minor units.
- **Tight Coupling of KDS and POS**: Writing KDS code that queries POS UI state instead of consuming independent `order_items` database streams via WebSockets.
