# Product Requirements Document (PRD) — Trinetra v2.0 Platform & Restaurant OS

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Restaurant OS (Priority 1)  
> **Related Documents**: [PROJECT_VISION.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/00_Project/PROJECT_VISION.md), [PROJECT_SCOPE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/00_Project/PROJECT_SCOPE.md), [SUCCESS_CRITERIA.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/00_Project/SUCCESS_CRITERIA.md)

---

## 1. Purpose

This Product Requirements Document (PRD) synthesizes the functional, non-functional, technical, operational, and user experience requirements for **Trinetra v2.0** and its flagship **Restaurant Operating System**. It serves as the single source of truth for engineering, design, and QA teams building the platform.

---

## 2. Scope

This PRD specifies the complete set of system requirements covering:
- **System-Wide Platform Capabilities**: Multi-tenant security, RBAC, offline resilience, realtime event architecture.
- **Priority 1 Restaurant OS Requirements**: POS billing, Kitchen Display System (KDS), Table Management, Menu Engine, QR Self-Ordering, Inventory & BOM, Reservations, and AI Analytics.

---

## 3. Detailed Requirements Breakdown

### 3.1 Functional Requirements (FR)

#### FR-01: Multi-Tenant Hierarchy & Tenant Isolation
- **FR-01.1**: The system MUST support a 4-tier tenant entity model: `Organization -> Restaurant -> Branch -> Department`.
- **FR-01.2**: All database tables containing tenant data MUST enforce PostgreSQL Row-Level Security (RLS) policies scoped by `branch_id`.
- **FR-01.3**: Users must be assigned specific roles scoped to one or more branches.

#### FR-02: POS Billing & Order Execution Engine
- **FR-02.1**: POS interface MUST load within **< 1.0s** and allow complete order entry via keyboard shortcuts (`F1`-`F12`, `Hotkeys`).
- **FR-02.2**: Cashiers MUST be able to process orders across three channels: **Dine-In**, **Takeaway**, and **Delivery**.
- **FR-02.3**: POS MUST support item variant selections, nested modifiers (e.g., Extra Cheese, No Onions), and custom order notes.
- **FR-02.4**: POS MUST support split billing (equal split, itemized split, custom amount split) across multiple payment tenders (Cash, Credit Card, UPI, Room Charge, Loyalty Points).
- **FR-02.5**: POS MUST format and transmit receipt print payloads viaESC/POS standard commands to connected thermal receipt printers.

#### FR-03: Realtime Kitchen Display System (KDS)
- **FR-03.1**: Orders submitted from POS or QR Code MUST appear on the designated KDS station in **< 300ms** via WebSockets.
- **FR-03.2**: KDS MUST visually prioritize tickets using color codes based on preparation age thresholds (Green: < 10m, Yellow: 10-20m, Red Flash: > 20m).
- **FR-03.3**: Kitchen staff MUST be able to update item statuses individually (`Preparing`, `Ready`) or bump entire tickets.

#### FR-04: Live Table & Floor Plan Management
- **FR-04.1**: Administrators MUST be able to design custom floor plan layouts using a drag-and-drop grid system.
- **FR-04.2**: Table nodes MUST reflect realtime statuses: `Available` (Green), `Occupied` (Blue), `Reserved` (Amber), `Dirty / Billing` (Red).
- **FR-04.3**: Waitstaff MUST be able to transfer orders between tables or merge multiple tables into a single session.

#### FR-05: QR Code Table Ordering System
- **FR-05.1**: Guests scanning a table-specific QR code MUST view a mobile-optimized menu without mandatory app installation or registration.
- **FR-05.2**: QR order submissions MUST automatically inject into the active table session and route tickets to the KDS upon online payment confirmation or cashier approval.

#### FR-06: Inventory BOM & Ingredient Tracking
- **FR-06.1**: Every menu item MUST support a Bill of Materials (BOM) mapping specific raw ingredients and quantity deductions.
- **FR-06.2**: Stock levels MUST be automatically deducted in real time upon POS bill finalization.
- **FR-06.3**: System MUST trigger low-stock alerts when ingredient inventory drops below configured reorder thresholds.

#### FR-07: AI Operational Insights & Assistant
- **FR-07.1**: The platform MUST provide daily automated business summaries detailing gross revenue, net margin, peak hour velocity, and top/bottom selling items.
- **FR-07.2**: Users MUST be able to query operational data via a natural language command input (e.g., *"Show me total pizza sales for last Friday"*).

---

### 3.2 Non-Functional Requirements (NFR)

