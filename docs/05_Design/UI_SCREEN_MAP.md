# UI Screen Navigation Map & Route Hierarchy — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: UI/UX Architecture  
> **Related Documents**: [COMPONENT_CATALOG.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/05_Design/COMPONENT_CATALOG.md), [DESIGN_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/05_Design/DESIGN_SYSTEM.md)

---

## 1. Purpose

This document provides the route hierarchy, screen navigation tree, and layout parent-child relationships for **Trinetra v2.0**.

---

## 2. Next.js App Router Route Map

```
app/
├── (auth)/
│   └── login/                        --> /login (Email/Password & Manager OAuth)
├── (dashboard)/                      --> Shared Platform Layout Shell (Sidebar + Topbar)
│   ├── dashboard/                    --> /dashboard (Executive Performance Metrics)
│   ├── menu/                         --> /menu (Categories, Items, Modifiers Editor)
│   ├── tables/                       --> /tables (Floorplan Visual Canvas Editor)
│   ├── inventory/                    --> /inventory (Ingredients, Stock, Reorder Alerts)
│   ├── reports/                      --> /reports (Daily Z-Close, Financial Summaries)
│   ├── ai/                           --> /ai (Natural Language AI Query Assistant)
│   └── settings/                     --> /settings (Branch Info, Roles, Users)
├── (pos)/
│   └── pos/                          --> /pos (Ultra-Fast Fullscreen POS Billing Interface)
├── (kds)/
│   └── kds/                          --> /kds (Full-screen Station KDS Ticket Grid)
└── (guest)/
    └── qr/
        └── [branchId]/
            └── [tableId]/            --> /qr/:branchId/:tableId (Public Mobile QR App)
```

---

## 3. Keyboard Navigation Shortcuts Map

- `Cmd+K`: Global Command Palette (Access any screen, search menu items, find orders).
- `Cmd+1` to `Cmd+5`: Jump directly between Dashboard sections.
- `Escape`: Return to previous view or dismiss open overlay dialog.
