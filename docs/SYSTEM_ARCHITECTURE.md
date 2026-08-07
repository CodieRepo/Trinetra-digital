# Trinetra Restaurant OS — System Architecture Specification

> [!IMPORTANT]
> **Document Status**: Draft for Review (Milestone 1 — Document 1 of 8)  
> **Source of Truth Alignment**: [AGENTS.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/AGENTS.md) & [docs/DEVELOPMENT_BACKLOG.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/DEVELOPMENT_BACKLOG.md)

---

## 1. Architectural Philosophy & High-Level Overview

Trinetra Restaurant OS is a standalone, commercial, multi-tenant SaaS platform built to handle real-world, high-concurrency restaurant operations. It operates independently from provisioning systems (such as the Trinetra CRM Super Admin Portal) and focuses strictly on high-speed, reliable operational execution.

### Key Architectural Pillars
1. **Tenant & Branch Hierarchy**: Every single record is strictly tied to a `tenant_id` (Organization/Restaurant Entity) and a `branch_id` (Physical Location).
2. **Deterministic Data Integrity**: Financial operations (bills, taxes, discounts, payments) and inventory transactions (stock deductions, recipe BOM consumption, waste) rely on ACID-compliant database operations and immutable audit event streams.
3. **High-Speed Operational Touchpoints**: Floor POS and Kitchen Display Systems (KDS) prioritize minimum click counts, touch/keyboard efficiency, and low-latency realtime synchronization (< 3 seconds).
4. **Resilient Decoupled Architecture**: Realtime UI updates operate asynchronously alongside database mutations to ensure POS responsiveness is never bottlenecked by network lag or rendering queues.

---

## 2. System Context & Component Architecture

The software is structured into four main conceptual layers:
- **Client Presentation Layer**: Mobile, Tablet, and Desktop UI built with Next.js (React), TailwindCSS, and `shadcn/ui`.
- **API & Application Gateway Layer**: Next.js Server Components, API Route Handlers, and Edge Middleware for request routing, session validation, and validation schemas.
- **Data & Persistence Layer**: Supabase PostgreSQL with strict Row Level Security (RLS) policies, Realtime Engine (WebSockets), and Storage buckets.
- **Hardware Integration Layer**: Browser-native thermal printing interface targeting 80mm receipt printers and 58mm/80mm kitchen ticket printers.

```mermaid
graph TD
    subgraph Client Layer (Devices)
        A[Waiter Tablet / Mobile]
        B[Fixed Cashier POS]
        C[Kitchen Display Screen / Printer]
        D[Owner / Manager Dashboard]
    end

    subgraph Application & Gateway Layer (Next.js 15)
        E[Edge Middleware / Auth Guards]
        F[API Route Handlers / Server Actions]
        G[Print Abstraction Service]
    end

    subgraph Data & Persistence Layer (Supabase / Postgres)
        H[(PostgreSQL Engine)]
        I[Supabase Auth Service]
        J[Supabase Realtime WebSocket Gateway]
    end

    A -->|HTTPS / WSS| E
    B -->|HTTPS / WSS| E
    C -->|WSS / Local Thermal Print| E
    D -->|HTTPS| E

    E -->|Session & PIN Validation| I
    E -->|REST / RPC API Calls| F
    F -->|RLS-Scoped Queries / Transactions| H
    H -->|CDC Postgres Changes| J
    J -->|Realtime Events Broadcast| A
    J -->|Realtime Events Broadcast| B
    J -->|Realtime Order Tickets| C
    B -->|Direct Thermal Print Commands| G
```

---

## 3. Module Boundaries & System Core

To prevent tight coupling, the Restaurant OS is partitioned into clear, self-contained business modules.

```mermaid
graph LR
    subgraph Core Restaurant OS Modules
        M1[Auth & Staff RBAC]
        M2[Restaurant & Branch Settings]
        M3[Menu & Modifier Engine]
        M4[Floor & Table Management]
        M5[Customer Sessions]
        M6[POS & Order Entry]
        M7[Kitchen Display System - KDS]
        M8[Billing & Tax Engine]
        M9[Basic Inventory & BOM]
        M10[Financial Audit & Logs]
    end

    M1 --> M4
    M1 --> M6
    M2 --> M8
    M3 --> M6
    M3 --> M9
    M4 --> M5
    M5 --> M6
    M6 --> M7
    M6 --> M9
    M6 --> M8
    M8 --> M10
    M9 --> M10
```

### Module Responsibilities

