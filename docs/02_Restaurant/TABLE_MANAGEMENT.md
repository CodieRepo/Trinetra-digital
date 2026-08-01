# Table & Floor Plan Management Specification — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Priority 1 (Flagship SaaS Product)  
> **Related Documents**: [POS_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/POS_SYSTEM.md), [ORDER_LIFECYCLE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/ORDER_LIFECYCLE.md)

---

## 1. Purpose

This document specifies the interactive table floor plan editor, live occupancy state tracking engine, table session lifecycle, table merge/transfer operations, and guest seating workflow for **Trinetra Restaurant OS**.

---

## 2. Floor Canvas Grid & Visual Coordinates

The floor plan layout engine represents table nodes on a 2D coordinate grid system (1000px x 1000px virtual canvas normalized for screen resolution):

```typescript
// src/modules/restaurant/types/table-canvas.ts

export type TableShape = 'SQUARE' | 'ROUND' | 'RECTANGLE';

export type TableStatus = 
  | 'AVAILABLE' 
  | 'OCCUPIED' 
  | 'RESERVED' 
  | 'BILLING' 
  | 'DIRTY';

export interface TableNode {
  id: string;
  branchId: string;
  floorId: string;
  label: string; // e.g. "T-01"
  capacity: number;
  shape: TableShape;
  status: TableStatus;
  positionX: number; // Grid X coordinate (0 - 1000)
  positionY: number; // Grid Y coordinate (0 - 1000)
  activeOrderId?: string;
  activeSessionStartedAt?: string;
}
```

---

## 3. Table Status State Transitions

```
                    ┌──────────────┐
                    │  AVAILABLE   │ (Green - Ready for Guest Seating)
                    └──────┬───────┘
                           │ Event: SEAT_GUEST / OPEN_ORDER
                           ▼
                    ┌──────────────┐
                    │   OCCUPIED   │ (Blue - Order Active / Dining)
                    └──────┬───────┘
                           │ Event: PRINT_BILL
                           ▼
                    ┌──────────────┐
                    │   BILLING    │ (Amber - Bill Presented / Awaiting Payment)
                    └──────┬───────┘
                           │ Event: COMPLETE_PAYMENT
                           ▼
                    ┌──────────────┐
                    │    DIRTY     │ (Red - Guest Departed / Busser Needed)
                    └──────┬───────┘
                           │ Event: CLEAN_TABLE
                           ▼
                    ┌──────────────┐
                    │  AVAILABLE   │
                    └──────────────┘

  [ RESERVED State Transition ]
  AVAILABLE  ──(Event: BOOK_RESERVATION)──>  RESERVED (Purple - Linked to Reservation ID)
```

---

## 4. Table Merge & Transfer Operations

Waitstaff can merge multiple physical tables into one unified billing session, or transfer an active order from Table A to Table B:

```typescript
// src/modules/restaurant/services/table-session.ts

export interface TransferTablePayload {
  sourceTableId: string;
  destinationTableId: string;
  orderId: string;
  staffUserId: string;
}

export function validateTableTransfer(
  sourceTable: TableNode,
  destTable: TableNode
): boolean {
  if (sourceTable.status !== 'OCCUPIED') return false;
  if (destTable.status !== 'AVAILABLE') return false;
  return true;
}
```

---

## 5. Developer & Security Notes

- Table drag-and-drop editing is locked behind `settings:manage_branch` permission.
- Floor plan state changes broadcast in real time across all connected POS terminals and waiter tablets via Supabase WebSockets.
