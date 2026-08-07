# Trinetra Restaurant OS — Workflows

## Restaurant Creation Flow

Current production flow:

Trinetra CRM
→ Restaurant Created
→ Restaurant Admin Credentials Generated
→ Restaurant Portal
→ Restaurant Daily Operations

CRM provisions only.
Restaurant OS handles operations.

## Table Flow

Table created
→ table assigned to a zone
→ table marked available
→ customer seated
→ session started
→ orders placed
→ kitchen receives order
→ food prepared
→ food served
→ bill requested
→ payment completed
→ session closed
→ table cleaned
→ table available again

## POS Flow

Select table or order type
→ add menu items
→ apply modifiers
→ send to kitchen
→ track order status
→ settle bill
→ generate invoice

## Kitchen Flow

Receive order
→ review items
→ start preparation
→ mark ready
→ mark served or completed

## Inventory Flow

Stock received
→ stock stored
→ stock consumed by recipe/BOM
→ waste logged
→ low stock monitored
→ reorder suggested

## Billing Flow

Subtotal
→ tax
→ discount approval if needed
→ payment
→ invoice
→ audit trail

## CRM Flow

Customer visit history
→ preferences
→ notes
→ repeat behavior
→ follow-up opportunities

## Future Onboarding

Future onboarding methods may include:
- Super Admin creates restaurant
- Self Signup
- Subscription Purchase
- One-Time License Purchase
- Marketplace Integrations

Do not implement these now unless explicitly requested.