# Trinetra Restaurant OS — Prioritized Development Backlog (v2)

> [!IMPORTANT]
> This is the **updated and authoritative** backlog. All adjustments from the review have been applied. Once approved, this becomes the frozen development roadmap.

---

## Governing Decisions (Locked)

| Decision | Resolution |
|----------|------------|
| Branch Model | DB supports multi-branch from Day 1. UI behaves as single-branch initially. |
| Geography | India first. INR (₹), GST, CGST, SGST. Localization-ready but not implemented. |
| Order Types (MVP) | Dine-in + Takeaway. No Delivery. Architecture extensible. |
| Printing | Receipt printing + Kitchen ticket printing required for MVP. |
| Authentication | PIN-based quick login for staff, in addition to normal login. |
| Offline | Not Day 1. Architecture must not prevent adding it later. |
| AI | Future milestone. Not introduced into earlier milestones. |
| CRM Relationship | CRM provisions restaurants only. Restaurant OS is operationally independent. |
| Inventory (MVP) | Basic inventory in MVP: Recipes, BOM, Stock In, Stock Out, Waste, Low Stock. |

---

## Target Customer Profile

### Primary Customer

| Attribute | Description |
|-----------|-------------|
| **Business Size** | Small to medium restaurants, 5–30 staff members |
| **Revenue Range** | ₹5 lakh – ₹50 lakh monthly turnover |
| **Ownership** | Owner-operated or small management team (1–3 managers) |
| **Geography** | Tier 1, Tier 2, and Tier 3 cities in India |
| **Current Software** | Manual pen-and-paper, basic billing software, or outdated desktop POS |
| **Tech Comfort** | Moderate. Owners are smartphone-proficient. Staff varies widely. |
| **Devices** | Android tablets at POS, owner's personal laptop/phone for reports |
| **Internet** | Available but not always reliable (especially Tier 2/3) |
| **Pain Points** | Slow billing, no visibility into daily sales, kitchen miscommunication, inventory leakage, staff accountability |

### Decision Maker

The **restaurant owner** is the buyer. They evaluate software based on:
- Can my staff learn it in one day?
- Can I see today's sales from my phone?
- Does it print proper GST bills?
- Does the kitchen get orders without shouting?
- Can I track what's going in and out of my inventory?

### Daily Users

| Role | Primary Actions | Device |
|------|----------------|--------|
| **Owner** | View reports, approve discounts, manage settings | Phone / Laptop |
| **Manager** | Oversee floor, handle exceptions, approve voids | Tablet / Phone |
| **Cashier** | Settle bills, accept payments, print receipts | Tablet (fixed POS station) |
| **Waiter** | Take orders, send to kitchen, request bills | Tablet (mobile, shared) |
| **Kitchen Staff** | View orders, mark items ready | KDS screen / Printed tickets |
| **Inventory Manager** | Record stock in, check stock levels, log waste | Tablet / Laptop |

---

## Restaurant Types Supported

### MVP — Full Support

| Type | Examples | Notes |
|------|----------|-------|
| **Casual Dining** | Family restaurants, multi-cuisine, North/South Indian | Primary target. Full dine-in + takeaway. |
| **QSR (Quick Service)** | Burger joints, chaat counters, fast food | Counter-based ordering, high turnover, takeaway-heavy. |
| **Café / Bakery** | Coffee shops, bakeries with seating | Small menu, fast billing, mix of dine-in and takeaway. |
| **Dhaba** | Highway and neighborhood dhabas | Simple menu, basic operations, GST billing. |

### MVP — Partial Support (Usable with Workarounds)

| Type | Limitation |
|------|-----------|
| **Cloud Kitchen** | No dine-in floor/table management needed. System works if takeaway orders are used for all orders. Delivery integration is Future. |
| **Bar / Pub** | No tab/credit workflow. No drink-specific modifiers (pour size). Basic operations work. |
| **Fine Dining** | No course firing (hold/fire). No advanced reservation management. Basic operations work. |
| **Multi-Branch Chain** | DB supports it but UI is single-branch in MVP. Manual switching between branches. |

### Not Supported in MVP

| Type | Reason |
|------|--------|
| **Food Truck** | Requires offline-first (Future Expansion) |
| **Hotel Room Service** | Requires room integration and charge-to-room billing |
| **Catering** | Entirely different workflow (event-based, bulk ordering) |
| **Franchise Operations** | Requires centralized menu management and royalty tracking |

