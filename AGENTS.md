# Trinetra Restaurant OS — Agent Constitution

## Product Identity

This is not an admin dashboard.

This is an operating system for restaurants.

Trinetra Restaurant OS is a standalone commercial SaaS product developed under Trinetra Digital Solution.

Although restaurant creation currently happens from the Trinetra CRM Super Admin Portal, the Restaurant OS itself must remain independent and production-ready.

CRM is only responsible for provisioning.

Restaurant OS is responsible for restaurant operations.

The Restaurant Portal must never depend on CRM UI.

---

## Product Vision

Trinetra Restaurant OS should be capable of replacing traditional POS software used in real restaurants.

The software must feel premium, modern, reliable, and enterprise-grade.

Every screen must be suitable for real restaurant staff.

No demo-quality implementations.

No fake data assumptions.

No toy architecture.

Every decision should reinforce the identity of a modern Restaurant Operating System.

---

## Current Scope

Current focus is only Restaurant OS.

Ignore all future SaaS billing.

Ignore payment automation.

Ignore subscription engine.

Ignore customer self-signup.

Ignore marketplace integrations.

Ignore reseller functionality.

Ignore multi-product platform.

These will be separate milestones.

Build the Restaurant OS first.

---

## Current Workflow

Current production flow is:

Trinetra CRM
↓
Restaurant Created
↓
Restaurant Admin Credentials Generated
↓
Restaurant Portal
↓
Restaurant Daily Operations

This is the only current provisioning flow.

The Restaurant Portal must never depend on CRM UI.

The CRM only provisions restaurants.

The Restaurant OS handles operations.

---

## Future Onboarding Direction

The implementation must not hardcode today's onboarding flow.

Future onboarding methods may include:

- Super Admin creates restaurant
- Self Signup
- Subscription Purchase
- One-Time License Purchase
- Marketplace Integrations

Design the system so onboarding methods can evolve later without rewriting the product.

Do not implement future onboarding now unless explicitly requested.

---

## Product Goal

The Restaurant OS should run real restaurants independently of any other software.

It should be capable of replacing traditional restaurant POS software.

Every interaction should improve operational speed.

Every screen should support a real workflow.

Every feature must be production-ready.

---

## Primary User Roles

Design for these roles:

- Restaurant Owner
- Manager
- Cashier
- Waiter
- Kitchen Staff
- Inventory Manager
- Accountant

Each role has different permissions.

Design accordingly.

---

## Product Principles

Fast

Reliable

Realtime

Offline tolerant where possible

Touch Friendly

Keyboard Friendly

Tablet Friendly

Mobile Friendly

Commercial SaaS quality

Simple to learn

Powerful to use

---

## UX Philosophy

Restaurant staff should complete common actions in as few clicks as possible.

Speed is more important than visual complexity.

Every interaction should reduce operational time.

Design for busy restaurants.

Frequently used actions should always be visible.

Avoid nested menus.

Avoid unnecessary dialogs.

Avoid excessive configuration.

One click whenever possible.

Two clicks if necessary.

Never require five clicks for a common action.

---

## Business Logic Source

Business logic may come from earlier discussions and reviewed planning documents.

Use them only to understand workflows.

Never copy implementations.

Never imitate previous architecture.

Always redesign from scratch.

Never silently assume business rules.

If something is unclear, stop and ask.

---

## Non Goals

Do not build features because they are common in other POS systems.

Do not copy competitors.

Do not recreate legacy desktop software.

Do not over-engineer.

Do not optimize for hypothetical future requirements.

Do not introduce complexity without measurable business value.

If a feature does not improve restaurant operations, do not build it.

---

## Development Order

The project must be built incrementally.

No skipping.

No jumping ahead.

Always finish one milestone before the next.

Milestone 1: Architecture
Milestone 2: Authentication
Milestone 3: Restaurant Provisioning
Milestone 4: Restaurant Settings
Milestone 5: Menu Management
Milestone 6: Floor & Table Management
Milestone 7: Customer Sessions
Milestone 8: POS
Milestone 9: Kitchen Display
Milestone 10: Billing
Milestone 11: Inventory
Milestone 12: Reports
Milestone 13: CRM
Milestone 14: AI Features
Milestone 15: Production Audit

