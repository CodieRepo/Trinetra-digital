# MASTER CONTEXT — Single Source of Truth for Trinetra v2.0

> **Document Status**: Production Architecture Blueprint  
> **Target Version**: v2.0.0  
> **System Priority**: Priority 1 — Restaurant Operating System (Production SaaS)  
> **Core Philosophy**: Documentation First → Architecture → Design System → Database → APIs → Development  

---

## 1. Executive Summary & Product Identity

**Trinetra v2.0** is an enterprise-grade, modular Business Operating System. While the platform is architected to support future SaaS modules (CRM, WhatsApp Automation, Retail Inventory, HR), **Version 2.0 prioritizes the Restaurant Module above all else**.

The Restaurant OS is engineered as a world-class, multi-tenant SaaS application comparable in technical depth, fault tolerance, and UX polish to industry leaders such as **Toast POS**, **Square POS**, **Petpooja**, and **Oracle Simphony**.

---

## 2. Core Architectural Principles (Non-Negotiable)

1. **Zero Unspecified Code**: No feature code is written without prior complete specification in `docs/`.
2. **Multi-Tenant Isolation**: 4-tier hierarchy (`Organization -> Restaurant -> Branch -> Department`) strictly enforced at the database layer via PostgreSQL Row-Level Security (RLS) policies scoped by `branch_id`.
3. **Clean Architecture & SOLID**: Strict layer separation across Domain Entities, Use Cases (Services), Interface Adapters (API Handlers), and Infrastructure (Supabase, Prisma, WebSockets).
4. **Sub-100ms Perceived Latency**: POS catalog search filter `< 16ms` (1 frame), transactional order mutations `< 50ms` in client memory, KDS WebSocket ticket updates `< 100ms`.
5. **Keyboard-First Operational Design**: Cashier POS and KDS bump bars operate 100% via configurable keyboard hotkeys without requiring mouse interaction.
6. **Offline Resilience & Zero Data Loss**: Local IndexedDB caching buffers up to 1,000+ orders during network outages with idempotent re-synchronization upon reconnect.

---

## 3. High-Level System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRINETRA v2.0 SYSTEM CANVAS                     │
├────────────────────────────────────────────────────────────────────────┤
│  [ FRONTEND / USER EXPERIENCES ]                                       │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐  │
│  │ POS Billing Terminal │  │ Kitchen Display (KDS)│  │ Guest QR App │  │
│  │ (Next.js Desktop PWA)│  │ (Next.js Tablet PWA) │  │ (Mobile Edge)│  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └──────┬───────┘  │
├─────────────┼─────────────────────────┼─────────────────────┼──────────┤
│             │ HTTP / WebSocket        │ WebSocket           │ HTTP     │
│             ▼                         ▼                     ▼          │
│  [ GATEWAY & AUTHENTICATION ]                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Vercel Edge Middleware (JWT Verification & Tenant Claim Inject)  │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
├─────────────────────────────────────┼──────────────────────────────────┤
│  [ DOMAIN SERVICES CORE ]           │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │  Next.js Route Handlers & Prisma Service Layer                   │  │
│  │  ├── Order Execution & State Machine                             │  │
│  │  ├── Interactive Table Session Engine                            │  │
│  │  ├── Menu & Modifier Engine                                      │  │
│  │  ├── Recipe Bill of Materials (BOM) Stock Deductor               │  │
│  │  └── AI Assistant & Operational Analytics                        │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
├─────────────────────────────────────┼──────────────────────────────────┤
│  [ PERSISTENCE & REALTIME BROADCAST ]                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │  Supabase Cloud Engine                                           │  │
│  │  ├── PostgreSQL Database (Prisma ORM + RLS Policies)             │  │
│  │  └── Supabase Realtime Engine (WebSocket Broadcast Channels)     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Master Document Index & Cross-Reference Map

| Category | Primary Blueprint File | Purpose & Key Topics |
| :--- | :--- | :--- |
| **00_Project** | [MASTER_CONTEXT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/00_Project/MASTER_CONTEXT.md) | Single source of truth for the entire platform. |
| | [IMPLEMENTATION_ORDER.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/00_Project/IMPLEMENTATION_ORDER.md) | Strict phased build order & module dependency graph. |
| **01_Architecture** | [ARCHITECTURE_CONSTITUTION.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/ARCHITECTURE_CONSTITUTION.md) | Non-negotiable engineering and coding laws. |
| | [DOMAIN_MODEL.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/DOMAIN_MODEL.md) | Complete business entities and domain relationships. |
| | [EVENT_CATALOG.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/EVENT_CATALOG.md) | Realtime event registry & payload schemas. |
| | [PERFORMANCE_GUIDE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/PERFORMANCE_GUIDE.md) | Latency budgets, FPS, and optimization targets. |
| | [ERROR_RECOVERY.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/ERROR_RECOVERY.md) | Offline fallback, retries, and conflict resolution. |
| **02_Restaurant** | [BUSINESS_RULES.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/BUSINESS_RULES.md) | Restaurant business logic, validations, and edge cases. |
| | [WORKFLOW_DIAGRAMS.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/WORKFLOW_DIAGRAMS.md) | Visual Mermaid flowcharts for all 10 operational flows. |
| **03_Database** | [DATABASE_SCHEMA.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/03_Database/DATABASE_SCHEMA.md) | Complete production Prisma schema DDL. |
| **05_Design** | [UI_SCREEN_MAP.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/05_Design/UI_SCREEN_MAP.md) | Navigation map & screen hierarchy. |
| | [COMPONENT_CATALOG.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/05_Design/COMPONENT_CATALOG.md) | Reusable UI component library specification. |
| **07_Security** | [PERMISSIONS_MATRIX.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/07_Security/PERMISSIONS_MATRIX.md) | Exhaustive RBAC permission matrix. |
| **15_Blueprints** | [POS_BLUEPRINT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/15_Blueprints/POS_BLUEPRINT.md) | Detailed 12-section blueprint for POS POS Billing. |
| | [KITCHEN_BLUEPRINT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/15_Blueprints/KITCHEN_BLUEPRINT.md) | Detailed 12-section blueprint for Kitchen Displays. |
| | [TABLE_BLUEPRINT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/15_Blueprints/TABLE_BLUEPRINT.md) | Detailed 12-section blueprint for Table Management. |
| | [QR_BLUEPRINT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/15_Blueprints/QR_BLUEPRINT.md) | Detailed 12-section blueprint for QR Self-Ordering. |
| | [INVENTORY_BLUEPRINT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/15_Blueprints/INVENTORY_BLUEPRINT.md) | Detailed 12-section blueprint for Inventory BOM. |
| | [PAYMENTS_BLUEPRINT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/15_Blueprints/PAYMENTS_BLUEPRINT.md) | Detailed 12-section blueprint for Payment Processing. |
| | [REPORTS_BLUEPRINT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/15_Blueprints/REPORTS_BLUEPRINT.md) | Detailed 12-section blueprint for Reports & Analytics. |
| | [AI_BLUEPRINT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/15_Blueprints/AI_BLUEPRINT.md) | Detailed 12-section blueprint for AI Assistant. |
| | [CRM_BLUEPRINT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/15_Blueprints/CRM_BLUEPRINT.md) | Detailed 12-section blueprint for CRM Expansion. |
