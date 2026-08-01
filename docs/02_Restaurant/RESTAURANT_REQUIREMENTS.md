# Restaurant OS Functional & Technical Requirements — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Priority 1 (Flagship SaaS Product)  
> **Related Documents**: [RESTAURANT_VISION.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/RESTAURANT_VISION.md), [ORDER_LIFECYCLE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/ORDER_LIFECYCLE.md)

---

## 1. Purpose

This document establishes the detailed functional, operational, user interface, and integration requirements for the **Trinetra Restaurant OS**. It details the precise expectations for POS Billing, Kitchen Displays, Table Floor Management, Menu Construction, QR Guest Ordering, and Inventory BOM tracking.

---

## 2. Detailed Functional Requirements

### 2.1 POS Billing Engine (REQ-POS)
- **REQ-POS-01 (Speed)**: Search catalog by name, category, or short code with `< 16ms` keyboard search filter response.
- **REQ-POS-02 (Order Types)**: Support Dine-In, Takeaway, Counter Quick-Service, and Delivery orders.
- **REQ-POS-03 (Item Modifiers)**: Select item variations (Size, Base) and optional/mandatory modifier groups (Toppings, Temperature) with quantity adjustments.
- **REQ-POS-04 (Discounts & Price Overrides)**: Apply line-item level discounts or bill-level percentage/flat discounts with mandatory role permission checks (`pos:order:discount`).
- **REQ-POS-05 (Multi-Tender Payments)**: Process split tenders combining Cash, Card, UPI QR, and Customer Credit.
- **REQ-POS-06 (Receipt Dispatch)**: Support thermal receipt printing via ESC/POS Web Bluetooth, Web Serial, or local print server bridge.

### 2.2 Kitchen Display System (REQ-KDS)
- **REQ-KDS-01 (Realtime Ticket Sync)**: Ingest new orders and update line-item preparation statuses via WebSockets within `< 100ms`.
- **REQ-KDS-02 (Station Routing)**: Route individual order line items to specific station screens (e.g., Grill, Fryer, Bar, Assembly).
- **REQ-KDS-03 (Preparation Timers)**: Maintain live timer badges for each ticket, shifting colors dynamically based on target prep time thresholds.
- **REQ-KDS-04 (Bump & Recall)**: Kitchen operators bump completed items/tickets off the screen via touch or physical KDS keypad (`Space` key bump), with a 10-second window to recall accidentally bumped tickets.

### 2.3 Table & Floor Management (REQ-TBL)
- **REQ-TBL-01 (Visual Floor Canvas)**: Render multi-floor visual grid layouts with customizable table shapes (Round, Rectangle), sizes, and labels.
- **REQ-TBL-02 (Live Table Statuses)**: Update table indicators in real time: `AVAILABLE`, `OCCUPIED`, `RESERVED`, `BILLING`, `DIRTY`.
- **REQ-TBL-03 (Session & Order Merging)**: Merge multiple physical tables into one active billing session or transfer items between tables.

### 2.4 Menu & Modifier Management (REQ-MNU)
- **REQ-MNU-01 (Hierarchical Structure)**: Categories -> Subcategories -> Items -> Variants -> Modifier Groups -> Modifiers.
- **REQ-MNU-02 (Dynamic Availability)**: Instantly toggle item out-of-stock state across POS, KDS, and QR Ordering interfaces in `< 100ms`.
- **REQ-MNU-03 (Timed Menus)**: Schedule automatic menu activation based on day part (e.g., Breakfast Menu 7:00 AM - 11:00 AM).

---

## 3. Non-Functional Specifications

- **Performance**: Transactional POS state updates execute in `< 50ms` client memory.
- **Offline Tolerance**: POS buffers pending orders locally in IndexedDB if internet fails, synchronizing idempotently when reconnected.
- **Security**: Mandatory audit logging for all voided bills, refunds, price overrides, and cash drawer opens.

---

## 4. Architecture & Data Traceability

```
[ POS Terminal Input ] ──> [ Order State Manager ] ──> [ Supabase WebSockets ]
                                    │                             │
                                    ▼                             ▼
                          [ Local IndexedDB Cache ]    [ Kitchen KDS Monitors ]
                                    │                             │
                                    └───────> [ Postgres RLS ] <──┘
```

---

## 5. References

- Vision: `docs/02_Restaurant/RESTAURANT_VISION.md`
- Lifecycle: `docs/02_Restaurant/ORDER_LIFECYCLE.md`
- Database: `docs/03_Database/DATABASE_SCHEMA.md`
