# System Architecture & Technical Topology — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Platform & Restaurant OS Focus  
> **Related Documents**: [APPLICATION_ARCHITECTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/APPLICATION_ARCHITECTURE.md), [MULTI_TENANT_ARCHITECTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/MULTI_TENANT_ARCHITECTURE.md)

---

## 1. Purpose

This document provides the high-level system architecture blueprint and end-to-end technical topology for **Trinetra v2.0**. It defines how the Next.js frontend application, Supabase PostgreSQL backend, Prisma ORM, WebSocket realtime layer, and external services interact to form a resilient, production-grade SaaS platform.

---

## 2. Technical Stack Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                          TECHNOLOGY MATRIX                             │
├──────────────────┬─────────────────────────────────────────────────────┤
│ Frontend Stack   │ Next.js 14 (App Router), React 18, TypeScript 5    │
│ Styling & Design │ TailwindCSS, shadcn/ui, Radix UI, Framer Motion     │
│ State Management │ Zustand (Client POS/KDS), TanStack Query (Server)   │
│ Form & Validation│ React Hook Form, Zod Schema Validation               │
├──────────────────┼─────────────────────────────────────────────────────┤
│ Backend Layer    │ Next.js Route Handlers (Serverless/Edge), Node.js   │
│ Database & Storage│ PostgreSQL, Supabase Auth, Supabase Storage         │
│ ORM & Querying   │ Prisma ORM, Supabase JavaScript Client              │
│ Realtime Engine  │ Supabase WebSockets (Realtime Broadcast Channels)   │
├──────────────────┼─────────────────────────────────────────────────────┤
│ Deployment       │ Vercel Edge Platform, Supabase Managed Cloud        │
└──────────────────┴─────────────────────────────────────────────────────┘
```

---

## 3. High-Level System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRINETRA v2.0 SYSTEM TOPOLOGY                   │
├────────────────────────────────────────────────────────────────────────┤
│  [ CLIENT LAYER ]                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐  │
│  │ POS Billing Terminal │  │ Kitchen Display (KDS)│  │ Guest QR App │  │
│  │ (Next.js Desktop PWA)│  │ (Next.js Tablet PWA) │  │ (Mobile Edge)│  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └──────┬───────┘  │
├─────────────┼─────────────────────────┼─────────────────────┼──────────┤
│             │ HTTP / WebSocket        │ WebSocket           │ HTTP     │
│             ▼                         ▼                     ▼          │
│  [ EDGE / GATEWAY LAYER ]                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Vercel Edge Network / Next.js Middleware (Tenant Auth Verification)│  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
├─────────────────────────────────────┼──────────────────────────────────┤
│  [ APPLICATION & DOMAIN SERVICES ]  │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │  Next.js Serverless API Route Handlers                            │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │  │
│  │  │ Order Engine │ │ Table Engine │ │ Menu Service │ │ AI Agent  │ │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘ │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
├─────────────────────────────────────┼──────────────────────────────────┤
│  [ DATABASE & REALTIME LAYER ]      │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │  Supabase Managed Cloud Infrastructure                            │  │
│  │  ├── PostgreSQL Database (Prisma ORM + RLS Security)              │  │
│  │  ├── Supabase Realtime Engine (WebSocket Broadcast)               │  │
│  │  └── Supabase Auth & JWT Issuer                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Key Architectural Patterns

1. **Modular Monolith**: All domain features (`restaurant`, `inventory`, `ai`, `core`) reside in `src/modules/` within a single Next.js monorepo layout, preventing early microservice complexity while enabling independent domain boundary isolation.
2. **Command Query Responsibility Segregation (Light CQRS)**: High-speed write commands (POS order submission, KDS status bump) run through specialized serverless validation pipelines, while read queries (reporting, analytics) stream from optimized database view replicas.
3. **Optimistic Local Caching**: Client terminals maintain instant-response Zustand memory stores and IndexedDB offline persistence, synchronizing mutations with the database asynchronously.

---

## 5. Folder & Code References

```
docs/
├── 01_Architecture/
│   ├── SYSTEM_ARCHITECTURE.md       <-- You are here
│   ├── APPLICATION_ARCHITECTURE.md
│   ├── MODULE_ARCHITECTURE.md
│   ├── MULTI_TENANT_ARCHITECTURE.md
│   ├── REALTIME_ARCHITECTURE.md
│   └── OFFLINE_STRATEGY.md
src/
├── app/                              <-- Next.js App Router endpoints
├── modules/                          <-- Modular domain cores
│   ├── core/                         <-- Shared platform, RLS, middleware
│   ├── restaurant/                   <-- Priority 1 POS/KDS domain
│   ├── inventory/
│   └── ai/
```

---

## 6. Security & Multi-Tenancy Overview

- **Row-Level Security (RLS)**: PostgreSQL enforces data boundaries using `branch_id` injected from authenticated Supabase JWT tokens.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions (`pos:order:create`, `kds:ticket:update`) guarded by custom React hooks and API route middleware.
