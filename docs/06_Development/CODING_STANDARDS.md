# Engineering & Coding Standards — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Platform Engineering Standards  
> **Related Documents**: [TYPESCRIPT_GUIDELINES.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/06_Development/TYPESCRIPT_GUIDELINES.md), [FOLDER_STRUCTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/06_Development/FOLDER_STRUCTURE.md)

---

## 1. Purpose

This document defines the coding standards, TypeScript conventions, module folder structure, naming patterns, linting rules, and error handling standards for **Trinetra v2.0**.

---

## 2. Directory Structure Blueprint

Code is structured into a modular monolith layout inside `src/`:

```
src/
├── app/                              <-- Next.js 14 App Router Pages & API Routes
│   ├── (auth)/                       <-- Login & authentication routes
│   ├── (dashboard)/                  <-- Management dashboard pages
│   ├── (pos)/                        <-- Dedicated POS terminal route layout
│   └── api/                          <-- REST API routes delegating to domain services
├── modules/                          <-- Modular Domain Cores
│   ├── core/                         <-- Shared platform utilities, DB, auth middleware
│   ├── restaurant/                   <-- Priority 1 POS/KDS domain core
│   │   ├── components/               <-- React components specific to restaurant domain
│   │   ├── services/                 <-- Business logic & Prisma query services
│   │   ├── hooks/                    <-- Custom React hooks & state listeners
│   │   ├── types/                    <-- Zod schemas & TypeScript interfaces
│   │   └── utils/                    <-- Domain-specific helpers
│   ├── inventory/
│   └── ai/
└── styles/                           <-- Global CSS & Tailwind configuration
```

---

## 3. Naming Conventions

- **Files & Directories**: `kebab-case.ts` / `kebab-case.tsx` (e.g., `pos-checkout-modal.tsx`).
- **Components**: `PascalCase` (e.g., `PosCheckoutModal`).
- **Hooks**: `camelCase` starting with `use` (e.g., `usePosCart`).
- **Types & Interfaces**: `PascalCase` (e.g., `CreateOrderInput`).
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_KDS_TIMER_SECONDS`).

---

## 4. TypeScript Guidelines

1. **Zero `any` Types**: `noImplicitAny: true` is strictly enforced. Use `unknown` with type guards if types are dynamically resolved.
2. **Explicit Return Types**: All domain service functions and API handlers must explicitly declare their return types.
3. **Immutability**: Prefer `readonly` arrays and `const` declarations.

---

## 5. Error Handling Pattern

Services must return structured `Result<T, E>` types rather than throwing unhandled exceptions:

```typescript
// src/modules/core/types/result.ts

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E; code: string };

export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function failure<E extends Error>(error: E, code: string): Result<never, E> {
  return { success: false, error, code };
}
```