---

## MVP Success Criteria

> [!IMPORTANT]
> The MVP is declared complete when **all** of the following criteria pass. Each criterion is a binary pass/fail — no partial credit.

### Operational Criteria

| # | Criterion | Pass Condition |
|---|-----------|---------------|
| 1 | **Full Day Test** | A restaurant can complete an entire day of operations — from opening to closing — using only Trinetra Restaurant OS. No paper fallback needed for core workflows. |
| 2 | **Order Lifecycle** | A dine-in order can be: created → items added with modifiers and notes → sent to kitchen → modified/cancelled if needed → items marked ready by kitchen → bill generated → payment recorded → receipt printed → session closed. |
| 3 | **Takeaway Lifecycle** | A takeaway order can be: created without a table → items added → sent to kitchen → billed → paid → receipt printed. |
| 4 | **Tax Compliance** | Every printed receipt displays correct CGST + SGST breakdown, restaurant GSTIN, FSSAI number, and sequential invoice number. |
| 5 | **Kitchen Communication** | When a waiter sends an order, the kitchen sees it within 3 seconds (realtime) or receives a printed ticket. Cancellations and modifications reach the kitchen immediately. |
| 6 | **Inventory Awareness** | When the kitchen prepares an order, ingredient quantities are deducted based on recipes/BOM. Stock levels update accordingly. Low stock items surface a visible indicator. |

### Staff Criteria

| # | Criterion | Pass Condition |
|---|-----------|---------------|
| 7 | **Onboarding Speed** | A new waiter with no prior training can take and send an order within 10 minutes of first login. |
| 8 | **PIN Login** | Staff can switch users on a shared tablet using a 4–6 digit PIN in under 5 seconds. |
| 9 | **Role Enforcement** | A waiter cannot approve discounts. A cashier cannot delete menu items. A kitchen user cannot access financial reports. Permissions are enforced consistently. |

### Owner Criteria

| # | Criterion | Pass Condition |
|---|-----------|---------------|
| 10 | **Daily Visibility** | The owner can view today's total sales, order count, and payment method breakdown from any device. |
| 11 | **Accountability** | Every void, comp, discount, and order cancellation is recorded with the acting user, timestamp, and reason. The owner can review these entries. |
| 12 | **Printing** | Receipts print correctly on standard 80mm thermal printers. Kitchen tickets print correctly on standard 58mm or 80mm thermal printers. |

---

## Demo Restaurant Specification

> [!NOTE]
> The demo restaurant is a fictional but realistic establishment used for product showcases, investor demos, and customer trials. It must feel like a real operating restaurant — not a toy.

### Restaurant Profile

| Field | Value |
|-------|-------|
| **Name** | Spice Garden |
| **Type** | Casual Dining — Multi-Cuisine North Indian |
| **Location** | Gorakhpur, Uttar Pradesh, India |
| **Operating Hours** | 11:00 AM – 11:00 PM (Mon–Sun) |
| **Seating Capacity** | 60 covers |
| **GSTIN** | 09AABCT1234F1ZH (demo) |
| **FSSAI** | 12345678901234 (demo) |
| **Currency** | INR (₹) |
| **Tax Configuration** | CGST 2.5% + SGST 2.5% = 5% (food), CGST 9% + SGST 9% = 18% (beverages) |

### Floor Layout

| Zone | Tables | Capacity Per Table |
|------|--------|--------------------|
| **Main Hall** | T1, T2, T3, T4, T5, T6, T7, T8 | 4 seats each (32 total) |
| **Garden Area** | T9, T10, T11, T12 | 4 seats each (16 total) |
| **Private Dining** | T13 | 8 seats |
| **Counter** | C1 | 4 bar stools |
| **Takeaway** | (no physical table) | — |

### Menu Structure

