# Project Glossary & Domain Terminology — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Restaurant OS (Priority 1)

---

## 1. Purpose

This document provides a canonical, unambiguous dictionary of technical, operational, and restaurant domain terminology used across Trinetra v2.0 documentation and source code.

---

## 2. Terminology Dictionary

| Term | Domain Category | Definition & Context |
| :--- | :--- | :--- |
| **BOM (Bill of Materials)** | Inventory | The exact recipe mapping of raw ingredients and quantities required to produce one unit of a menu item (e.g., 150g Flour + 50g Cheese per Pizza). |
| **Branch** | Multi-Tenancy | A physical restaurant outlet site belonging to a specific Restaurant concept under an Organization entity. |
| **Bump (Action)** | KDS | The kitchen staff action of clearing an item or an entire order ticket from a Kitchen Display screen when preparation is completed. |
| **Dine-In Session** | POS / Tables | The active lifecycle of a table from guest seating, order accumulation, kitchen routing, up to bill settlement and table clearing. |
| **KDS (Kitchen Display System)** | Restaurant OS | A real-time digital monitor screen installed in kitchen preparation stations replacing paper kitchen order tickets (KOT). |
| **KOT (Kitchen Order Ticket)** | POS / KDS | A discrete order submission sent from the POS or QR ordering system to the kitchen specifying items to prepare. |
| **Modifier / Modifier Group** | Menu | Customization choices attached to a menu item (e.g., Modifier Group: "Spice Level" -> Modifiers: "Mild", "Medium", "Hot"). |
| **Optimistic Update** | Architecture | A frontend state pattern where UI updates instantly before server confirmation, rolling back only on API failure. |
| **POS (Point of Sale)** | Restaurant OS | The central checkout and order entry software used by cashiers and waitstaff to take orders, apply discounts, and accept payments. |
| **RLS (Row-Level Security)** | Database | PostgreSQL security feature restricting database table rows visible or editable based on the executing user's tenant token (`branch_id`). |
| **Split Billing** | POS | Dividing an order total among multiple guests by equal ratio, specific items, or custom monetary amounts across multiple payment tenders. |
| **Station Routing** | KDS | The rule engine directing specific ordered items to corresponding kitchen stations (e.g., Drinks -> Bar KDS, Pizza -> Oven KDS). |
| **Tenant** | Platform | An isolated entity context (`Organization` or `Branch`) ensuring zero data leakage across different business accounts. |
