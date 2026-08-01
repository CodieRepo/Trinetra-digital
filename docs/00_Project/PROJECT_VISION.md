# Project Vision — Trinetra v2.0 Business Operating System

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Restaurant OS (Priority 1)  
> **Design Philosophy**: Stripe / Vercel / Linear / Notion / Apple / Raycast Minimalist SaaS  

---

## 1. Purpose

Trinetra v2.0 is designed as a next-generation, high-performance, modular **Business Operating System** engineered to provide enterprise-grade operational infrastructure for modern businesses. The purpose of this document is to establish the overarching vision, strategic philosophy, non-negotiable architectural foundations, and core experience principles driving the entire Trinetra platform rebuild.

While Trinetra's long-term architecture supports multi-vertical business modules (CRM, WhatsApp Automation, Inventory, Marketing, HR, Billing), **Version 2.0 prioritizes the Restaurant Module above all else**. The Restaurant Operating System (Restaurant OS) serves as the flagship product, designed with the rigor, scale, and polish of a standalone, multi-tenant SaaS application capable of serving real-world high-volume food service operations globally.

---

## 2. Scope

### In Scope for Trinetra v2.0 Platform Vision
- **Flagship Focus — Restaurant OS**: End-to-end digital infrastructure for restaurants, including Point of Sale (POS), Kitchen Display Systems (KDS), Live Table Management, QR Code Self-Ordering, Menu & Modifier Engineering, Inventory & Supplier Management, Multi-Tender Payment Processing, Realtime Synchronization, and AI-powered operational insights.
- **Core Platform Infrastructure**: Multi-tenant isolation (Organization -> Restaurant -> Branch -> Department -> User -> Role -> Permission), centralized RBAC, unified event bus, offline-first caching layer, and audit logging.
- **UI/UX Excellence**: Keyboard-first navigation, command palette (`Cmd+K`), dark/light mode execution, zero-latency micro-interactions, optimistic state updates, and accessible component design.
- **AI Infrastructure**: Embedded operational analytics, sales prediction, automated inventory reordering suggestions, and natural language business querying.

### Out of Scope for Priority 1 (Deferred to Future v2.x Modules)
- Standalone multi-industry CRM (non-restaurant verticals).
- Automated broadcast WhatsApp marketing campaigns outside restaurant order notifications.
- General HR, payroll management, and complex employee scheduling beyond shift tracking and POS access permissions.

---

## 3. Responsibilities & Principles

### 3.1 Architectural Principles
1. **Documentation First**: No code is written without explicit specification in `docs/`. Architectural decision records (ADRs) dictate all structural choices.
2. **Modular Monolith to Microservices**: Code is structured into isolated, feature-driven domain modules within a Next.js monorepo layout, ensuring clear boundaries for future service extraction.
3. **Clean Architecture & SOLID**: Strict separation of concerns across Domain Entities, Use Cases (Services), Interface Adapters (API Handlers/Controllers), and Infrastructure (Database, Storage, External APIs).
4. **Strong Type Safety**: End-to-end type safety from PostgreSQL schema -> Prisma / Supabase client -> API routes -> React Hook Form -> Zod -> UI components. Zero `any` types permitted.
5. **Realtime & Optimistic Updates**: All transactional UI elements (POS table status, order item states, kitchen ticket updates) update optimistically in client memory while synchronizing via Supabase WebSockets.

### 3.2 UI/UX Principles
- **Aesthetic Benchmark**: Inspired by Stripe's typographic clarity, Linear's keyboard shortcuts and speed, Vercel's stark contrast dark mode, Notion's layout flexibility, and Raycast's command-driven UX.
- **No Clutter**: Dense operational data (POS item lists, live kitchen tickets) is visually hierarchized using micro-borders, clean status badges, HSL color tokens, and muted backgrounds.
- **Performance Budget**: Initial load under 1.2s on standard broadband; keyboard action response latency under 16ms (60 FPS animation target).

---

## 4. Architectural Alignment

The Trinetra v2.0 platform hierarchy follows a strictly isolated multi-tenant data model:

```
[ Platform Tenant Root ]
         │
         ├── Organization (Legal Entity / Brand)
         │       │
         │       ├── Restaurant (Location Concept)
         │       │       │
         │       │       ├── Branch (Physical Site / Outlet)
         │       │       │       ├── Departments (Kitchen, Bar, Billing, Floor)
         │       │       │       ├── Workstations (POS 1, KDS 1, KDS 2, QR Kiosk)
         │       │       │       └── Users & Staff (Manager, Cashier, Chef, Waiter)
         │       │       │
         │       │       └── Shared Catalog / Menu Rules
         │       │
         │       └── Global Organization Settings & Billing
```

---

## 5. Folder & Code References