| Category | Items | Price Range (₹) |
|----------|-------|-----------------|
| **Starters** | Paneer Tikka, Chicken Tikka, Veg Manchurian, Fish Fry, Aloo Tikki, Hara Bhara Kebab | 150–350 |
| **Main Course — Veg** | Dal Makhani, Paneer Butter Masala, Kadhai Paneer, Mix Veg, Palak Paneer, Malai Kofta | 180–320 |
| **Main Course — Non-Veg** | Butter Chicken, Mutton Rogan Josh, Chicken Biryani, Fish Curry, Egg Curry | 220–450 |
| **Breads** | Butter Naan, Garlic Naan, Tandoori Roti, Lachha Paratha, Missi Roti | 40–90 |
| **Rice** | Steamed Rice, Jeera Rice, Veg Pulao, Chicken Biryani, Mutton Biryani | 120–350 |
| **Beverages** | Sweet Lassi, Masala Chaas, Fresh Lime Soda, Cold Coffee, Mango Shake | 60–150 |
| **Desserts** | Gulab Jamun, Rasmalai, Kulfi, Ice Cream (Vanilla/Chocolate/Mango) | 80–160 |

### Modifier Groups

| Group | Applies To | Options | Type |
|-------|-----------|---------|------|
| **Spice Level** | All main courses | Mild, Medium, Spicy, Extra Spicy | Required, pick 1, no charge |
| **Bread Add-ons** | All breads | Extra Butter (+₹10), Cheese Stuffed (+₹30) | Optional, pick any |
| **Biryani Size** | Biryanis | Half (−₹80), Full (default) | Required, pick 1 |
| **Beverage Temperature** | Lassi, Chaas | Chilled, Normal | Required, pick 1, no charge |
| **Ice Cream Flavor** | Ice Cream | Vanilla, Chocolate, Mango, Butterscotch | Required, pick 1, no charge |

### Demo Staff

| Name | Role | PIN |
|------|------|-----|
| Rajesh Kumar | Owner | 1234 |
| Priya Singh | Manager | 2345 |
| Amit Sharma | Cashier | 3456 |
| Sunil Yadav | Waiter | 4567 |
| Pooja Verma | Waiter | 5678 |
| Ramesh Gupta | Kitchen Staff | 6789 |
| Sunita Devi | Inventory Manager | 7890 |

### Demo Inventory (Sample Ingredients)

| Ingredient | Unit | Current Stock | Low Stock Threshold | Cost Per Unit (₹) |
|-----------|------|---------------|---------------------|--------------------|
| Paneer | kg | 15 | 5 | 320 |
| Chicken | kg | 20 | 8 | 220 |
| Mutton | kg | 8 | 3 | 650 |
| Basmati Rice | kg | 25 | 10 | 120 |
| Wheat Flour (Atta) | kg | 30 | 10 | 45 |
| Cooking Oil | L | 20 | 5 | 160 |
| Onion | kg | 30 | 10 | 40 |
| Tomato | kg | 20 | 8 | 50 |
| Butter | kg | 5 | 2 | 480 |
| Cream | L | 4 | 2 | 280 |
| Spice Mix (Garam Masala) | kg | 3 | 1 | 600 |
| Sugar | kg | 10 | 5 | 45 |
| Milk | L | 15 | 5 | 56 |

### Sample Recipe (BOM)

**Paneer Butter Masala — 1 serving**

| Ingredient | Quantity | Unit |
|-----------|----------|------|
| Paneer | 0.200 | kg |
| Butter | 0.030 | kg |
| Cream | 0.050 | L |
| Tomato | 0.150 | kg |
| Onion | 0.100 | kg |
| Cooking Oil | 0.020 | L |
| Spice Mix | 0.010 | kg |

When this item is ordered, these quantities are deducted from inventory.

### Demo Scenarios (Pre-Seeded Data)

The demo should include data representing a realistic day of operations:

| Time | Scenario | Details |
|------|----------|---------|
| 11:30 AM | Walk-in, Table T2 | 2 guests. Paneer Tikka + Dal Makhani + 2 Butter Naan + 2 Lassi. Paid cash. Session closed. |
| 12:15 PM | Walk-in, Table T5 | 4 guests. Mixed veg + non-veg order. One item 86'd mid-order (Fish Fry sold out). Paid UPI. |
| 1:00 PM | Takeaway | Chicken Biryani (Full) + Raita. Paid card. |
| 1:30 PM | Walk-in, Table T9 (Garden) | 4 guests. Large order. 10% discount approved by manager (regular customer). Split bill — 2 people, equal split. Paid UPI + Cash. |
| 2:00 PM | Walk-in, Table T3 | 2 guests. One item voided (wrong order entered). Reason logged. Remaining items billed normally. |
| 6:30 PM | Walk-in, Table T13 (Private) | 8 guests. Multiple rounds of orders. Special instructions on 3 items. Full bill, no discount. Paid card. |
| 7:15 PM | Takeaway | 3 items. Packed and billed. Cash. |
| 8:00 PM | Active session | Table T1, 2 guests. Order placed, in kitchen. Session still open (demo shows active state). |
| 8:30 PM | Active session | Table T6, 4 guests. Order served, bill not yet requested. (Demo shows post-kitchen state). |