#### NFR-01: Performance & Latency Budgets
- **NFR-01.1**: Client API response time MUST be **< 150ms** (p95) for all transactional endpoints.
- **NFR-01.2**: Realtime message delivery across WebSocket channels MUST occur in **< 100ms**.
- **NFR-01.3**: POS UI MUST maintain **60 FPS** during user interactions and filtering.

#### NFR-02: Availability & Reliability
- **NFR-02.1**: System SLA target is **99.9% uptime** (excluding scheduled maintenance windows).
- **NFR-02.2**: POS client MUST maintain an offline cache (IndexedDB) allowing cashiers to create orders and print receipts during temporary internet outages.

#### NFR-03: Security & Compliance
- **NFR-03.1**: All communications MUST be encrypted in transit via TLS 1.3 and at rest using AES-256.
- **NFR-03.2**: Passwords and PIN codes MUST be hashed using Argon2id or bcrypt with salt.
- **NFR-03.3**: System MUST comply with OWASP Top 10 security standards and sanitize all inputs using Zod validation.

---

## 4. Architecture Alignment

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REQUIREMENTS TRACEABILITY                       │
├───────────────────┬──────────────────────────┬─────────────────────────┤
│ Requirement ID    │ Feature Module           │ Architectural Component │
├───────────────────┼──────────────────────────┼─────────────────────────┤
│ FR-01 (Tenant)    │ `src/modules/core`       │ RLS Policies & Auth Middleware │
│ FR-02 (POS)       │ `src/modules/restaurant` │ Next.js POS Route + Zustand │
│ FR-03 (KDS)       │ `src/modules/restaurant` │ Supabase Realtime Channels │
│ FR-05 (QR Order)  │ `src/modules/restaurant` │ Public Next.js Edge App │
│ FR-06 (Inventory) │ `src/modules/inventory`  │ DB Triggers / Service Layer │
│ FR-07 (AI)        │ `src/modules/ai`         │ OpenAI / Gemini API Agent │
└───────────────────┴──────────────────────────┴─────────────────────────┘
```

---

## 5. Folder & Document References

- Scope Document: `docs/00_Project/PROJECT_SCOPE.md`
- Success Criteria: `docs/00_Project/SUCCESS_CRITERIA.md`
- Restaurant Workflows: `docs/02_Restaurant/RESTAURANT_WORKFLOWS.md`
- Database Schema: `docs/03_Database/DATABASE_SCHEMA.md`

---

## 6. Dependencies

- Supabase Infrastructure (Auth, Realtime PostgreSQL)
- Next.js 14 App Router Framework
- Tailwind CSS & shadcn/ui Component System

---

## 7. Future Expansion

- Aggregator API Integration (v2.1)
- Automated WhatsApp Guest Engagement (v2.2)
- Multi-currency & Cross-country Tax Engines (v2.5)

---

## 8. Best Practices & Guidelines

- **Zero Untested Requirements**: Every functional requirement defined in this PRD must map to an automated unit, integration, or E2E Playwright test case.
- **Traceability in Commits**: Git commit messages must reference requirement IDs (e.g., `feat(pos): implement split billing UI [FR-02.4]`).

---

## 9. Concrete Implementation Examples

### 9.1 Requirement Validation Schema Example
```typescript
// src/modules/restaurant/types/order-validation.ts
import { z } from 'zod';

export const CreateOrderRequirementSchema = z.object({
  branchId: z.string().uuid(),
  tableId: z.string().uuid().optional(),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
  items: z.array(
    z.object({
      menuItemId: z.string().uuid(),
      quantity: z.number().int().positive(),
      selectedModifiers: z.array(z.string().uuid()).default([]),
      notes: z.string().max(250).optional()
    })
  ).min(1, 'Order must contain at least one item'),
  paymentTenders: z.array(
    z.object({
      type: z.enum(['CASH', 'CARD', 'UPI', 'LOYALTY']),
      amount: z.number().positive()
    })
  ).optional()
});

export type CreateOrderInput = z.infer<typeof CreateOrderRequirementSchema>;
```

---

## 10. Developer Notes

- Always ensure form inputs map directly to Zod validation schemas derived from this PRD.
- Do not add undocumented optional fields to backend APIs without updating this PRD.

---

## 11. Common Mistakes to Avoid

- **Ignoring Edge-Case NFRs**: Building POS billing assuming a continuous 100Mbps internet connection. Always build for intermittent offline network conditions.
- **Vague Acceptance Criteria**: Specifying *"system must be fast"* instead of explicit latency budgets like `NFR-01.1` (< 150ms p95).
