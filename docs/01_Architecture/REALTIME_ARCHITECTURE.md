# Realtime Synchronous Event Architecture — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Platform & Restaurant OS Engine  
> **Related Documents**: [SYSTEM_ARCHITECTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/SYSTEM_ARCHITECTURE.md), [KITCHEN_DISPLAY_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/KITCHEN_DISPLAY_SYSTEM.md)

---

## 1. Purpose

This document details the software design, WebSocket channel topology, broadcast message protocols, event payloads, and heartbeat mechanisms governing **Trinetra's Realtime Architecture**. The realtime engine ensures seamless synchronicity across POS terminals, kitchen monitors, waiter tablets, and guest QR apps in `< 100ms`.

---

## 2. Channel Topology & Message Routing

```
┌────────────────────────────────────────────────────────────────────────┐
│                   REALTIME WEBSOCKET CHANNEL TOPOLOGY                  │
├────────────────────────────────────────────────────────────────────────┤
│  Root Channel: realtime:branch:{branchId}                              │
│                                                                        │
│  ├── Sub-Channel 1: realtime:branch:{branchId}:pos                     │
│  │   ├── Events: ORDER_PLACED, BILL_GENERATED, TABLE_STATUS_CHANGE   │
│  │   └── Consumers: POS Terminals, Cashier Stations, Manager Tablets  │
│  │                                                                     │
│  ├── Sub-Channel 2: realtime:branch:{branchId}:kds                     │
│  │   ├── Events: TICKET_NEW, TICKET_BUMP, ITEM_STATUS_UPDATE          │
│  │   └── Consumers: Kitchen Monitors (Grill, Pizza, Bar, Expediter)   │
│  │                                                                     │
│  └── Sub-Channel 3: realtime:branch:{branchId}:tables                  │
│      ├── Events: TABLE_SEATED, TABLE_MERGED, TABLE_CLEARED            │
│      └── Consumers: Hostess Desk, Waitstaff Mobile Devices             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Realtime Protocol Event Schemas

```typescript
// src/modules/core/types/realtime-events.ts

export type RealtimeEventType = 
  | 'ORDER_PLACED'
  | 'ORDER_STATUS_CHANGED'
  | 'KDS_TICKET_BUMPED'
  | 'TABLE_STATUS_MUTATED'
  | 'ITEM_STOCK_TOGGLED';

export interface BaseRealtimePayload<T> {
  eventId: string;
  eventType: RealtimeEventType;
  branchId: string;
  timestamp: string;
  senderWorkstationId: string;
  data: T;
}

export interface OrderPlacedEventData {
  orderId: string;
  orderNumber: string;
  tableLabel?: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  itemCount: number;
  totalAmountCents: number;
}
```

---

## 4. Reconnection & Heartbeat Strategy

1. **Heartbeat Pulse**: Clients transmit a WebSocket ping every 15 seconds. If no pong response arrives within 5 seconds, the socket drops to `RECONNECTING` state.
2. **Exponential Backoff**: Reconnection attempts retry at 1s, 2s, 4s, 8s, up to a max 30s interval.
3. **Catch-up Sync Engine**: Upon reconnecting, terminals query `GET /api/v1/sync/state?since={lastAckTimestamp}` to reconcile missing events during the disconnection window.

---

## 5. Developer Notes

- Do not use database polling as a substitute for WebSockets.
- Always handle duplicate message delivery idempotently using `eventId` deduplication in client stores.
