# Project Scope & Boundaries — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Restaurant OS (Priority 1)  
> **Related Documents**: [PROJECT_VISION.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/00_Project/PROJECT_VISION.md), [PRODUCT_REQUIREMENTS.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/00_Project/PRODUCT_REQUIREMENTS.md)

---

## 1. Purpose

This document defines the strict operational scope, feature boundaries, system constraints, and explicit non-goals for **Trinetra v2.0**. By setting rigorous project boundaries, this document prevents scope creep, ensures engineering bandwidth remains focused on delivering a production-grade **Restaurant Operating System**, and lays out a transparent roadmap for subsequent release cycles.

---

## 2. Scope Matrix

### 2.1 Core Priority 1: Restaurant OS (In Scope for v2.0)

| Module / Feature Area | Functional Inclusions | Target User Persona |
| :--- | :--- | :--- |
| **POS Billing & Checkout** | Fast dine-in, takeaway, delivery billing; split payments (Cash, Card, UPI); discounts & coupons; tax calculation (GST/VAT); thermal receipt printing. | Cashier, Restaurant Manager |
| **Kitchen Display System (KDS)** | Realtime order ticket routing by kitchen station; item status updates (Pending -> Preparing -> Ready); preparation timers; audio alerts. | Kitchen Staff, Head Chef |
| **Table & Floor Management** | Visual interactive floorplan layout editor; live table occupancy status (Available, Occupied, Reserved, Dirty); table merging/splitting; session tracking. | Hostess, Head Waiter |
| **Menu & Modifier System** | Multi-tier menus (Categories, Sub-categories, Items); variant pricing (Small/Medium/Large); item modifier groups (Add-ons, Customizations); stock availability toggles. | Restaurant Owner, Manager |
| **QR Code Self-Ordering** | Dine-in table QR ordering interface; direct-to-KDS ticket injection; online payment gateway integration (UPI/Razorpay/Stripe); guest cart state. | Customers |
| **Inventory & Costing** | Ingredient-level recipe mapping (BOM); real-time stock deduction upon billing; low-stock alerts; purchase order management; supplier directory. | Store Manager, Chef |
| **Reservation Engine** | Floor-aware reservation calendar; booking status workflow (Confirmed, Seated, Cancelled, No-Show); customer SMS/WhatsApp confirmation hooks. | Hostess, Customer |
| **Analytics & AI Assistant** | Daily closing financial reports; item velocity matrix (Stars, Dogs, Puzzle, Workhorse); demand forecast; natural language sales query bot. | Owner, General Manager |

---

### 2.2 Shared Platform Services (In Scope for v2.0)

- **Multi-Tenant Foundation**: Organization, Restaurant, and Branch hierarchy with strict Row-Level Security (RLS).
- **Authentication & RBAC**: Supabase Auth (Email/Password, OAuth, PIN-code quick switch for POS), granular permission mapping.
- **Audit Logging**: Immutably logged system actions (order modifications, price overrides, voided bills, user logins).
- **Realtime Sync Engine**: WebSocket event broadcasting for orders, tables, and KDS tickets.

---

### 2.3 Explicit Non-Goals & Out-of-Scope (Deferred to v2.x+)

1. **Non-Restaurant Verticals**: General retail POS, salon booking, real estate CRM, or hardware store inventory are strictly excluded from v2.0.
2. **Native Mobile App Bundles**: Android/iOS native binaries are out of scope. The frontend will be a responsive Web Progressive App (PWA) optimized for desktop, tablet, and mobile browsers.
3. **Hardware Driver Fabrication**: Native USB/Bluetooth ESC/POS printer driver development is out of scope. Receipt printing will rely on Web Bluetooth / Web Serial APIs or standard local print bridge microservices.
4. **Third-Party Aggregator Direct API Integrations**: Deep direct API integration with UberEats, DoorDash, Zomato, or Swiggy aggregators is deferred to v2.1.
5. **Complex Multi-Currency Ledger Accounting**: Double-entry financial accounting ledger creation is out of scope. Trinetra exports standard CSV/JSON reports compatible with QuickBooks and Tally.

---

## 3. Responsibilities & Enforcement

