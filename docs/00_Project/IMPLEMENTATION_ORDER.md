# Module Implementation Order & Dependency Graph — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Priority 1 — Restaurant OS Focus  
> **Related Documents**: [PROJECT_ROADMAP.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/00_Project/PROJECT_ROADMAP.md)

---

## 1. Purpose

This document defines the strict, phased build sequence for all software modules in **Trinetra v2.0**. It maps every component's prerequisites, input dependencies, output interfaces, and verification gates to guarantee zero circular dependencies during development.

---

## 2. Phased Build Sequence

```
[ Phase 0: Complete Documentation Blueprint ] ──(Must be 100% Locked)──┐
                                                                      │
┌─────────────────────────────────────────────────────────────────────┘
▼
[ Phase 1: Core Platform & Multi-Tenant Foundations ]
├── 1.1 Supabase Database Migrations & RLS Policies
├── 1.2 Next.js App Router Scaffold & Tailwind / shadcn Design System
└── 1.3 Supabase Auth, JWT Claim Injector & RBAC Middleware
        │
        ▼
[ Phase 2: Restaurant Menu Engine & Inventory BOM ]
├── 2.1 Menu Catalog CRUD & Zod Schemas
├── 2.2 Modifier Groups & Variant Pricing Engine
└── 2.3 Raw Ingredient & Recipe Bill of Materials (BOM) Deductor
        │
        ▼
[ Phase 3: Table Floorplan & Session Engine ]
├── 3.1 2D Visual Floor Canvas Editor & Grid Coordinate Persistence
└── 3.2 Table Session State Machine (Available -> Occupied -> Billing -> Dirty)
        │
        ▼
[ Phase 4: POS Billing & Order Lifecycle Engine ]
├── 4.1 Order Execution Engine & State Machine (Draft -> Placed -> Paid)
├── 4.2 High-Velocity POS Billing UI & Keyboard Hotkey Manager
├── 4.3 Split Payment Engine (Cash, Card, UPI, Customer Credit)
└── 4.4 ESC/POS Thermal Receipt Print Buffer Dispatcher
        │
        ▼
[ Phase 5: Realtime Kitchen Display System (KDS) ]
├── 5.1 Supabase Realtime WebSocket Station Channels
├── 5.2 KDS Ticket Grid UI, Urgency Timers & Bump Bar Keypad Listener
└── 5.3 Station Routing Rules Engine
        │
        ▼
[ Phase 6: Guest QR Code Self-Ordering App ]
├── 6.1 HMAC Signed Table QR Token Generator & Verifier
├── 6.2 Ultra-lightweight Guest PWA Menu & Local Cart State
└── 6.3 Online Payment Gateway Integration (Razorpay/Stripe) & Order Injection
        │
        ▼
[ Phase 7: AI Assistant & Reports Analytics ]
├── 7.1 Daily Closing Financial Aggregator & Audit Log Viewer
└── 7.2 LLM Gateway, System Prompts & Operational Function Calling Tools
```

---

## 3. Module Dependency Matrix

| Module Name | Strict Prerequisites | Outbound Dependent Modules |
| :--- | :--- | :--- |
| `src/modules/core` | None (Foundation Layer) | All Modules |
| `src/modules/menu` | `src/modules/core` | `restaurant`, `inventory`, `qr` |
| `src/modules/inventory` | `src/modules/menu` | `restaurant` (BOM Deduction) |
| `src/modules/table` | `src/modules/core` | `restaurant` |
| `src/modules/restaurant` (POS) | `core`, `menu`, `table` | `kds`, `reports`, `ai` |
| `src/modules/kds` | `restaurant` (Order Engine) | `reports` |
| `src/modules/qr` | `menu`, `table`, `restaurant` | `kds`, `payments` |
| `src/modules/ai` | `restaurant`, `inventory`, `reports` | None (Consumer Layer) |