| Module | Core Responsibility | Key Inputs | Key Outputs |
|--------|---------------------|------------|-------------|
| **Auth & Staff RBAC** | Identity verification, Quick PIN auth, role permissions | Email/Password, PIN, Device Session | Auth Tokens, Context Claims (`tenant_id`, `branch_id`, `role`) |
| **Branch Settings** | Operating hours, GSTIN, FSSAI, tax rates, header info | Config Forms | Tax rules, Receipt metadata |
| **Menu & Modifiers** | Categories, Menu items, Modifier groups, 86'd status | Admin Edits, Kitchen 86 Signals | Filtered active menu, Available stock items |
| **Floor & Tables** | Zones, Table layouts, Seating status (Available, Seated, Cleaning) | Layout Config, Session Events | Realtime Floor State |
| **Sessions** | Guest count, open table tracking, session lifecycle | Seating actions, Bill settlements | Active Session ID, Session Duration |
| **POS & Order Entry** | Order creation (Dine-in/Takeaway), Item additions, Modifiers, Notes, Voids | Staff Taps, Waiter PINs | Order Records, Cancel Alerts, Running Totals |
| **KDS & Kitchen** | Ticket queuing, prep status, ticket printing | POS Orders, Waiter Cancels | Order Ready Status, Printed Kitchen Tickets |
| **Billing & Tax** | Tax calculation (CGST/SGST), Bill splitting, Discounts, Payment recording | Active Orders, Payment Inputs | Printed Receipts, Immutable Invoices, Payment Records |
| **Basic Inventory** | Recipe (BOM) management, Stock In, Stock Out, Waste logging, Auto-deduction | Order Fulfillments, Manual Stock Entry | Current Stock Levels, Low Stock Alerts, Waste Logs |
| **Audit & Logging** | Financial security, void tracking, discount approvals | System Mutations | Immutable Audit Trail |

---

## 4. End-to-End Operational Lifecycle

The architecture maps directly to the physical day-to-day lifecycle of an operating restaurant:

```mermaid
stateDiagram-v2
    [*] --> DayStart: Manager Opens Branch / EOD Boundary Start
    
    state "Daily Service Operations" as Service {
        DayStart --> CustomerArrival: Dine-in / Takeaway Arrives
        CustomerArrival --> TableSeated: Assign Table & Record Guest Count (Dine-in)
        CustomerArrival --> TakeawayOpened: Open Takeaway Session (No Table)
        
        TableSeated --> OrderEntry: POS Order Created
        TakeawayOpened --> OrderEntry: POS Order Created
        
        OrderEntry --> KitchenPrep: Send Order to Kitchen (Realtime / Print)
        
        state KitchenPrep {
            [*] --> OrderReceived: KDS / Printer Receives Ticket
            OrderReceived --> InPreparation: Staff Starts Cooking
            InPreparation --> ReadyForService: Marked Ready (Stock Auto-Deducted via BOM)
        }
        
        KitchenPrep --> Served: Food Served to Guest
        Served --> AdditionalOrders: Additional Items Requested (Optional)
        AdditionalOrders --> OrderEntry
        
        Served --> BillRequested: Customer Requests Bill
        BillRequested --> DiscountApproval: Manager Discount / Void Applied (If needed)
        DiscountApproval --> PaymentProcessing: Cash / Card / UPI Settlement
        BillRequested --> PaymentProcessing
        
        PaymentProcessing --> InvoicePrinted: Tax Invoice Generated & Printed
        InvoicePrinted --> SessionClosed: Table Session Closed
    }
    
    SessionClosed --> TableCleaning: Table Set to Cleaning
    TableCleaning --> DayStart: Table Available Again
    
    Service --> DayClose: EOD Closure & Daily Sales Reconciliation
    DayClose --> [*]
```

---

## 5. Authentication & Session Management Flow

To support busy restaurant environments, staff members authenticate using a **Dual-Mode System**:
1. **Administrative Login**: Email + Password for Restaurant Owners/Managers (Primary Login & Device Setup).
2. **Quick Terminal PIN Login**: 4 to 6-digit PINs for shared floor tablets, allowing Waiters and Cashiers to switch context in under 3 seconds without losing active order state.

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Waiter / Staff Member
    participant Device as Shared Tablet POS
    participant Middleware as Next.js Middleware / Auth Edge
    participant Auth as Supabase Auth Service
    participant DB as Postgres Database

    Note over Staff, Device: Initial Device Registration (Owner Setup)
    Device->>Middleware: Device Init Request with Admin Credentials
    Middleware->>Auth: Validate Owner Account
    Auth-->>Device: Set Secure Long-Lived Device Session Cookie

    Note over Staff, Device: Fast Staff Context Switch (Daily Usage)
    Staff->>Device: Enter 4-Digit Staff PIN (e.g. 4567)
    Device->>Middleware: Validate PIN (PIN + Branch ID + Device Token)
    Middleware->>DB: Query `restaurant_staff` with SHA256(PIN) & Branch ID
    DB-->>Middleware: Return Staff Identity & Assigned Role (`waiter`)
    Middleware-->>Device: Issue Short-Lived JWT Staff Context Claims

    Note over Device: Device switches active context to Staff Member instantly