- **Product Management Responsibility**: Reject any feature request during v2.0 development that falls into the "Out-of-Scope" category unless approved via formal Architecture Decision Record (ADR).
- **Engineering Responsibility**: Enforce strict boundary layers in code. No code within `src/modules/restaurant` may hardcode dependencies on generic CRM modules.

---

## 4. Architecture Scope Boundary Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRINETRA v2.0 PLATFORM                          │
├────────────────────────────────────────────────────────────────────────┤
│  [ IN SCOPE: Priority 1 - Restaurant OS Core ]                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ POS Billing  │ │ Kitchen KDS  │ │ Live Tables  │ │  Menu Engine │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Inventory BOM│ │  QR Ordering │ │ AI Analytics │ │ Reservations │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│  [ IN SCOPE: Shared Multi-Tenant Platform Infrastructure ]             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ RLS MultiTenant│ Auth & RBAC  │ │ Realtime Sync│ │ Audit Logger │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│  [ OUT OF SCOPE FOR v2.0: Deferred Modules ]                           │
│  ░░░░░░░░░░░░░░░░ ░░░░░░░░░░░░░░░ ░░░░░░░░░░░░░░░ ░░░░░░░░░░░░░░░░░    │
│  ░ General CRM   ░ ░ Aggregator API░ ░ Native Mobile ░ ░ Full Payroll  ░    │
│  ░░░░░░░░░░░░░░░░ ░░░░░░░░░░░░░░░ ░░░░░░░░░░░░░░░ ░░░░░░░░░░░░░░░░░    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Folder References

```
docs/
├── 00_Project/
│   ├── PROJECT_VISION.md
│   ├── PROJECT_SCOPE.md             <-- You are here
│   ├── PRODUCT_REQUIREMENTS.md
│   └── SUCCESS_CRITERIA.md
├── 02_Restaurant/
│   ├── RESTAURANT_REQUIREMENTS.md
│   └── RESTAURANT_MODULES.md
```

---

## 6. Dependencies

- **Platform Architecture**: `docs/01_Architecture/SYSTEM_ARCHITECTURE.md`
- **Database Schema**: `docs/03_Database/DATABASE_SCHEMA.md`

---

## 7. Future Expansion Roadmap Alignment

- **v2.0 (Current Target)**: Production-grade Restaurant OS launch (POS, KDS, Tables, QR, Inventory, AI).
- **v2.1**: Third-Party Delivery Aggregator Integration (Zomato, Swiggy, UberEats API connectors).
- **v2.2**: Dedicated WhatsApp Marketing & Loyalty Automation Suite.
- **v3.0**: Expansion into Retail, Services, and Generalized Multi-Industry Business OS.

---

## 8. Best Practices & Design Rules

1. **Feature Gating**: Implement feature flag checks (`hasFeature('qr_ordering')`) so optional in-scope modules can be toggled per subscription tier.
2. **Explicit Interfaces**: Modules must interact only through typed service contracts defined in `src/modules/[module]/services`.

---

## 9. Concrete Implementation Examples

### 9.1 Scope Feature Flag Checker Utility
```typescript
// src/modules/core/utils/feature-flags.ts

export type PlatformFeature = 
  | 'pos_billing'
  | 'kds_realtime'
  | 'qr_table_ordering'
  | 'inventory_bom'
  | 'ai_analytics'
  | 'reservation_engine';

export interface BranchSubscription {
  planTier: 'BASIC' | 'PRO' | 'ENTERPRISE';
  enabledFeatures: PlatformFeature[];
}

export function isFeatureEnabled(
  subscription: BranchSubscription,
  feature: PlatformFeature
): boolean {
  if (subscription.planTier === 'ENTERPRISE') return true;
  return subscription.enabledFeatures.includes(feature);
}
```

---

## 10. Developer Notes

- Never introduce speculative features into PRs that are not listed in Section 2.1 without an updated scope doc.
- All code branches must validate active tenant permissions and feature flags before processing.

---

## 11. Common Mistakes & Anti-Patterns to Avoid

- **Scope Creep via "Quick Additions"**: Adding half-baked features (e.g., employee attendance payroll calculation) outside the core Restaurant OS scope.
- **Tightly Coupling Modules**: Writing KDS code that directly imports inventory database tables without going through the Inventory Service interface layer.
