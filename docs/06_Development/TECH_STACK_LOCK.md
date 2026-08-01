# Technology Stack & Tooling Specifications — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Related Documents**: [SYSTEM_ARCHITECTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/SYSTEM_ARCHITECTURE.md)

---

## 1. Locked Tech Stack Matrix

| Technology Layer | Selected Tool | Locked Version | Rationale |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `^14.2.23` | Serverless routes, SSR performance, React 18 support |
| **Language** | TypeScript | `^5.7.3` | End-to-end type safety (`strict: true`) |
| **Styling** | TailwindCSS | `^3.4.17` | Utility-first CSS variable token system |
| **UI Components** | shadcn/ui + Radix UI | Latest | Unstyled accessible primitives, zero lock-in |
| **Icons** | Lucide React | `^0.474.0` | Crisp modern icon set |
| **Animation** | Framer Motion | `^12.0.0` | Spring physics micro-animations |
| **Database ORM** | Prisma ORM | `^5.22.0` | Declarative schema DDL, type-safe queries |
| **Backend & Auth** | Supabase Managed Cloud | `^2.48.0` | Managed PostgreSQL, Auth, Realtime WebSockets |
| **Validation** | Zod | `^3.24.1` | Runtime schema validation for API bodies & env |
| **State Management**| Zustand | `^5.0.3` | Lightweight client memory state for POS cart |
| **Unit Testing** | Vitest | `^3.0.4` | High-speed ESM-native unit test runner |
| **E2E Testing** | Playwright | `^1.50.0` | Cross-browser automated user flow testing |
