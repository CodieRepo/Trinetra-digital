# Project Master Context: Trinetra CRM

This document serves as the permanent memory and source of truth for the Trinetra CRM. It overrides all default assumptions and should be read first by any future developer or AI agent working on the codebase.

---

## 1. Project Information & Stage

* **Project Name:** Trinetra CRM
* **Legal Entity:** Charulata Enterprises
* **Business Purpose:** Client-facing, sellable SaaS CRM designed for WhatsApp lead tracking, customer nurturing, professional PDF quotation generation, consultation appointment scheduling, and pipeline forecasting.
* **Target Users:** Sales representatives, CRM administrators, and business owners.
* **Core SaaS Goal:** Monetize business automation services by converting inbound WhatsApp conversations into qualified leads, automating follow-up routines, managing pipelines with win probability, and ensuring human-in-the-loop handoff.
* **Current Stage:** Production (LIVE / Active Nurture Flow).

---

## 2. System Architecture

Trinetra CRM utilizes a decoupled architecture where the frontend (React SPA) is served from a static build folder, and the backend (Node.js/Express API) runs on a separate port with a reverse proxy mapping API and WebSocket traffic.

```
                  ┌──────────────────────────────┐
                  │   WhatsApp Customer Device   │
                  └──────────────┬───────────────┘
                                 │ Inbound / Outbound WhatsApp Messages
                                 ▼
                  ┌──────────────────────────────┐
                  │    Baileys WhatsApp Gateway  │ (gateway.ts)
                  └──────────────┬───────────────┘
                                 │ Intercepts JIDs & LIDs
                                 ▼
         ┌────────────────────────────────────────────────┐
         │              Node.js Express Backend           │ (server.ts / index.ts)
         ├───────────────────────┬────────────────────────┤
         │                       │                        │
         ▼                       ▼                        ▼
 ┌───────────────┐       ┌───────────────┐        ┌───────────────┐
 │ SQLite DB     │       │ AI Orchestrator│        │ Cron Services │
 │ (WAL Mode)    │       │ (OpenRouter)  │        │ (Follow-ups)  │
 └───────────────┘       └───────────────┘        └───────────────┘
```

### A. Frontend Architecture
* **Framework:** React 19, Vite, TypeScript, React Router Dom (v7).
* **Styling:** Vanilla CSS for fine control and Tailwind CSS (v4) with `@tailwindcss/vite` plugin. Major style variables and tokens are defined in `src/index.css`.
* **Animations & Scrolling:** Framer Motion, GSAP, and Lenis (smooth scrolling).
* **Entry Points:**
  - Vite Config: [vite.config.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/vite.config.ts)
  - Main Bootstrapper: [src/main.tsx](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/src/main.tsx)
  - Route Controller: [src/App.tsx](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/src/App.tsx)
  - Primary CRM Dashboard: [src/pages/admin/AdminCrm.tsx](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/src/pages/admin/AdminCrm.tsx)

### B. Backend Architecture
* **Runtime:** Node.js v22.22.2 (production) / Express, transpiled from TypeScript to CommonJS.
* **Entry Points:**
  - Source Entry: [server/src/index.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/index.ts)
  - Process Output: `server/dist/index.js`
* **Process Manager:** PM2 (running application `trinetra-crm-backend` under `ecosystem.config.js`).

### C. Database Architecture
* **Database Engine:** SQLite (v3) using `sqlite` and `sqlite3` packages.
* **Production PRAGMAs (WAL Mode):**
  - `journal_mode = WAL` (enables high-performance concurrent reads/writes)
  - `synchronous = NORMAL`
  - `temp_store = MEMORY`
  - `foreign_keys = ON`
* **Database Path:** `/var/www/trinetra/server/data/trinetra.db`

### D. WhatsApp Gateway
* **Technology:** `@whiskeysockets/baileys` (socket-based direct connection to WhatsApp).
* **Credentials Storage:** `/var/www/trinetra/server/data/wa-session` (contains keys and authentication `creds.json`).
* **LID Safety:** Correctly handles 16-digit WhatsApp LID identifiers (e.g. `222483684843672@lid`) avoiding fake phone conversions.
* **Rate Limits & Safeguards:**
  - Duplicate Message Guard: Set-based deduplication cache (500 entries).
  - Anti-Spam: 5-second cooldown per JID between replies.
  - Human Simulation: 1.5s - 3s randomized typing latency before dispatch.

### E. AI & Orchestration
* **AI API Gateway:** OpenRouter API cascade.
* **OpenRouter Model Cascade:**
  1. `google/gemini-2.5-flash` (max_tokens: 400)
  2. `google/gemini-2.5-flash-lite` (max_tokens: 350)
  3. `deepseek/deepseek-chat-v3` (max_tokens: 350)
  4. `openrouter/auto` (max_tokens: 300)