Never change this order unless explicitly instructed.

---

## Feature Lifecycle

Every feature must follow this order:

1. Understand the business problem
2. Design the workflow
3. Wait for approval
4. Design database
5. Build backend
6. Build frontend
7. Test
8. Review
9. Production ready

Never skip steps.

---

## Decision Policy

Never invent restaurant workflows.

If a workflow is unclear:

Stop.

Explain the uncertainty.

Offer possible approaches.

Wait for approval.

Never guess business rules.

Never silently implement assumptions.

---

## Commercial Standard

Whenever implementing a feature ask internally:

Would a real restaurant owner pay for this?

If the answer is no, the feature is not complete.

Keep improving until it reaches commercial quality.

---

## Restaurant Operating Model

The Restaurant OS represents the complete day-to-day operations of a real restaurant.

The software is not a collection of unrelated modules.

Every feature exists because it supports a real operational workflow.

The implementation must always respect this operational flow.

Restaurant Setup
↓
Restaurant Configuration
↓
Menu Creation
↓
Floor & Table Setup
↓
Staff Setup
↓
Restaurant Opens
↓
Customer Arrives
↓
Table Assigned
↓
Session Started
↓
Order Taken
↓
Kitchen Receives Order
↓
Food Prepared
↓
Food Served
↓
Additional Orders (Optional)
↓
Bill Requested
↓
Discount Approval (If Required)
↓
Payment
↓
Invoice
↓
Session Closed
↓
Table Cleaning
↓
Table Available Again

Every future feature must naturally fit into this lifecycle.

Never design isolated modules.

Always think in terms of complete restaurant operations.

---

## Business Rule

Every screen must answer these questions:

Which employee is using this?

Why are they opening this screen?

What action do they want to complete?

How can that action be completed in the minimum number of steps?

Never build screens that exist only to display data.

Every screen must help complete work.

---

## Core Restaurant Features

The Restaurant OS consists of these primary capabilities:

- Authentication
- Restaurant Settings
- Branch Settings
- Staff & Roles
- Menu
- Modifiers
- Taxes
- Tables
- Floor Layout
- Reservations
- Customer Sessions
- POS
- Kitchen Display
- Billing
- Split Bills
- Payments
- Inventory
- Recipes (BOM)
- Purchase Management
- Suppliers
- Expenses
- Reports
- Customer CRM
- Notifications
- Audit Logs

Every feature belongs to one of these capabilities.

Do not invent additional enterprise modules unless requested.

---

## User Experience Goals

The software should feel:

Polished

Professional

Premium

Fast

Reliable

Simple enough for a new waiter to use in 5 minutes

Powerful enough for daily restaurant operations

Touch friendly

Keyboard friendly

Tablet friendly

Mobile friendly

No placeholder design

No toy UI

No demo templates

Always commercial quality

---

## UX Rule

Restaurant employees are busy.

The interface must reduce thinking.

Frequently used actions should always be visible.

Avoid nested menus.

Avoid unnecessary dialogs.

Avoid excessive configuration.

One click whenever possible.

Two clicks if necessary.

Never require five clicks for a common action.

---

## Decision Priority

Whenever there are multiple implementation options, choose based on:

1. Real restaurant workflow
2. Commercial usability
3. Simplicity
4. Maintainability
5. Performance
6. Visual polish

Never optimize for developer convenience.

---

## Technical Strategy

The product will be built as a standalone Next.js SaaS application.

Future pricing, subscriptions, and billing systems will be integrated later.

Current focus is the operational excellence of the Restaurant OS itself.

---

## Coding Standards

Use strict TypeScript.

Prefer composition over inheritance.

Prefer explicit code over clever abstractions.

Avoid deeply nested components.

Avoid unnecessary custom hooks.

Keep business logic outside UI components.

Never duplicate logic.

Keep files focused.

Every exported function should have a single responsibility.

---

## Naming Standards

Use consistent naming.

Use clear business names:

