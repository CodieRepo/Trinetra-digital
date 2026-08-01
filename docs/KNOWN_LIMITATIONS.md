# Known Limitations & Roadmap Transition — Sprint 1

## Sprint 1 System Boundaries

### 1. Public Customer API Endpoints Mounted
- Sprint 1 mounted all 5 backend API endpoints for customer QR menu lookup, session tracking, customer identity, order placement, and live order status.
- Frontend views (`PublicRestaurantMenuPage.tsx`, `PublicMenu.tsx`, `OrderStatusPage.tsx`) are scheduled for connection in **Sprint 2**.

### 2. Staff & KDS API Routes
- Kitchen Display System (KDS) and Waiter POS APIs (`/api/staff/orders`, `/api/staff/sessions/payment`) are scheduled for implementation in **Sprint 3**.

### 3. Realtime WebSockets vs Polling
- Live DB operations are fully verified. Supabase Realtime WebSocket subscriptions (`postgres_changes` on `restaurant_orders`) will be activated in **Sprint 3 (KDS)** with automatic fallback 15s polling for offline resilience.

---

## Readiness for Sprint 2 Transition
All backend APIs, database triggers, type definitions, and production build checks are 100% verified. The project is ready for Sprint 2 (Dine-in Customer Ordering Portal frontend integration) upon user approval of the Git Commit.