* **API Failover Timeout:** 20-second hard AbortController timeout per model call.
* **Local Emergency Template:** If all models in the cascade fail, a static Hinglish helpful response template is used.
* **Context Compression:** Sends only the last 10 messages + rolling summary (retrieved from `ai_memory` table) + lead profile. Keeps requests at ~1,600 tokens to optimize costs.
* **Field Auto-Extraction:** The AI extracts Name, Company, City, Budget, Urgency, Business Type, Team Size, and Pain Points in JSON format on every reply and saves them to the DB.

---

## 3. Core Business Logic & Pricing

* **Revenue Formula:** 
  $$\text{Annual Value} = \text{Setup Cost} + (\text{Monthly Recurring Revenue (MRR)} \times 12)$$
* **Expected Pipeline Revenue:**
  $$\text{Expected Revenue} = \text{Annual Value} \times \frac{\text{Win Probability (\%)}}{100}$$
* **Official Pricing Packages:**
  1. **Starter Presence:** ₹14,999 setup + ₹2,999/month (landing page, local search profiles, monthly support).
  2. **Growth Engine:** ₹29,999 setup + ₹5,999/month (multi-page site, WhatsApp lead capture, local SEO, monthly reports).
  3. **Sales System:** ₹59,999 setup + ₹9,999/month (CRM setup, WhatsApp/Meta automation, booking tools, review cycles).
  4. **Business OS:** ₹1,49,999+ setup + ₹19,999+/month (custom dashboards, custom software, workflow automation).
* **Payment Terms:** 50% advance for design/staging + 50% on project approval prior to launch. Advertising budgets are paid directly by client to platforms (Google/Meta).

---

## 4. Key UI/UX Guidelines

To maintain a professional, high-end SaaS presentation, all UI elements must respect these design guidelines:
1. **Full Phone Visibility:** Never truncate phone numbers in the UI. Always display the full number with country code.
2. **One-Click Actions:** Provide quick CTAs to chat on WhatsApp, trigger a dialer call, and copy the number.
3. **No-Reload Edits:** Leads' Name, Company, and Phone must be editable inline without page refresh.
4. **ID Masking:** NEVER expose internal database IDs, raw JIDs, or LIDs anywhere in the admin panel or customer views.
5. **Clear Focus:** Highlight the active/selected lead obviously in the CRM and Chat interfaces.
6. **Workspace Real Estate:** The chat workspace must use maximum screen space. Double scrollbars are strictly prohibited.
7. **Fixed Composer:** The message composer input must remain fixed at the bottom of the chat workspace.
8. **Business Metrics Only:** The main Overview panel must show business KPIs only (Revenue, Deal counts, Win rates). Technical server metrics (PM2 processes, memory footprint, Nginx config files, database connections) belong exclusively under **Settings → Developer Settings**.
9. **Mobile Chat Behavior:** On mobile screens, opening a lead must hide the inbox/sidebar list completely and present a full-screen chat window with a visible "Back" button. Avoid horizontal layout overflow.

---

## 5. Verified Staging & Production URLs

* **Main Marketing Site & CRM Portal:** `https://trinetradigitalsolution.com`
* **CRM Console Path:** `https://trinetradigitalsolution.com/admin`
* **Production API Server:** `https://api.trinetradigitalsolution.com`
* **Developer Subdomain:** `https://dev.trinetradigitalsolution.com`
* **Staging Sandbox:** `https://paperclip.trinetradigitalsolution.com`

---

## 6. Known Limitations

* **SQLite Concurrency:** SQLite is single-process and uses file-level locking. While WAL mode enables concurrent reads, highly concurrent parallel writes can throw database lock errors. Heavy background campaigns should throttle inserts.
* **Baileys Client Session:** Baileys operates by mimicking a WhatsApp Web browser instance. It is prone to occasional session de-authorization and requires periodic QR code re-scans via `/admin` settings.

---

## 7. Key Files Directory (Modify with Extreme Caution)

* [server/src/whatsapp/gateway.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/whatsapp/gateway.ts) — Critical WhatsApp socket management, credential restoration, and message broadcasting.
* [server/src/services/openrouter.service.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/services/openrouter.service.ts) — AI prompt engineering, fallback cascade, token pricing calculations, and regex JSON parsing fallbacks.
* [server/src/services/conversation.service.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/services/conversation.service.ts) — Main handler for incoming messages, anti-spam filters, state machines, and lead taggers.
* [server/src/database/connection.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/database/connection.ts) — Database schema definition, default admin setup, and active migrations.
* [src/pages/admin/AdminCrm.tsx](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/src/pages/admin/AdminCrm.tsx) — Main CRM application code containing UI rendering, inline editor forms, lead intelligence details, and chat panels.

---

## 8. Source of Truth Directive

> [!IMPORTANT]
> The contents of this file, alongside the other files in `docs/`, serve as the final authority on the system configuration and business rules. Do not make assumptions or change core architectural decisions (such as migrating away from SQLite or changing the PM2 process names) without explicit user approval.
