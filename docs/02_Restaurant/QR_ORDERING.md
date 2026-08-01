# QR Code Guest Self-Ordering Engine Specification — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Priority 1 (Flagship SaaS Product)  
> **Related Documents**: [ORDER_LIFECYCLE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/ORDER_LIFECYCLE.md), [PAYMENT_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/PAYMENT_SYSTEM.md)

---

## 1. Purpose

This document specifies the architecture, security model, digital menu browsing, guest cart management, payment gateway integration, and order injection pipeline for **Trinetra QR Code Guest Self-Ordering**.

---

## 2. QR Guest Ordering Journey

```
┌────────────────────────────────────────────────────────────────────────┐
│                        QR GUEST ORDERING FLOW                          │
├────────────────────────────────────────────────────────────────────────┤
│  1. Guest Scans Table QR Code  ──>  URL: https://trinetra.app/qr/b123/t-04│
│  2. Edge Loads Menu Engine     ──>  Instant PWA Menu (No App Install)  │
│  3. Guest Customizes Cart      ──>  Selects Items, Modifiers & Notes   │
│  4. Checkout & Online Pay      ──>  UPI / Credit Card Gateway (Razorpay)│
│  5. Direct Order Injection     ──>  Injected into Table Session & KDS  │
│  6. Realtime Order Status      ──>  Guest Phone Displays Live KDS Timer│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Table QR Security & Token Verification

To prevent unauthorized orders from remote users outside the restaurant, QR codes embed a cryptographically signed HMAC token containing table and location metadata:

```typescript
// src/modules/restaurant/utils/qr-token.ts
import crypto from 'crypto';

export interface QrTokenPayload {
  branchId: string;
  tableId: string;
  tableLabel: string;
  generatedAt: number;
}

export function generateTableQrSignature(
  payload: QrTokenPayload,
  secretKey: string
): string {
  const data = `${payload.branchId}:${payload.tableId}:${payload.generatedAt}`;
  return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
}

export function verifyTableQrToken(
  payload: QrTokenPayload,
  signature: string,
  secretKey: string
): boolean {
  const expectedSignature = generateTableQrSignature(payload, secretKey);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
```

---

## 4. Payment & Order Injection Engine

1. **Pre-Paid Order Flow**: Order is submitted to database in `DRAFT` status. Webhook from payment gateway (Razorpay / Stripe) confirms payment -> Order updates to `PLACED` -> Dispatched to KDS.
2. **Post-Paid Order Flow (Cashier Approval Mode)**: Order is submitted to POS terminal in `PENDING_APPROVAL` status -> Cashier accepts order -> Injected into active table session and KDS.

---

## 5. Operational Notes

- Mobile UI must be ultra-lightweight (< 200KB bundle size) to load instantly on 3G cellular connections.
- Guest cart state persists in `localStorage` so refreshing the browser does not clear chosen items.
