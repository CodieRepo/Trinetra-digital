# Trinetra Restaurant OS v2.0

> **A Modular, Multi-Tenant Business Operating System for Restaurants**

Trinetra v2.0 is a modular, high-performance Restaurant Operating System built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **Supabase PostgreSQL**.

---

## 🔑 Demo Environment & Accounts

The application includes a role-switcher and pre-configured role accounts for instant manual validation:

| Role | Demo Email | Role Rights & Privileges |
| :--- | :--- | :--- |
| **Super Admin / Owner** | `admin@trinetra.com` | Full platform administration & settings (`settings:manage`) |
| **Branch Manager** | `manager@trinetra.com` | Menu catalog & ingredient inventory management (`menu:manage`) |
| **POS Cashier** | `cashier@trinetra.com` | High-speed billing, order placement & payments (`pos:order:pay`) |
| **Kitchen Chef** | `chef@trinetra.com` | Kitchen Display System & ticket bump bar (`kds:view`, `kds:ticket:update`) |
| **Floor Waiter** | `waiter@trinetra.com` | Table seating, order taking & session transfers (`table:view`) |

> **Quick Login**: On the `/login` screen or top bar, click any role pill (e.g. `Cashier`, `Chef`, `Manager`) to instantly switch permissions without typing credentials!

---

## ⚡ Quick Start & One-Click Demo Seeder

### 1. Local Environment Setup
```bash
# Clone repository
git clone https://github.com/trinetra/trinetra-os.git
cd trinetra-os

# Install dependencies
npm install

# Setup Prisma DDL Client
npx prisma generate
```

### 2. Configure Environment Variables (`.env`)
Create `.env` at the root directory:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trinetra_db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Launch Development Server & Seed Presentation Data
```bash
# Start Next.js dev server
npm run dev

# Open http://localhost:3000 in your browser
```

> **One-Click Presentation Data Seeder**:
> 1. Log in or open `/dashboard/orders`.
> 2. Click the **"Seed Presentation Data"** button at the top right.
> 3. This automatically populates realistic restaurant brands (*Downtown Bistro*), outlets, floors, tables (`T-01` to `T-05`), food categories, dishes with minor-unit pricing, ingredients, and sample reservations!

---

## 🧪 Verification Commands

```bash
# Run unit & hardening test suites (18 tests)
npm run test

# Run strict TypeScript typecheck (0 errors)
npm run typecheck

# Run ESLint validation (0 errors)
npm run lint

# Run production build compilation (29 routes)
npm run build
```

---

## 📋 Comprehensive Manual Test Workflow Script

To test the complete end-to-end restaurant operational flow:

1. **Login & Branch Selection**: Log in at `/login` as **Manager**, navigate to `/dashboard/restaurants`.
2. **Floor & Table Layout**: Navigate to `/dashboard/tables` to inspect 2D interactive table cards.
3. **Table Reservation**: Navigate to `/dashboard/reservations`, click **"New Reservation / Walk-In"**, enter *Sarah Connor* (4 Guests, 7:30 PM). Click **"Seat Guest"** on table `T-03` (`CONFIRMED` ➔ `SEATED`).
4. **Order Placement**: Navigate to `/dashboard/orders`, click table `T-03`, select *2x Truffle Mushroom Arancini* and *1x Ribeye Steak*. Click **"Place Dine-in Order"**.
5. **Kitchen Display System (KDS)**: Open `/kds` in another tab or station filter. Locate Ticket `#ORD-1001`. Click **"Start PREPARING 🔥"** and then **"Mark READY TO SERVE 🔔"**.
6. **POS Checkout & Split Billing**: Open `/pos`, locate cart or session. Click **"Split Payment across Methods"** ($20.00 Cash + $28.60 Card). Click **"Process Split Checkout"**.
7. **Receipt Printing**: Thermal receipt modal pops up with itemized minor-unit breakdown. Click **"Print Thermal POS Receipt"**.
8. **Table Auto-Clear**: Table `T-03` automatically resets from `BILLING` ➔ `AVAILABLE`.
9. **Inventory & BOM Verification**: Navigate to `/dashboard/inventory` to verify ingredient stock deduction for *Arborio Rice* and food cost calculations.

---

## 📌 Known Limitations & Planned Sprints

The following operational modules are under **Restaurant Core Feature Freeze v1.0** and scheduled for subsequent sprints:

- **Sprint 6 (QR Self Ordering)**: Customer mobile self-ordering via table QR code scanning.
- **Sprint 7 (Advanced Analytics)**: Peak-hour heatmaps, dish popularity matrices, and automated daily closing reports.
- **Sprint 8 (AI Business Insights)**: Natural language executive summary engine and automated inventory reorder recommendations.
