# Kitchen Display System (KDS) Specification — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Priority 1 (Flagship SaaS Product)  
> **Related Documents**: [ORDER_LIFECYCLE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/ORDER_LIFECYCLE.md), [REALTIME_ARCHITECTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/REALTIME_ARCHITECTURE.md)

---

## 1. Purpose

This document details the software architecture, realtime WebSocket synchronization, station routing logic, preparation timer thresholding, and bump bar user experience for the **Trinetra Kitchen Display System (KDS)**. The KDS replaces traditional paper Kitchen Order Tickets (KOT) with high-visibility, zero-latency digital monitors.

---

## 2. KDS Screen Architecture & Layout

The KDS screen arranges active kitchen order tickets into a responsive grid column layout:

```
┌────────────────────────────────────────────────────────────────────────┐
│ STATION: PIZZA & OVEN | KDS-02 | Active Tickets: 4 | Shift Target: <12m │
├──────────────┬──────────────┬──────────────┬───────────────────────────┤
│ TICKET #104  │ TICKET #105  │ TICKET #106  │ TICKET #107               │
│ Table: T-02  │ Takeaway     │ Table: T-05  │ QR Dine-In (T-01)         │
│ Time: 04:12  │ Time: 11:45  │ Time: 21:10  │ Time: 01:05               │
│ [STATUS: OK] │ [WARN: AMBER]│ [ALERT: RED] │ [STATUS: OK]              │
├──────────────┼──────────────┼──────────────┼───────────────────────────┤
│ 1x Pepperoni │ 2x Garlic    │ 1x Meat Feast│ 1x Margherita             │
│   + Extra Ch │   Bread      │   + Jalapeno │   (Gluten Free)           │
│ 1x Garlic Dip│ 1x Veggie    │              │                           │
│              │    Supreme   │              │                           │
├──────────────┼──────────────┼──────────────┼───────────────────────────┤
│ [BUMP (B1)]  │ [BUMP (B2)]  │ [BUMP (B3)]  │ [BUMP (B4)]               │
└──────────────┴──────────────┴──────────────┴───────────────────────────┘
```

---

## 3. Preparation Timer Thresholds & Visual Cues

To ensure kitchen speed and alert cooks to delayed orders, KDS tickets dynamically cycle through color-coded urgency states:

| Preparation Age | Visual Badge State | Background Border | Audio Alert Trigger |
| :--- | :--- | :--- | :--- |
| **00:00 - 09:59 min** | `OK` (Green) | Muted Slate Border | Soft Single Chime on Ticket Arrival |
| **10:00 - 19:59 min** | `WARNING` (Amber) | Glowing Amber Border | No Audio |
| **>= 20:00 min** | `CRITICAL` (Red Flash)| Flashing Red Pulse | Recurring Audio Alarm every 60 seconds |

---

## 4. Kitchen Bump Bar & Keypad Controls

Kitchen staff operate KDS screens using industrial bump bars or standard USB keypads:

| Bump Bar Key | Action Trigger | System Execution |
| :--- | :--- | :--- |
| `1` - `8` | Bump Ticket N | Clear corresponding ticket column off screen; emit `KITCHEN_READY`. |
| `Space` | Bump Oldest Ticket | Immediately complete oldest ticket (leftmost position). |
| `Ctrl+Z` or `Recall` | Recall Last Bumped Ticket | Restore bumped ticket back to screen state within 10-second buffer window. |
| `Page Up / Down` | Scroll Tickets | Navigate horizontal ticket queue when total tickets exceed screen width. |

---

## 5. Station Routing & Item Filtering Engine

Orders placed at the POS or via QR code contain line items meant for different physical kitchen stations. The KDS applies client-side filtering based on station assignment rules:

```typescript
// src/modules/restaurant/types/kds.ts

export interface KdsTicketItem {
  id: string;
  orderId: string;
  name: string;
  quantity: number;
  stationType: 'GRILL' | 'PIZZA' | 'BAR' | 'ASSEMBLY';
  modifiers: string[];
  status: 'PENDING' | 'PREPARING' | 'READY';
}

export function filterItemsForStation(
  items: KdsTicketItem[],
  stationType: string
): KdsTicketItem[] {
  if (stationType === 'EXPEDITER') return items; // Expediter views all items
  return items.filter(item => item.stationType === stationType);
}
```

---

## 6. Realtime WebSocket Protocol Specification

KDS terminals subscribe to Supabase Realtime channels for their specific branch:

- **Channel**: `realtime:branch:{branchId}:kds`
- **Payload Event**: `TICKET_UPDATE`
```json
{
  "event": "TICKET_UPDATE",
  "branchId": "b1234567-89ab-cdef-0123-456789abcdef",
  "orderId": "ord_998877",
  "tableNumber": "T-04",
  "orderType": "DINE_IN",
  "station": "PIZZA",
  "items": [
    {
      "itemId": "itm_pizza_01",
      "name": "Margherita Pizza",
      "quantity": 1,
      "modifiers": ["Extra Cheese"],
      "status": "PREPARING"
    }
  ],
  "timestamp": "2026-07-31T21:11:00Z"
}
```
