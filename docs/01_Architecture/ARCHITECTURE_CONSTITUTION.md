# Architecture Constitution & Engineering Commandments — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Enforcement**: Mandatory for all Pull Requests & Code Reviews  
> **Related Documents**: [MASTER_CONTEXT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/00_Project/MASTER_CONTEXT.md), [CODING_STANDARDS.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/06_Development/CODING_STANDARDS.md)

---

## 1. Purpose

This document codifies the non-negotiable architectural laws, engineering constraints, design rules, and operational commandments governing **Trinetra v2.0**. No code change may violate these commandments under any circumstances.

---

## 2. The 10 Commandments of Trinetra Engineering

### Commandment 1: Documentation First, Always
No PR will be merged, and no feature code will be accepted without prior complete specification in `docs/`. Any architectural mutation requires an explicit Architecture Decision Record (ADR).

### Commandment 2: Absolute Tenant Isolation at Storage Layer
Every query, insert, update, or delete on tenant data must pass through PostgreSQL Row-Level Security (RLS) policies scoped by `branch_id`. Never rely on client-side filtering for security boundaries.

### Commandment 3: Zero Floating-Point Currency Arithmetic
All monetary amounts (`price_cents`, `amount_cents`, `tax_cents`, `discount_cents`) must be stored and calculated as 64-bit integers representing minor currency units (cents/paise). Floating-point math (`0.1 + 0.2`) is forbidden in financial logic.

### Commandment 4: Sub-100ms Perceived Latency Budget
High-volume cashier interactions (POS item filtering, item additions, KDS bumps) must update the UI optimistically in client memory in `< 16ms` (1 frame at 60 FPS). Server persistence completes asynchronously.

### Commandment 5: Keyboard-First Operation
All operational interfaces (POS Billing, KDS Ticket Bumping, Table Selection) must function 100% via keyboard hotkeys (`F1`-`F12`, `/`, `Space`, `Hotkeys`). Mouse reliance for core actions is a design defect.

### Commandment 6: Zero `any` Types & Strict Schema Validation
TypeScript strict mode (`strict: true`, `noImplicitAny: true`) is locked. All boundary inputs (HTTP body, URL parameters, form inputs, local storage payloads) must be sanitized using Zod schemas.

### Commandment 7: Offline Tolerance & Zero Data Loss
Local POS clients must buffer transaction state to browser `IndexedDB` during internet dropped states. Offline transactions must synchronize idempotently when reconnected.

### Commandment 8: Immutable Audit Logging for Sensitive Actions
Price overrides, bill voiding, line-item cancellations, cash drawer pops, and manager permission overrides must produce immutable audit log entries.

### Commandment 9: Station-Routing Decoupling
Order placement must be completely decoupled from physical kitchen displays/printers. The Order Engine emits `order.placed`, and station routing rules asynchronously dispatch line items to target screens.

### Commandment 10: Clean Architecture & Modular Isolation
Feature modules inside `src/modules/[domain]` must not directly import internal private utilities of another domain without going through that domain's typed public service interface.

---

## 3. Enforcement & Quality Gates

- **CI/CD Static Analysis**: ESLint and TypeScript compiler run in strict mode on every commit.
- **Pull Request Blocking**: Automated GitHub Actions block merges if unit test coverage drops below 85% or if RLS policies are missing on new database migrations.
