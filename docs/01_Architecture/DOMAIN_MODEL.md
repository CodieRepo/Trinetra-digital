# Domain Model & Entity Architecture — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Platform & Restaurant OS Domain Core  
> **Related Documents**: [DATABASE_SCHEMA.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/03_Database/DATABASE_SCHEMA.md), [BUSINESS_RULES.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/BUSINESS_RULES.md)

---

## 1. Purpose

This document provides the Domain-Driven Design (DDD) model for **Trinetra v2.0**. It defines Bounded Contexts, Domain Aggregates, Entities, Value Objects, and Domain Events powering the platform.

---

## 2. Bounded Contexts Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BOUNDED CONTEXTS MAP                            │
├──────────────────┬─────────────────────────────────────────────────────┤
│ Tenant Context   │ Organization, Restaurant, Branch, User, Role        │
│ Catalog Context  │ Category, MenuItem, Variant, ModifierGroup, Option  │
│ Floor Context    │ Floor, Table, TableSession                          │
│ Order Context    │ Order Aggregate, OrderItem, KdsTicket               │
│ Inventory Context│ Ingredient, RecipeBom, StockAdjustment             │
│ Billing Context  │ Invoice, PaymentTender, TaxSummary                  │
└──────────────────┴─────────────────────────────────────────────────────┘
```

---

## 3. Core Domain Aggregate Specifications

### 3.1 Order Domain Aggregate
- **Aggregate Root**: `Order`
- **Entities**: `OrderItem`, `PaymentTender`
- **Value Objects**: `Money` (int cents), `TaxRate` (decimal), `OrderStatus` (enum)
- **Domain Invariants**:
  - `Order.totalAmountCents` must always equal `(subtotalCents + taxCents) - discountCents`.
  - An `Order` cannot be finalized as `PAID` unless the sum of `PaymentTender.amountCents` equals or exceeds `Order.totalAmountCents`.
  - Modification of items in an `Order` is forbidden once state reaches `BILLING` or `PAID`.

```typescript
// src/modules/restaurant/domain/order-aggregate.ts

export class OrderAggregate {
  private id: string;
  private branchId: string;
  private status: 'DRAFT' | 'PLACED' | 'PREPARING' | 'READY' | 'SERVED' | 'BILLING' | 'PAID' | 'CLOSED' | 'CANCELLED';
  private items: Array<{ menuItemId: string; qty: number; unitPriceCents: number; totalPriceCents: number }>;
  private subtotalCents: number = 0;
  private taxCents: number = 0;
  private discountCents: number = 0;

  constructor(id: string, branchId: string) {
    this.id = id;
    this.branchId = branchId;
    this.status = 'DRAFT';
    this.items = [];
  }

  public addItem(menuItemId: string, qty: number, unitPriceCents: number): void {
    if (this.status !== 'DRAFT' && this.status !== 'PLACED') {
      throw new Error(`Cannot add items to order in ${this.status} state`);
    }
    const totalPriceCents = qty * unitPriceCents;
    this.items.push({ menuItemId, qty, unitPriceCents, totalPriceCents });
    this.recalculateTotals();
  }

  private recalculateTotals(): void {
    this.subtotalCents = this.items.reduce((sum, i) => sum + i.totalPriceCents, 0);
    this.taxCents = Math.round(this.subtotalCents * 0.08); // 8% Tax
  }

  public getGrandTotalCents(): number {
    return Math.max(0, (this.subtotalCents + this.taxCents) - this.discountCents);
  }
}
```

---

## 4. Value Object Definitions

```typescript
// src/modules/core/domain/value-objects.ts

export class Money {
  public readonly cents: number;

  constructor(cents: number) {
    if (!Number.isInteger(cents)) {
      throw new Error("Money cents must be an integer");
    }
    this.cents = cents;
  }

  public add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  public subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  public format(currencySymbol: string = '$'): string {
    return `${currencySymbol}${(this.cents / 100).toFixed(2)}`;
  }
}
```