---

## Classification Test

Every gap was evaluated against:

> *"If a restaurant buys Trinetra Restaurant OS tomorrow, would the absence of this feature prevent daily operations?"*

| Answer | Category |
|--------|----------|
| **Yes** — operations cannot proceed | MVP Critical |
| **No** — but it significantly improves operations or commercial value | Commercial V1 |
| **No** — useful in the future, not today's problem | Future Expansion |
| **No** — unrelated to our current business scope | Ignore For Now |

---

## MVP Critical (29 Gaps)

These must be resolved before the first paying restaurant goes live.

---

### Cross-Cutting

#### GAP-X1: Multi-Branch Database Model
**Reasoning:** Every table needs a `branch_id` foreign key. If we build the schema without this, multi-branch will require redesigning every table. User confirmed: DB supports multi-branch from Day 1.

#### GAP-X4: Realtime Channel Architecture (Basic)
**Reasoning:** KDS is non-functional without realtime. When a waiter sends an order, the kitchen screen must update within seconds. MVP scope: channels for order updates, table status changes, and item availability (86'd), isolated per restaurant.

#### GAP-X5: Error Recovery for Core Transactions
**Reasoning:** If a payment records but session close fails, the table is stuck. If an order saves but the kitchen ticket fails, the kitchen never gets the order. Transaction integrity for the core flows (order → kitchen, bill → payment → session close) must be guaranteed.

#### GAP-X7: Printer / Hardware Integration
**Reasoning:** Confirmed MVP requirement. MVP scope: browser-based printing abstraction for 80mm thermal receipt printers and 58mm/80mm kitchen ticket printers. Vendor-agnostic templates.

#### GAP-X8 / GAP-S7: Fix Migration File Numbering Collision
**Reasoning:** Files `0009` and `0011` are duplicated. Must be fixed before any new migration is created.

---

### Milestone 1: Architecture

#### GAP-1.1: Basic Environment Strategy
**Reasoning:** Cannot deploy without defining dev vs production environments, env variable management, and migration deployment process for the Restaurant OS (not the CRM).

---

### Milestone 2: Authentication

#### GAP-2.1: Session Management for Shared Terminals
**Reasoning:** Shared POS tablets mean sessions must be long-lived. Auth session expiry must not destroy an in-progress order. Without this, waiters lose work during peak hours.

#### GAP-2.2: PIN-Based Quick Login
**Reasoning:** Confirmed MVP requirement. Staff cannot type username + password 30 times per shift. PIN login (4–6 digits) on shared terminals is the minimum.

#### GAP-2.3: Staff Onboarding Flow
**Reasoning:** The owner must add waiters, cashiers, and kitchen staff. Without this, only the provisioned admin can use the system.

---

### Milestone 3: Provisioning

#### GAP-3.2: Data Isolation Verification
**Reasoning:** If Restaurant A can see Restaurant B's data, the product is dead. RLS must be verified during provisioning.

---

### Milestone 4: Restaurant Settings

#### GAP-4.1: Operating Hours Configuration
**Reasoning:** *(Moved to MVP per review.)* A restaurant must define when it opens and closes. Operating hours affect end-of-day reporting boundaries, determine when the system considers a "business day" to start and end, and are displayed on receipts. Without operating hours, daily sales reports have no defined cutoff and the EOD procedure has no trigger point. MVP scope: daily open/close times, day-of-week schedule, and last-order cutoff time.

#### GAP-4.3: Tax Configuration (GST / CGST / SGST)
**Reasoning:** Legally required. Every printed receipt must display correct CGST + SGST. MVP scope: tax rates per restaurant, tax-inclusive vs exclusive pricing, correct calculation and display on bills.

#### GAP-4.5: Basic Receipt Content (GSTIN / FSSAI)
**Reasoning:** Indian law requires GSTIN and FSSAI on invoices. MVP scope: restaurant configures GSTIN, FSSAI, and basic header info, rendered on every receipt.

---

### Milestone 5: Menu Management

#### GAP-5.2: Item Availability Toggle ("86'd")
**Reasoning:** Kitchens run out of items daily. When paneer is gone, the POS must reflect this instantly so waiters stop taking paneer orders. MVP scope: kitchen/manager marks item unavailable, reflected on POS in realtime.

---

### Milestone 6: Floor & Table Management

#### GAP-6.6: Non-Table Order Support (Takeaway)
**Reasoning:** Takeaway is confirmed MVP scope. The order flow must support orders without a table assignment.

---

### Milestone 7: Customer Sessions

#### GAP-7.3: Guest Count / Cover Tracking
**Reasoning:** *(Moved to MVP per review.)* "How many guests?" is asked at every seating. Cover count is the single most important restaurant industry metric — it drives per-head revenue, table efficiency, and staffing decisions. MVP scope: capture guest count when starting a session, include in daily reporting.

---

### Milestone 8: POS

#### GAP-8.1: Order Type Distinction (Dine-in + Takeaway)
**Reasoning:** The POS must distinguish order types at creation. Affects table assignment, receipt content, and flow.

#### GAP-8.2: Order Modification After Kitchen Send
**Reasoning:** Customers change their minds multiple times daily. Without item cancellation capability, the kitchen makes wrong food and the bill is incorrect. MVP scope: item cancellation with permission check and kitchen notification.

#### GAP-8.4: Void / Complimentary Item Workflow
**Reasoning:** Wrong item entered, food complaint, free dessert from owner — voids and comps are daily operations. MVP scope: void (with reason + permission), comp (manager only), both with audit trail.

#### GAP-8.7: Special Instructions / Notes Per Item
**Reasoning:** "No onions," "extra spicy," "allergy: peanuts." Without per-item notes, the kitchen prepares food incorrectly. MVP scope: free-text note field per order item, displayed on KDS and kitchen tickets.

#### GAP-8.9: Running Total Visibility
**Reasoning:** The POS screen must show the running total as items are added. Customers regularly ask "how much so far?" Basic POS requirement.

---

### Milestone 9: Kitchen Display

#### GAP-9.3: Kitchen Ticket Printing
**Reasoning:** Confirmed MVP requirement. Many Indian kitchens work with printed paper tickets. MVP scope: formatted ticket upon order send, including table number, items, modifiers, and special instructions.

---

### Milestone 10: Billing

#### GAP-10.1: Basic Split Bill
**Reasoning:** Groups wanting to pay separately is a daily occurrence. MVP scope: split equally by N people, and split by custom amounts. Item-wise splitting is Commercial V1.

#### GAP-10.2: Basic Discount Support
**Reasoning:** Discounts happen daily. MVP scope: percentage discount and flat-amount discount at bill level, with configurable manager-approval threshold.

#### GAP-10.4: Payment Methods (Cash, Card, UPI)
**Reasoning:** Must record how the customer paid. India's three dominant methods. MVP scope: payment method selection, mixed payment support (part cash + part UPI), recorded for reporting.

#### GAP-10.6: Basic Invoice Numbering and Legal Compliance
**Reasoning:** Sequential invoice numbers and GSTIN are legally required. MVP scope: auto-incrementing invoice number per restaurant, GSTIN displayed, tax breakdown shown.

---

### Milestone 11: Inventory (Basic)

#### GAP-11.1: Unit of Measurement System
**Reasoning:** *(Moved to MVP per review.)* Ingredients are measured in kg, g, L, mL, pieces. Without UOM, recipes cannot define ingredient quantities and stock tracking is meaningless. MVP scope: define UOM per ingredient, support conversion between purchase units and recipe units (e.g., buy by kg, use by g in recipes).

#### GAP-11.7: Basic Waste Tracking
**Reasoning:** *(Moved to MVP per review.)* When food is wasted — kitchen prep waste, spoilage, customer return — it must be logged so inventory stays accurate and the owner can see waste cost. MVP scope: log waste events with quantity, reason, and acting user. Basic waste categories: kitchen waste, spoilage, customer return.

#### Inventory Core (Recipes, BOM, Stock In, Stock Out, Low Stock)
**Reasoning:** *(Added to MVP per review.)* The user has explicitly included basic inventory in MVP scope. A restaurant owner buying this software expects to track what goes in and out of their kitchen.

- **Recipes / BOM**: Define ingredient quantities per menu item. When an order is fulfilled, deduct ingredients automatically.
- **Stock In**: Record goods received (supplier delivery → quantity added to stock).
- **Stock Out**: Automatic deduction via BOM when orders are prepared. Manual stock out for non-recipe consumption.
- **Low Stock Alerts**: Configurable threshold per ingredient. Visual indicator when stock falls below threshold.

---

### Structural

#### GAP-S2: Basic Financial Audit Trail
**Reasoning:** Voids, comps, discounts, and cancellations remove revenue. Without logging who-did-what-when, the owner cannot detect theft or errors. MVP scope: immutable log for voids, comps, discounts, cancellations, and payment events.

---

**MVP Critical Total: 29 gaps**

---

## Commercial V1 (22 Gaps)

Significantly improve commercial value after MVP stabilizes. Absence is noticeable but does not prevent daily operations.

---

### Cross-Cutting

#### GAP-X2: Timezone / Locale / Currency Abstraction
**Reasoning:** MVP hardcodes India/INR/IST. Before expanding to a second geography, configurable timezone, currency, and date format are needed.

#### GAP-1.2: API Versioning Strategy
**Reasoning:** Internal API with single client. Needed when mobile apps or integrations exist.

#### GAP-1.3: Rate Limiting / Throttling
**Reasoning:** UI-level double-tap prevention works for MVP. Server-side rate limiting protects against abuse at scale.

#### GAP-1.4: Monitoring / Alerting
**Reasoning:** First infrastructure investment after MVP launch. Error tracking and uptime monitoring.

#### GAP-1.5: Backup & Disaster Recovery Planning
**Reasoning:** Supabase provides automated backups. Formal RTO/RPO definitions needed as customer count grows.

---

### Authentication & Staff

#### GAP-2.4: Password Policy / Recovery
**Reasoning:** Admin can reset passwords manually for MVP. Self-service reset needed as user base grows.

#### GAP-2.5: Device Trust / Registration
**Reasoning:** PIN login restricts access to known staff. Device registration adds an additional security layer.

#### GAP-S1: Staff Shift Management
**Reasoning:** Shifts, clock-in/out, and zone assignment improve labor management. Restaurants handle this on paper today.

#### GAP-S5: End-of-Day Wizard
**Reasoning:** For MVP, "close session" per table is sufficient. A formal EOD wizard (force-close all, generate summary, cash reconciliation) is Commercial V1.

---

### Restaurant Settings

#### GAP-4.4: Service Charge Configuration
**Reasoning:** Common in Indian restaurants but not universal. Can be added as a bill-level surcharge workaround.

#### GAP-4.6: Notification Configuration
**Reasoning:** Staff communicate verbally. In-app notifications for events (low stock, session overstay) add value but don't block operations.

---

### Menu Management

#### GAP-5.1: Menu Scheduling / Dayparting
**Reasoning:** Staff manage item availability manually. Software-enforced dayparting reduces errors.

#### GAP-5.3: Combo / Meal Deal Support
**Reasoning:** Can be modeled as individual items with bundled pricing for MVP.

#### GAP-5.4: Portion / Size Variants
**Reasoning:** "Half" and "Full" can be separate menu items for MVP. Variant support is a usability improvement.

#### GAP-5.5: Allergen / Dietary Information
**Reasoning:** Not legally mandated for most Indian restaurants currently. Important for premium establishments.

#### GAP-5.6: Item Image Management
**Reasoning:** Text-based POS works. Images improve item recognition for new staff.

#### GAP-5.7: Menu Item Custom Ordering / Sorting
**Reasoning:** Alphabetical within categories works. Custom sort order improves waiter speed.

#### GAP-5.8: Modifier Group Constraints (Required / Min / Max)
**Reasoning:** Without constraints, waiters can submit incomplete selections. Kitchen clarifies verbally.

---

### Floor & Table

#### GAP-6.1: Table Merge / Combine
**Reasoning:** Workaround: seat group at one large table or run separate tabs.

#### GAP-6.2: Table Transfer
**Reasoning:** *(Moved to Commercial V1 per review.)* A party moving tables (e.g., outdoor to indoor due to rain) needs their session and orders to transfer seamlessly. Workaround exists (close old, reopen new) but it's clunky and loses order history context. Frequent enough in restaurants with mixed indoor/outdoor seating to warrant Commercial V1.

#### GAP-6.3: Table Capacity / Seating Count
**Reasoning:** Staff know their tables. Storing capacity as metadata enables smart table suggestions.

#### GAP-6.4: Reservation System
**Reasoning:** *(Confirmed Commercial V1.)* Many Indian casual restaurants don't take reservations. Critical for fine dining and upmarket expansion.

#### GAP-6.5: Visual Floor Plan Editor
**Reasoning:** Grid/list of tables by zone is sufficient for MVP. Drag-and-drop editor is a premium UX feature.

---

### Customer Sessions

#### GAP-7.1: Session Duration Tracking
**Reasoning:** Operational insight for table turnover optimization. Not critical for daily ops.

#### GAP-7.2: Walk-In vs Reservation Differentiation
**Reasoning:** Depends on reservation system (Commercial V1).

#### GAP-7.4: Customer Identification at Session Start
**Reasoning:** Sessions can be anonymous for MVP. Customer linking is part of CRM (Milestone 13).

#### GAP-7.5: Multi-Session Scenarios
**Reasoning:** Edge cases (party split across tables, bar-to-table move). Manageable with workarounds.

---

### POS

#### GAP-8.3: Hold / Fire Workflow
**Reasoning:** Primarily fine-dining. Kitchen manages timing manually in casual restaurants.

#### GAP-8.5: Draft / Pending Order (Save and Resume)
**Reasoning:** POS holds items until send. Multi-device draft resume is a productivity feature.

#### GAP-8.6: Order Repeat / Reorder
**Reasoning:** Speed feature. Waiters can manually re-enter items.

#### GAP-8.8: Quick-Add / Favorites
**Reasoning:** Speed optimization for experienced staff.

---

### Kitchen Display

#### GAP-9.1: Multi-Station Kitchen Routing
**Reasoning:** Single KDS stream works for small restaurants. Station routing essential as kitchen complexity grows.

#### GAP-9.2: Preparation Time Tracking
**Reasoning:** Operational analytics. Improves kitchen performance reporting.

#### GAP-9.4: Rush / Priority Marking
**Reasoning:** Manager can verbally prioritize. Software marking is a convenience.

#### GAP-9.5: Order Recall / Remake
**Reasoning:** Customer sends food back. Kitchen notified verbally for MVP. Formal remake flow adds accountability.

#### GAP-9.6: Sound / Alert System for KDS
**Reasoning:** Kitchen staff watch the screen. Audio alerts reduce missed orders during rush.

---

### Billing

#### GAP-10.3: Tip / Gratuity Handling
**Reasoning:** In India, tips are cash-in-hand. Bill-level tip recording is not standard.

#### GAP-10.5: Refund Workflow
**Reasoning:** Infrequent. Manual cash refund with audit note is sufficient for MVP.

#### GAP-10.7: Cash Reconciliation / Shift-End Report
**Reasoning:** High value for accountability. Restaurants count cash manually today. First Commercial V1 feature after MVP.

#### GAP-10.8: Credit / Tab Workflow
**Reasoning:** Relevant for pubs and corporate dining. Not common in target Indian casual dining.

---

### Inventory (Advanced)

#### GAP-11.2: Stock Take / Physical Count
**Reasoning:** Periodic inventory counting with variance analysis. Builds on base inventory.

#### GAP-11.5: Procurement Approval Workflow
**Reasoning:** Purchase order creation, approval, and GRN workflow.

#### GAP-11.6: COGS / Food Cost Tracking
**Reasoning:** Primary profitability metric. Requires mature recipe and inventory data.

#### GAP-S3: Wastage-to-Order Correlation
**Reasoning:** Linking waste events back to specific voided/returned orders. Requires both inventory and order modification maturity.

---

### Reports

#### GAP-12.1: Full Report Catalog
**Reasoning:** MVP needs basic daily sales and payment reports. Full catalog (20+ types) built incrementally.

#### GAP-12.2: Report Access Permissions
**Reasoning:** MVP: only owner/manager access dashboard. Role-based report permissions needed as report variety increases.

#### GAP-12.3: Report Export / Scheduling
**Reasoning:** CSV/PDF export is high value for accountants. Scheduled reports add convenience.

#### GAP-12.4: Dashboard vs Detailed Report Distinction
**Reasoning:** MVP provides a single operational dashboard. Distinction emerges as report catalog grows.

---

### CRM

#### GAP-13.1: Customer Data Model
**Reasoning:** Part of CRM milestone. Customer identification, visit history, preferences.

---

### Production

#### GAP-15.1: Production Audit Checklist
**Reasoning:** Security, performance, and compliance audit before scaling.

#### GAP-15.2: SLA Definitions
**Reasoning:** Uptime and support commitments for paying customers.

---

**Commercial V1 Total: 22 gaps** *(plus completing all partially-delivered milestones)*

---

## Future Expansion (10 Gaps)

Valuable but intentionally deferred. Architecture leaves extension points, not implementations.

---

| Gap | Feature | Reasoning |
|-----|---------|-----------|
| **GAP-X3** | Offline-First Architecture | Confirmed Future. Architecture uses standard patterns that can be fronted by service workers later. |
| **GAP-X6** | Data Retention / Archival | Only urgent at scale (hundreds of restaurants, years of data). |
| **GAP-3.1** | Restaurant Deactivation / Suspension | Tied to subscription engine (out of scope). |
| **GAP-3.3** | Restaurant Deletion / Data Purge | Legal retention requirements vary by country. |
| **GAP-11.3** | Expiry / Batch Tracking | Complex (FIFO, batch numbers, alerts). Builds on inventory. |
| **GAP-11.4** | Multi-Location Inventory | Requires multi-branch to be fully active. |
| **GAP-13.2** | Loyalty / Rewards System | Competitive differentiator. Architecturally independent. |
| **GAP-13.3** | Feedback Collection | Post-visit NPS and reviews. Operationally independent. |
| **GAP-14.1** | AI Feature Scope | Confirmed Future. Define when operational data exists. |
| **GAP-S2 ext** | Comprehensive Audit Log Specification | Basic financial audit is MVP. Full audit (every entity, every action, search, retention) is Future. |

---

**Future Expansion Total: 10 gaps**

---

## Ignore For Now (3 Gaps)

Outside current business scope. Do not design around these.

---

| Gap | Feature | Reasoning |
|-----|---------|-----------|
| **GAP-4.2** | Multi-Currency Support | India-only with INR. |
| **GAP-S4** | Multi-Language Support | Indian restaurant market operates with English POS. |
| **GAP-S6** | Delivery / Online Order Integration | Explicitly excluded. Order type architecture supports adding later. |

---

**Ignore For Now Total: 3 gaps**

---

## Scope Summary

### MVP Scope (Milestones 1–11 partial + 12 minimal)

```
M1:  Architecture         — Full
M2:  Authentication       — Full (including PIN login)
M3:  Provisioning         — Full
M4:  Restaurant Settings  — Core (operating hours, tax config, receipt config)
M5:  Menu Management      — Core (categories, items, modifiers, availability toggle)
M6:  Floor & Table Mgmt   — Core (zones, tables, table status, takeaway support)
M7:  Customer Sessions    — Core (start/close session, guest count)
M8:  POS                  — Core (dine-in + takeaway, full order lifecycle, 
                             modifications, voids/comps, notes, running total)
M9:  Kitchen Display      — Core (order list, mark ready, kitchen ticket printing)
M10: Billing              — Core (tax calc, basic discounts, basic split, 
                             cash/card/UPI, receipt printing, invoice numbering)
M11: Inventory            — Basic (UOM, recipes/BOM, stock in, stock out, 
                             auto-deduction on orders, waste logging, low stock alerts)
M12: Reports              — Minimal (daily sales summary, payment breakdown)
```

> **29 gaps resolved. A restaurant can operate a full day using only Trinetra OS.**

---

### Commercial V1 Scope

```
Complete all partially-delivered milestones (M4–M12)
M11: Inventory            — Advanced (stock take, procurement, COGS)
M12: Reports              — Full catalog (20+ report types, export, permissions)
M13: CRM                  — Partial (customer data model, visit history)
M15: Production Audit     — Full

+ 22 additional gaps (table merge, reservations, dayparting, floor editor,
  multi-station KDS, refunds, cash reconciliation, shift management, etc.)
```

> **22 gaps resolved. The product becomes worth recommending.**

---

### Future Scope

```
M13: CRM                  — Complete (loyalty, feedback, NPS)
M14: AI Features           — Full (scope TBD)
Offline architecture
Delivery/aggregator integrations
Multi-currency / multi-language
Expiry/batch tracking
Multi-location inventory
Data archival
Restaurant suspension/deletion
```

> **10 gaps deferred. Platform expands beyond core restaurant ops.**
