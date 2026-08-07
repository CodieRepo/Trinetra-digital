# Trinetra Restaurant OS — Business Rules

## Operating Model

Restaurant OS follows the real lifecycle of a restaurant:

Restaurant Setup
→ Restaurant Configuration
→ Menu Creation
→ Floor & Table Setup
→ Staff Setup
→ Restaurant Opens
→ Customer Arrives
→ Table Assigned
→ Session Started
→ Order Taken
→ Kitchen Receives Order
→ Food Prepared
→ Food Served
→ Additional Orders
→ Bill Requested
→ Discount Approval
→ Payment
→ Invoice
→ Session Closed
→ Table Cleaning
→ Table Available Again

## Screen Rule

Every screen must answer:
- Who is using it?
- Why are they using it?
- What action do they need?
- How can that action be completed in the minimum number of steps?

## Workflow Rule

Never invent restaurant workflows.
If a workflow is unclear, stop and ask.
Do not silently assume business rules.

## Financial Rule

Financial operations must be deterministic.
Discounts, billing, taxes, payments, and refunds must be auditable.
Never lose or silently alter financial history.

## Inventory Rule

Inventory changes must be traceable.
Recipe/BOM consumption must be verifiable.
Waste, adjustments, and deductions should be logged.

## RBAC Rule

Each role has different access:
- Owner
- Manager
- Cashier
- Waiter
- Kitchen Staff
- Inventory Manager
- Accountant

Permissions must be enforced consistently.

## Demo Rule

The demo restaurant must feel realistic and premium.
It must not expose development tools or fake toy flows.