```

---

## 6. Authorization & Tenant Isolation Flow

Security is built around strict multi-tenancy. Data leakage across restaurants or branches is mathematically prevented using **Row Level Security (RLS)** policies embedded in PostgreSQL.

```mermaid
sequenceDiagram
    autonumber
    actor User as POS Cashier
    participant Client as Next.js Client App
    participant Route as API Gateway / RPC Endpoint
    participant Postgres as PostgreSQL Engine (RLS)

    User->>Client: Apply 10% Discount on Order
    Client->>Route: POST /api/orders/discount (JWT Token + Payload)
    Route->>Route: Extract `tenant_id`, `branch_id`, `user_role` from JWT
    Route->>Postgres: Execute Mutation (Set JWT Claims in Transaction)
    
    Note over Postgres: RLS Policy Evaluation:
    Note over Postgres: 1. `tenant_id` matches current JWT claim?
    Note over Postgres: 2. `branch_id` matches current JWT claim?
    Note over Postgres: 3. `user_role` IN ('owner', 'manager')?
    
    alt Policy Passed
        Postgres->>Postgres: Update Order & Write Immutable Audit Record
        Postgres-->>Route: Mutation Success (Updated Totals)
        Route-->>Client: 200 OK Response
    else Policy Failed (Unauthorized)
        Postgres-->>Route: RLS Violation Error
        Route-->>Client: 403 Forbidden Response
    end
```

---

## 7. Realtime Synchronization Architecture

Realtime updates drive kitchen ticket feeds and table status boards without requiring constant manual page refreshes.

```mermaid
sequenceDiagram
    autonumber
    actor Waiter as Waiter Tablet
    participant Gateway as Supabase Realtime Server
    participant DB as Postgres DB (Change Data Capture)
    actor Kitchen as Kitchen KDS Display

    Kitchen->>Gateway: Subscribe Channel: `realtime:restaurant_orders:branch_123`
    Gateway-->>Kitchen: Channel Subscribed (Ack)

    Waiter->>DB: Submit Order (Insert `restaurant_orders` & `restaurant_order_items`)
    DB->>DB: Commit Transaction & Write WAL Entry

    DB->>Gateway: CDC Trigger: Logical Replication Event (INSERT order_id=987)
    Gateway->>Gateway: Filter Subscribers by `branch_id` Scope
    Gateway-->>Kitchen: Broadcast Event `ORDER_CREATED` (Order & Item Payload)
    
    Note over Kitchen: KDS UI updates instantly (< 300ms) & triggers Audio Alert / Thermal Print
```

---

## 8. Request & Data Lifecycle (Order-to-Billing)

This section traces a full API request lifecycle for an incoming dine-in order, highlighting transaction safety, inventory deductions, and audit logging.

```mermaid
sequenceDiagram
    autonumber
    actor Waiter as Waiter POS
    participant API as Order Service Gateway
    participant DB as Postgres Engine
    participant Realtime as Realtime Engine

    Waiter->>API: POST /api/v1/orders (Items, Quantities, Table ID, Waiter PIN)
    API->>API: Validate Input Schemas & PIN Permissions
    
    rect rgb(240, 248, 255)
        Note over API, DB: Atomic DB Transaction Starts
        API->>DB: 1. Validate Table Session is `active`
        API->>DB: 2. Insert `restaurant_orders` record (Status = 'placed')
        API->>DB: 3. Bulk Insert `restaurant_order_items`
        API->>DB: 4. Query Recipe BOM & Deduct Ingredient Inventories
        API->>DB: 5. Write Inventory Stock Movement Log (`stock_out`)
        API->>DB: 6. Insert Order Event Audit (`order_placed`)
        API->>DB: Commit Transaction
    end

    DB-->>API: Transaction Committed Successfully
    API->>Realtime: Broadcast `ORDER_PLACED` Payload
    API-->>Waiter: 201 Created (Order ID & Running Total)
```

---

## 9. Structural Summary & Next Architectural Steps

This `SYSTEM_ARCHITECTURE.md` document establishes the top-level blueprint for Trinetra Restaurant OS. It satisfies all Milestone 1 overarching architectural requirements by detailing:
- Decoupled client, gateway, data, and hardware integration boundaries.
- Clean separation across all 10 core functional modules.
- Complete operational state machine matching real Indian restaurant workflows.
- Dual-mode authentication (Email/Password + Quick PIN) for shared POS terminals.
- Native multi-tenant / multi-branch authorization via PostgreSQL RLS.
- High-concurrency realtime synchronization architecture via Change Data Capture.

---

> [!NOTE]
> **Next Recommended Step**: Upon approval of this document, we will proceed to **Document 2 of 8: `DOMAIN_MODEL.md`** to formalize all business entities, attributes, lifecycles, and ownership rules without SQL.
