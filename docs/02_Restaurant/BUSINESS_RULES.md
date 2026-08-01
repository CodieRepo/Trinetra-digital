# Restaurant Business Rules, Validations & Edge Cases — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Priority 1 — Restaurant OS Business Core  
> **Related Documents**: [ORDER_LIFECYCLE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/ORDER_LIFECYCLE.md), [POS_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/POS_SYSTEM.md)

---

## 1. Purpose

This document codifies the exhaustive set of business rules, validation criteria, tax calculation algorithms, discount constraints, split-billing math, and edge-case handling guidelines for **Trinetra Restaurant OS**.

---

## 2. Business Rules & Validation Matrix

### 2.1 POS Order & Item Rules (BR-POS)
- **BR-POS-01 (Minimum Order Value)**: Dine-in orders have no minimum value. QR online orders enforce a branch-configurable minimum value (e.g., $5.00).
- **BR-POS-02 (Modifier Selection Limits)**: A modifier group with `minSelection = 1` forces cashier/guest selection before item can be added to cart.
- **BR-POS-03 (Price Overrides)**: Overriding an item price on the POS requires `pos:order:discount` permission and generates an immutable audit record with reason text.
- **BR-POS-04 (Bill Voiding)**: An order in `PLACED` or `PREPARING` status can only be voided by a user with `MANAGER` role, requiring a mandatory cancellation reason (e.g., "Guest Left", "Wrong Table Entry").

### 2.2 Tax & Discount Calculations (BR-TAX)
- **BR-TAX-01 (Tax Calculation Sequence)**: Tax is calculated on the discounted subtotal:
  $$\text{Taxable Subtotal} = \text{Subtotal} - \text{Discount}$$
  $$\text{Tax Amount} = \text{Taxable Subtotal} \times \left(\frac{\text{Tax Rate \%}}{100}\right)$$
- **BR-TAX-02 (Discount Caps)**: Bill-level discounts cannot exceed 100% of subtotal. Maximum cashier discount limit is configurable per role (e.g., Cashier max 10%, Manager max 50%, Owner max 100%).

### 2.3 Split Billing Rules (BR-SPL)
- **BR-SPL-01 (Equal Split)**: Total bill divided by $N$ guests. Any fractional cent remainder is assigned to the first payment tender.
- **BR-SPL-02 (Itemized Split)**: Specific line items assigned to individual sub-bills. Unassigned items block bill finalization.

### 2.4 Daily Closing & Shift Rules (BR-CLS)
- **BR-CLS-01 (Open Order Block)**: A register shift cannot be closed if active orders remain in `DRAFT`, `PLACED`, `PREPARING`, or `BILLING` status. All orders must reach `PAID`, `CLOSED`, or `CANCELLED`.
- **BR-CLS-02 (Cash Drawer Discrepancy Alert)**: Cash drawer closing balance declaration differing from expected POS system total by more than $5.00 triggers an automatic manager alert email and audit log entry.

---

## 3. Edge Cases & Recovery Handling

| Edge Case Scenario | Expected System Behavior & Validation |
| :--- | :--- |
| **86-ed Item in Active Cart** | If item is toggled out-of-stock while in a draft cart, POS/QR alerts user upon checkout attempt and highlights item in red. |
| **Simultaneous Table Transfer** | Concurrent transfers on Table A by two waitstaff use Optimistic Locking (`version` check). Second transaction aborts with toast alert. |
| **Printer Paper Jam during Checkout** | POS displays "Printer Offline / Jammed" modal with a "Reprint Bill" button without duplicating order records in DB. |
