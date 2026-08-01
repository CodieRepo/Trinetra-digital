# POS System Architecture & Keyboard-First Specification — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Priority 1 (Flagship SaaS Product)  
> **Related Documents**: [ORDER_LIFECYCLE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/ORDER_LIFECYCLE.md), [DESIGN_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/05_Design/DESIGN_SYSTEM.md)

---

## 1. Purpose

This document provides the complete technical design, keyboard navigation mapping, state management architecture, receipt printing pipeline, and UI layout for the **Trinetra POS System**. Designed for high-volume food service cashiers, the POS prioritizes zero-perceived-latency keyboard operation over mouse clicks.

---

## 2. UI Layout Architecture

The POS screen is split into three high-efficiency zones:

```
┌────────────────────────────────────────────────────────────────────────┐
│ [ZONE A: TOP HEADER BAR]                                              │
│ Branch: Downtown Outlet | Cashier: Alex M. | Terminal: POS-01 | Cmd+K  │
├──────────────────────────────────────┬─────────────────────────────────┤
│ [ZONE B: CATALOG & FILTER GRID]      │ [ZONE C: ACTIVE CART & CHECKOUT]│
│ ┌──────────────────────────────────┐ │ Active Table: T-04 (Floor 1)    │
│ │ [Search Menu...] (Press '/')     │ │ Order Type: DINE-IN             │
│ └──────────────────────────────────┘ │ ─────────────────────────────── │
│ Categories: [All] [Pizza] [Drinks]   │ 1x Margherita Pizza     $14.00  │
│ ┌──────────┐ ┌──────────┐ ┌────────┐ │    + Extra Cheese       +$2.00  │
│ │Margherita│ │Pepperoni │ │ Coke   │ │ 2x Iced Tea             $6.00  │
│ │  $14.00  │ │  $16.50  │ │ $3.00  │ │ ─────────────────────────────── │
│ └──────────┘ └──────────┘ └────────┘ │ Subtotal:              $22.00  │
│ [Grid Items filterable by Hotkeys]   │ Tax (8%):               $1.76  │
│                                      │ Total:                 $23.76  │
│                                      │ [F1: Send KDS]  [F2: Checkout] │
└──────────────────────────────────────┴─────────────────────────────────┘
```

---

## 3. Keyboard Shortcut (Hotkey) Standard Mapping

To achieve high-speed cashier execution, every critical workflow maps to standard keyboard shortcuts:

| Hotkey Combination | Action Trigger | System Execution |
| :--- | :--- | :--- |
| `/` or `Ctrl+F` | Focus Search Input | Jump cursor immediately to catalog search field. |
| `F1` | Send Order to KDS | Validate active cart -> Persist `PLACED` order -> Emit WebSocket event to KDS. |
| `F2` | Open Checkout Modal | Open payment tender selection modal. |
| `F3` | Table Selection Canvas| Open visual floorplan selector. |
| `F4` | Toggle Order Type | Cycle order type: `DINE_IN` -> `TAKEAWAY` -> `DELIVERY`. |
| `F8` | Apply Bill Discount | Open manager-protected discount input modal. |
| `F12` or `Ctrl+P` | Quick Pay & Print | Process exact cash/card payment and dispatch thermal receipt. |
| `Escape` | Clear / Cancel Modal | Close open dialog or clear active search filter. |
| `+` / `-` | Quantity Adjust | Increment / decrement selected line item quantity in cart. |

---

## 4. Split Payment & Multi-Tender Engine

Cashiers must be able to split a single bill total across arbitrary payment methods:

```typescript
// src/modules/restaurant/types/pos-payment.ts

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI_QR' | 'CUSTOMER_CREDIT' | 'GIFT_CARD';

export interface PaymentTender {
  id: string;
  method: PaymentMethod;
  amountCents: number;
  transactionRef?: string;
  processedAt: string;
}

export interface SplitPaymentState {
  orderTotalCents: number;
  tenders: PaymentTender[];
}

export function calculateRemainingBalance(state: SplitPaymentState): number {
  const paidCents = state.tenders.reduce((sum, t) => sum + t.amountCents, 0);
  return Math.max(0, state.orderTotalCents - paidCents);
}
```

---

## 5. ESC/POS Thermal Receipt Printing Pipeline

Thermal receipt printing bypasses browser dialogs using direct ESC/POS command byte stream construction dispatched via Web Bluetooth or Web Serial APIs:

```typescript
// src/modules/restaurant/services/receipt-printer.ts

export function buildEscPosReceiptBuffer(orderData: {
  restaurantName: string;
  branchAddress: string;
  orderNumber: string;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
}): Uint8Array {
  const bytes: number[] = [];

  // ESC @ (Initialize printer)
  bytes.push(0x1B, 0x40);

  // ESC a 1 (Center align header)
  bytes.push(0x1B, 0x61, 0x01);
  // Double height/width text for Title
  bytes.push(0x1D, 0x21, 0x11);
  appendString(bytes, `${orderData.restaurantName}\n`);
  
  // Normal text alignment left
  bytes.push(0x1D, 0x21, 0x00);
  bytes.push(0x1B, 0x61, 0x00);
  appendString(bytes, `${orderData.branchAddress}\n`);
  appendString(bytes, `--------------------------------\n`);
  appendString(bytes, `Order #${orderData.orderNumber}\n`);
  appendString(bytes, `--------------------------------\n`);

  for (const item of orderData.items) {
    const line = `${item.qty}x ${item.name.padEnd(18)} $${item.price.toFixed(2)}\n`;
    appendString(bytes, line);
  }

  appendString(bytes, `--------------------------------\n`);
  appendString(bytes, `TOTAL: $${orderData.total.toFixed(2)}\n\n`);

  // GS V 66 0 (Full Cut)
  bytes.push(0x1D, 0x56, 0x42, 0x00);

  return new Uint8Array(bytes);
}

function appendString(bytes: number[], text: string) {
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i));
  }
}
```

---

## 6. Developer & Security Notes

- **Offline POS Persistence**: Active carts update Zustand store and sync asynchronously to browser `IndexedDB` every 2 seconds.
- **PIN Quick-Switch**: Cashiers can switch active user sessions in < 1 second by entering a 4-digit PIN on the POS key pad without reloading the app.
