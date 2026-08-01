# Offline Strategy, Conflict Resolution & Error Recovery — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Platform Resiliency & Fault Tolerance  
> **Related Documents**: [SYSTEM_ARCHITECTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/SYSTEM_ARCHITECTURE.md)

---

## 1. Purpose

This document details the offline resilience model, IndexedDB transaction queue persistence, exponential backoff retries, conflict resolution matrix, and crash recovery procedures for **Trinetra v2.0**.

---

## 2. Offline Resilience Architecture

```
[ POS User Action (Create Order) ]
                │
                ▼
┌────────────────────────────────────────┐
│  Is Internet Online?                   │
└───────┬────────────────────────┬───────┘
        │ YES                    │ NO
        ▼                        ▼
[ Direct Server API POST ]   [ Write to Local IndexedDB Transaction Queue ]
        │                        │
        │                        ▼
        │                    [ Display "Offline Mode: Order Queued" Badge ]
        │                        │
        │                        ▼ (Network Restored Event)
        └───────────────────► [ Background Sync Queue Worker Runs ]
                                 │
                                 ▼
                             [ Idempotent POST with Offline UUID ]
```

---

## 3. Conflict Resolution Policy Matrix

| Conflict Scenario | System Resolution Policy |
| :--- | :--- |
| **Simultaneous Table Status Edit** | Server uses Optimistic Concurrency Control (`version` column). Last valid version wins; rejected client receives updated state via WebSocket. |
| **Offline Order Duplicate ID** | Orders generated offline use client-side UUID v4. Database enforces `UNIQUE(id)`, ignoring duplicates safely. |
| **Price Override Conflict** | Server validates cashier permissions against real-time DB rules. If permission was revoked while offline, order reverts to standard price with user notification. |
