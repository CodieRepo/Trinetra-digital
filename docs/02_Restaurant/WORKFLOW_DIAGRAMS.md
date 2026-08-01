# Operational Workflow Diagrams — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Priority 1 — Restaurant OS Operational Core  
> **Related Documents**: [ORDER_LIFECYCLE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/ORDER_LIFECYCLE.md), [BUSINESS_RULES.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/BUSINESS_RULES.md)

---

## 1. Purpose

This document provides visual, end-to-end Mermaid workflow diagrams for the 10 primary operational flows in **Trinetra Restaurant OS**.

---

## 2. Operational Workflows (Mermaid Diagrams)

### 2.1 Flow 1: Dine-In Order Lifecycle Workflow

```mermaid
graph TD
    A["Guest Seated at Table"] --> B["Waitstaff / Cashier Opens Table on POS"]
    B --> C["Select Items, Variants & Modifiers"]
    C --> D{"Submit Order (F1)"}
    D --> E["Persist Order in DB (PLACED)"]
    E --> F["Broadcast WebSocket to Kitchen KDS"]
    E --> G["Update Table Canvas to OCCUPIED"]
    F --> H["Kitchen Prepares Dish"]
    H --> I["KDS Bump (READY_TO_SERVE)"]
    I --> J["Runner Serves Dish to Table (SERVED)"]
    J --> K["Guest Requests Bill"]
    K --> L["POS Prints Bill (BILLING)"]
    L --> M["Payment Processed (PAID)"]
    M --> N["Deduct Inventory BOM Stock"]
    N --> O["Table Cleared & Reset (AVAILABLE)"]
```

---

### 2.2 Flow 2: QR Guest Self-Ordering & Payment Injection Workflow

```mermaid
graph TD
    A1["Guest Scans Table QR Code"] --> B1["Open Mobile PWA Menu"]
    B1 --> C1["Add Items to Cart & Select Modifiers"]
    C1 --> D1["Click Checkout & Pay Online"]
    D1 --> E1["Razorpay / Stripe Payment Gateway"]
    E1 -- Payment Success --> F1["Webhook Triggers Order Creation (PLACED)"]
    F1 --> G1["Inject Ticket into KDS Screen"]
    F1 --> H1["Update Table Status to OCCUPIED on POS"]
    E1 -- Payment Failed --> I1["Show Error Toast to Guest & Retain Cart"]
```

---

### 2.3 Flow 3: Kitchen KDS Station Bump & Routing Workflow

```mermaid
graph TD
    A2["Order Placed (POS / QR)"] --> B2["Station Router Processes Items"]
    B2 --> C2["Drink Items -> Bar KDS Monitor"]
    B2 --> D2["Pizzas -> Pizza Station KDS"]
    B2 --> E2["Steaks -> Grill Station KDS"]
    C2 & D2 & E2 --> F2["Kitchen Staff Prep Dish"]
    F2 --> G2["Press Bump Key on Bump Bar"]
    G2 --> H2["Item Status -> READY"]
    H2 --> I2["Expediter Screen Updates Ticket"]
```

---

### 2.4 Flow 4: Takeaway / Counter Quick-Service Workflow

```mermaid
graph TD
    A3["Customer Arrives at Counter"] --> B3["Cashier Inputs Takeaway Order"]
    B3 --> C3["Immediate Cashier Checkout & Pay (F12)"]
    C3 --> D3["Print Receipt + Order Token #"]
    D3 --> E3["Route Order to Kitchen KDS"]
    E3 --> F3["Kitchen Marks Ready"]
    F3 --> G3["Counter Display Flashes Token #"]
    G3 --> H3["Customer Pick Up & Close"]
```

---

### 2.5 Flow 5: Daily Shift Closing & Cash Reconciliation Workflow

```mermaid
graph TD
    A4["Manager Initiates Shift Close"] --> B4{"Active Orders Pending?"}
    B4 -- Yes --> C4["Block Closing & List Pending Orders"]
    B4 -- No --> D4["Prompt Manager for Physical Cash Count"]
    D4 --> E4["Calculate Expected Cash: Initial + Sales - Payouts"]
    E4 --> F4{"Discrepancy > $5.00?"}
    F4 -- Yes --> G4["Flag Audit Log & Send Email Alert"]
    F4 -- No --> H4["Generate Z-Report Summary & Lock Shift"]
```

---

### 2.6 Flow 6: Order Void & Refund Exception Workflow

```mermaid
graph TD
    A5["Request Order Void / Refund"] --> B5{"Role = MANAGER?"}
    B5 -- No --> C5["Display Manager PIN Prompt Modal"]
    B5 -- Yes --> D5["Select Void Reason (Guest Left, Wrong Entry)"]
    D5 --> E5["Persist Order Status -> CANCELLED"]
    E5 --> F5["Emit CANCEL Ticket to KDS"]
    F5 --> G5["Write Immutable Record to Audit Log"]
```