```
docs/
├── 00_Project/
│   ├── PROJECT_VISION.md            <-- You are here
│   ├── PROJECT_SCOPE.md
│   ├── PRODUCT_REQUIREMENTS.md
│   ├── PRODUCT_PRINCIPLES.md
│   ├── SUCCESS_CRITERIA.md
│   └── PROJECT_GLOSSARY.md
├── 01_Architecture/
│   └── SYSTEM_ARCHITECTURE.md
├── 02_Restaurant/
│   ├── RESTAURANT_VISION.md
│   └── POS_SYSTEM.md
src/
├── app/                              <-- Next.js App Router root
│   ├── (auth)/                       <-- Authentication routes
│   ├── (dashboard)/                  <-- Platform back-office
│   └── (pos)/                        <-- High-performance POS interface
├── modules/                          <-- Feature-driven domain modules
│   ├── restaurant/                   <-- Priority 1 Domain Core
│   ├── inventory/
│   ├── ai/
│   └── core/                         <-- Shared platform utilities & middleware
```

---

## 6. Dependencies

### Internal Prerequisites
- `docs/00_Project/PROJECT_SCOPE.md`: Strict boundaries for v2.0 deliverables.
- `docs/01_Architecture/SYSTEM_ARCHITECTURE.md`: Technical topology and Next.js / Supabase setup.

### External System & Library Dependencies
- **Core Framework**: Next.js 14+ (App Router), React 18+, TypeScript 5.x.
- **Styling & Components**: TailwindCSS, shadcn/ui, Radix UI primitives, Lucide React icons, Framer Motion.
- **Data & State**: PostgreSQL, Supabase (Auth, Realtime, Storage), Prisma ORM, Zustand, TanStack Query (React Query).
- **Form & Validation**: React Hook Form, Zod schema validation.

---

## 7. Future Expansion & Scaling

Trinetra's v2.0 architectural core is deliberately engineered so that once the Restaurant OS is fully operational, additional verticals can be plugged in without refactoring core platform systems:
- **Plug-and-Play Vertical Modules**: Multi-industry CRM, automated WhatsApp marketing bots, generalized retail inventory, and employee payroll share the same tenant isolation layer (`Organization -> Branch`).
- **Global Event Bus**: Events emitted by the Restaurant OS (e.g., `order.completed`, `customer.created`) feed directly into future CRM analytics and loyalty automation pipelines without coupling.

---

## 8. Best Practices & Design Patterns

1. **Feature-Based Module Structuring**: Keep everything related to a specific domain (components, hooks, services, types, api handlers) within `src/modules/[module-name]`.
2. **Command/Query Responsibility Segregation (Light CQRS)**: Separate transactional write logic (placing orders, modifying stock) from complex read queries (sales reporting, analytics aggregations).
3. **Optimistic UI Engine**: UI elements mutate instantly; failed API requests trigger smooth error toasts with rollback mechanisms.
4. **Tokenized Design System**: Never write raw CSS color values or magic pixel padding. All styles utilize Tailwind CSS variables mapped to design system tokens (`bg-background`, `text-foreground`, `border-border`).

---

## 9. Concrete Implementation Examples

### 9.1 Platform Tenant Context Interface Definition
```typescript
// src/modules/core/types/tenant.ts

export type RolePermission = 
  | 'pos:order:create'
  | 'pos:order:discount'
  | 'kds:ticket:update'
  | 'menu:item:edit'
  | 'inventory:adjust'
  | 'reports:view_financials'
  | 'settings:manage_branch';

export interface TenantContext {
  organizationId: string;
  restaurantId: string;
  branchId: string;
  userId: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'CHEF' | 'WAITER';
  permissions: Set<RolePermission>;
}
```

### 9.2 Standardized Module Result Wrapper
```typescript
// src/modules/core/types/result.ts

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E; code: string };

export function createSuccess<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function createFailure<E extends Error>(error: E, code: string): Result<never, E> {
  return { success: false, error, code };
}
```

---

## 10. Developer Notes & Constraints

- **Strict Mode Enabled**: TypeScript `strict: true` and `noImplicitAny: true` are locked in `tsconfig.json`.
- **Keyboard Shortcut Standard**: All POS and table management screens must define keyboard listeners (`Hotkeys`) for primary actions (`F1` for New Order, `F2` for Pay, `Cmd+K` for Global Search).
- **Environment Isolation**: Local development requires `.env.local` pointing to Supabase local emulator (`supabase start`) or dedicated dev branch.

---

## 11. Common Mistakes & Anti-Patterns to Avoid

- **Cross-Tenant Data Pollution**: Querying database records without filtering by `branch_id` or `organization_id`. Always enforce RLS at database level and schema filters at Prisma service level.
- **Over-engineered Monorepo Packages**: Splitting simple shared helpers into independent npm packages early. Keep utilities in `src/modules/core` until multi-repo deployment is explicitly required.
- **Using Client-Side State for Transactional Data**: Relying purely on React state for active table orders without immediate persistence to local IndexedDB or server cache. Loss of internet connection must never cause order data loss.
