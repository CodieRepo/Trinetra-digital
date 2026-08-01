# Realtime Event Catalog & Schema Registry — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Platform Event Bus Core  
> **Related Documents**: [REALTIME_ARCHITECTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/REALTIME_ARCHITECTURE.md)

---

## 1. Purpose

This document serves as the canonical schema registry for all realtime events emitted across **Trinetra v2.0**. It defines topic channels, producer components, consumer subscribers, and TypeScript event payloads.

---

## 2. Event Registry Table

| Event Key | Channel Topic Pattern | Producer Component | Consumer Subscribers |
| :--- | :--- | :--- | :--- |
| `order.placed` | `realtime:branch:{branchId}:pos` | POS Terminal / QR Webhook | KDS Displays, Table Canvas, Manager Devices |
| `order.billed` | `realtime:branch:{branchId}:pos` | POS Billing Module | Table Floorplan, Waiter Tablets |
| `order.paid` | `realtime:branch:{branchId}:pos` | Payment Gateway / POS | Inventory BOM Engine, Daily Sales Aggregator |
| `order.cancelled`| `realtime:branch:{branchId}:pos` | POS Order Void Module | KDS Displays, Kitchen Stations |
| `kds.item_bumped`| `realtime:branch:{branchId}:kds` | Kitchen Bump Bar | Expediter Screen, Waiter Notification System |
| `table.status_changed` | `realtime:branch:{branchId}:tables` | Floorplan Manager | Hostess Desk, POS Terminals |
| `menu.stock_toggled` | `realtime:branch:{branchId}:menu` | Menu Management | POS Catalog Grid, Guest QR Menu |

---

## 3. TypeScript Payload Schemas

```typescript
// src/modules/core/events/event-catalog.ts
import { z } from 'zod';

export const OrderPlacedEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('order.placed'),
  branchId: z.string().uuid(),
  timestamp: z.string().datetime(),
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  tableId: z.string().uuid().optional(),
  tableLabel: z.string().optional(),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
  totalAmountCents: z.number().int().positive(),
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      name: z.string(),
      quantity: z.number().int().positive(),
      stationType: z.string(),
      modifiers: z.array(z.string())
    })
  )
});

export type OrderPlacedEventPayload = z.infer<typeof OrderPlacedEventSchema>;
```