- RestaurantTable
- TableSession
- Order
- OrderItem
- KitchenTicket
- InventoryItem
- RecipeIngredient
- StockMovement
- DiscountAudit

Never mix singular and plural naming.

Never abbreviate important business entities.

---

## Testing Philosophy

Every critical business workflow should be testable.

Financial calculations must be deterministic.

Inventory mutations must be verifiable.

Restaurant operations should be reproducible.

Never merge features that cannot be manually verified.

---

## Accessibility

Keyboard shortcuts should exist for frequent POS actions.

Touch targets should be large enough for tablets.

High contrast should remain readable.

Never rely on color alone to communicate status.

---

## Logging

Log important business events.

Do not log sensitive information.

Provide audit trails for financial operations.

Keep logs meaningful.

---

## Security Standards

Never trust client input.

Validate everything.

Respect Supabase RLS.

Avoid privilege escalation.

Never expose service keys.

Never leak restaurant data across tenants.

---

## Database Standards

Use PostgreSQL best practices.

Avoid unnecessary complexity.

Prefer relational integrity.

Prefer constraints over application-only checks.

Use transactions where needed.

Every migration is immutable.

Never rewrite migration history.

Create new migrations for changes.

Maintain backward compatibility where possible.

---

## API Standards

Always validate inputs.

Always return typed responses.

Never expose internal errors.

Always handle edge cases.

Keep API boundaries clean.

---

## UI Standards

Mobile first.

Fast.

Minimal.

Commercial.

Accessible.

Loading state.

Empty state.

Error state.

Keyboard support.

Dark mode support.

---

## Performance Standards

Restaurant operations are time sensitive.

Opening POS should feel instant.

Common actions should complete with minimal delay.

Avoid unnecessary network requests.

Prefer optimistic UI where appropriate.

Realtime must never reduce responsiveness.

---

## AI Principles

AI assists restaurant staff.

AI never replaces business rules.

AI suggestions are optional.

Critical financial operations must never depend solely on AI.

---

## Demo Requirement

This product will be showcased publicly.

It must include a polished Demo Restaurant.

The demo must feel like a real restaurant.

Demo data should represent realistic operations.

The demo should never expose development tools.

---

## Website Requirement

Restaurant OS will be presented as a flagship product on the Trinetra website.

The website should eventually include:

- Product Overview
- Features
- Screenshots
- Demo Access
- Pricing
- FAQs
- Request Demo

However, these pages are outside the current scope.

Current priority is making the Restaurant OS exceptional.

---

## Future Expansion

After the Restaurant OS reaches commercial quality, additional SaaS capabilities will be added:

- Subscription Engine
- Payment Integration
- Customer Self Signup
- Marketing Website
- Billing Automation
- Reseller / Multi-tenant Support
- Marketplace Integrations
- Add-on Modules

These will be developed as separate engineering milestones.

Do not work on them now unless explicitly requested.

---

## Definition of Done

A feature is complete only when:

- Business workflow is correct
- UI is polished
- Types are complete
- Validation exists
- Edge cases are handled
- Loading states are implemented
- Empty states are implemented
- Errors are handled
- Responsive
- Dark mode compatible
- No placeholder logic
- Ready for production

---

## Quality Gate

Before marking a feature complete verify:

- TypeScript passes
- Lint passes
- Build passes
- Core workflows work
- Role permissions are respected
- RLS assumptions are correct
- No mock logic in production paths
- Mobile and tablet layouts are usable
- Financial operations are safe
- Audit trails exist where needed

---

## Source of Truth

When multiple documents conflict:

1. User instructions
2. AGENTS.md
3. Approved architecture documents
4. Approved feature specifications

Never follow outdated planning documents over AGENTS.md.

Ask for clarification when conflicts exist.

---

## Build Mindset

Think like a software company shipping a commercial product.

Not like an engineer completing tasks.

Every feature should increase the value of the product.

Every decision should make the software easier to sell, easier to maintain, and easier for restaurant staff to use.

---

## Success Metric

Success is not measured by the number of completed features.

Success is measured by whether a real restaurant can confidently replace its current software with Trinetra Restaurant OS.