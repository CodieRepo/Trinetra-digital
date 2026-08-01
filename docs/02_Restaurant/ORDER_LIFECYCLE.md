# Order Lifecycle & State Machine Specification — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Priority 1 (Flagship SaaS Product)  
> **Related Documents**: [RESTAURANT_REQUIREMENTS.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/RESTAURANT_REQUIREMENTS.md), [POS_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/POS_SYSTEM.md)

---

## 1. Purpose

This document provides the formal mathematical and state machine specification for an order's entire lifecycle within **Trinetra v2.0 Restaurant OS**. It defines valid order states, state transition triggers, side-effect actions (KDS ticket creation, inventory deduction, table status mutation), and invariant validation rules.

---

## 2. Order Lifecycle State Machine

```
                   ┌──────────────┐
                   │  DRAFT / CART│ (Client Memory / Guest QR Cart)
                   └──────┬───────┘
                          │ Event: SUBMIT_ORDER
                          ▼
                   ┌──────────────┐
                   │    PLACED    │ (Persisted in DB / Injected into KDS)
                   └──────┬───────┘
                          │ Event: KITCHEN_ACCEPT / START_PREP
                          ▼
                   ┌──────────────┐
                   │  PREPARING   │ (Active on KDS Stations)
                   └──────┬───────┘
                          │ Event: KITCHEN_READY / BUMP
                          ▼
                   ┌──────────────┐
                   │ READY_TO_SERVE│ (Notifies Waiter / Runner)
                   └──────┬───────┘
                          │ Event: MARK_SERVED
                          ▼
                   ┌──────────────┐
                   │    SERVED    │ (Active Table Session open)
                   └──────┬───────┘
                          │ Event: GENERATE_BILL
                          ▼
                   ┌──────────────┐
                   │   BILLING    │ (Bill Printed / Payment Pending)
                   └──────┬───────┘
                          │ Event: PAYMENT_COMPLETE
                          ▼
                   ┌──────────────┐
                   │    PAID      │ (Triggers Inventory BOM Deduction)
                   └──────┬───────┘
                          │ Event: CLOSE_SESSION
                          ▼
                   ┌──────────────┐
                   │   CLOSED     │ (Finalized / Archived)
                   └──────────────┘

  [ CANCELLED State Transition ]
  DRAFT / PLACED / PREPARING  ──(Event: CANCEL_ORDER)──>  CANCELLED (Requires Reason & Audit)
```

---

## 3. State Transition Matrix & Side Effects

| From State | Event Trigger | To State | Mandatory Side Effects & DB Actions | Required Permission |
| :--- | :--- | :--- | :--- | :--- |
| `DRAFT` | `SUBMIT_ORDER` | `PLACED` | Insert into `orders` and `order_items`; emit `order.placed` WebSocket event; set table to `OCCUPIED`. | `pos:order:create` or Public QR |
| `PLACED` | `KITCHEN_ACCEPT`| `PREPARING` | Update `order_items.status = PREPARING`; start KDS prep timer. | `kds:ticket:update` |
| `PREPARING`| `KITCHEN_READY` | `READY_TO_SERVE`| Update KDS station status; trigger waiter notification sound/badge. | `kds:ticket:update` |
| `READY_TO_SERVE`| `MARK_SERVED`| `SERVED` | Update item status to `SERVED`. | `pos:order:update` |
| `SERVED` | `GENERATE_BILL` | `BILLING` | Lock order items from further edits; compute taxes & totals; emit thermal print payload; set table to `BILLING`. | `pos:order:bill` |
| `BILLING` | `PAYMENT_COMPLETE`| `PAID` | Record `payments` ledger entries; execute recipe BOM stock deductions; set table to `DIRTY`. | `pos:order:pay` |
| `PAID` | `CLOSE_SESSION` | `CLOSED` | Clear table assignment; set table to `AVAILABLE`. | `pos:order:close` |
| `ANY` (Pre-Paid)| `CANCEL_ORDER` | `CANCELLED` | Record void reason; emit `order.cancelled` to KDS; release table if empty; log audit event. | `pos:order:void` |

---

## 4. Architecture Implementation

### 4.1 Order Lifecycle Enum Definition
```typescript
// src/modules/restaurant/types/order-lifecycle.ts

export type OrderStatus = 
  | 'DRAFT'
  | 'PLACED'
  | 'PREPARING'
  | 'READY_TO_SERVE'
  | 'SERVED'
  | 'BILLING'
  | 'PAID'
  | 'CLOSED'
  | 'CANCELLED';

export type OrderEvent = 
  | 'SUBMIT_ORDER'
  | 'KITCHEN_ACCEPT'
  | 'KITCHEN_READY'
  | 'MARK_SERVED'
  | 'GENERATE_BILL'
  | 'PAYMENT_COMPLETE'
  | 'CLOSE_SESSION'
  | 'CANCEL_ORDER';

export interface StateTransitionGuard {
  from: OrderStatus[];
  to: OrderStatus;
  permissionRequired: string;
}

export const ORDER_TRANSITION_RULES: Record<OrderEvent, StateTransitionGuard> = {
  SUBMIT_ORDER: { from: ['DRAFT'], to: 'PLACED', permissionRequired: 'pos:order:create' },
  KITCHEN_ACCEPT: { from: ['PLACED'], to: 'PREPARING', permissionRequired: 'kds:ticket:update' },
  KITCHEN_READY: { from: ['PREPARING'], to: 'READY_TO_SERVE', permissionRequired: 'kds:ticket:update' },
  MARK_SERVED: { from: ['READY_TO_SERVE'], to: 'SERVED', permissionRequired: 'pos:order:update' },
  GENERATE_BILL: { from: ['SERVED', 'PLACED'], to: 'BILLING', permissionRequired: 'pos:order:bill' },
  PAYMENT_COMPLETE: { from: ['BILLING'], to: 'PAID', permissionRequired: 'pos:order:pay' },
  CLOSE_SESSION: { from: ['PAID'], to: 'CLOSED', permissionRequired: 'pos:order:close' },
  CANCEL_ORDER: { from: ['DRAFT', 'PLACED', 'PREPARING', 'READY_TO_SERVE', 'BILLING'], to: 'CANCELLED', permissionRequired: 'pos:order:void' }
};
```

---

## 5. Developer Notes & Invariants

- **Invariant 1**: An order in `BILLING` state cannot be edited without first transitioning back to `SERVED` via an explicit manager override.
- **Invariant 2**: Inventory BOM stock deduction must occur **exactly once** upon transition to `PAID` within a database transaction.
- **Invariant 3**: Cancellations of orders in `PREPARING` or `READY_TO_SERVE` require a recorded waste reason (e.g., "Guest Left", "Kitchen Mistake") for food cost audit tracking.
