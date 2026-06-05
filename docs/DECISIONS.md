# Architectural Decisions Log (ADR)

This document records the major architectural decisions made during the design, development, and scaling of Trinetra CRM.

---

## 1. Decoupled Frontend/Backend Architecture

* **Date:** 2026-06-02
* **Status:** Approved / Implemented
* **Reason:** Trinetra CRM serves two distinct audiences: business administrators who need a highly interactive, fast, single-page dashboard for pipeline and chat management, and the backend service which manages long-running stateful WebSocket/TCP connections to WhatsApp. Decoupling ensures that client-side rendering doesn't block server socket execution and vice versa.
* **Alternatives Considered:**
  * *Monolithic MVC App (e.g. Express + EJS):* Discarded because client-side interactive updates (Kanban board drag-and-drop, real-time message stream via sockets) require a modern SPA framework for clean state updates.
  * *Next.js Server-Side Rendered (SSR) App:* Discarded because the admin dashboard is entirely behind authorization walls, meaning SEO benefits of SSR are irrelevant, and local Vite static deployments are cheaper to host and simpler to cache.
* **Decision Taken:** Implement a Decoupled Single Page Application (SPA) using React 19, Vite, and React Router Dom (v7) on the frontend, and a standalone Node.js/Express API server on the backend.
* **Impact:** 
  * High-performance client-side rendering using Vite.
  * Fast static hosting for frontend assets directly from Nginx.
  * Backend can be restarted or scaled independently of the user interface.

---

## 2. SQLite in WAL (Write-Ahead Log) Mode for Database

* **Date:** 2026-06-03
* **Status:** Approved / Implemented
* **Reason:** Trinetra CRM is currently deployed as a single-instance SaaS on a VPS. It stores conversation histories, metrics, and customer profiles. A light, self-contained database engine eliminates the overhead of managing a separate database daemon (like PostgreSQL or MySQL), reduces CPU/RAM footprints, and simplifies off-site snapshot backups.
* **Alternatives Considered:**
  * *PostgreSQL:* Discarded due to higher system resource requirements (RAM) on a entry-level VPS and unnecessary complexity for single-node deployments.
  * *MongoDB:* Discarded because CRM records (leads, chats, appointments, billing items) are highly relational and require transactional consistency.
* **Decision Taken:** Use SQLite (v3) in Write-Ahead Log (WAL) mode. Enforce `synchronous = NORMAL`, `temp_store = MEMORY`, and `foreign_keys = ON` in the connection pool initialization.
* **Impact:**
  * Enabled concurrent reads while writing, avoiding database lock latency during bulk updates.
  * Simplifies disaster recovery (backups are single-file copies).
  * Extremely low memory footprint (~0MB idle, zero separate service monitoring needed).

---

## 3. Baileys WhatsApp Socket Gateway

* **Date:** 2026-06-03
* **Status:** Approved / Implemented
* **Reason:** Trinetra CRM requires a cost-effective, two-way conversational channel that allows businesses to use their existing WhatsApp phone numbers without paying per-message Meta Cloud API fees. Baileys provides direct socket control by mimicking a WhatsApp Web browser instance.
* **Alternatives Considered:**
  * *Meta WhatsApp Business Cloud API:* Discarded due to strict template restrictions, high message session costs, and the requirement of official business verification which small business clients often lack.
  * *Third-Party WhatsApp Gateways (e.g., Twilio):* Discarded due to expensive per-message markups and lack of direct control over connection state.
* **Decision Taken:** Implement a direct socket gateway using the `@whiskeysockets/baileys` package. Save session states locally in `/var/www/trinetra/server/data/wa-session/creds.json` and build automatic session recovery with backup rotations.
* **Impact:**
  * Zero per-message API fees for clients, enabling unlimited conversation nurturing.
  * Support for 16-digit WhatsApp LIDs (LID-safe conversions) and multi-device pairings.
  * Increased dependency on session maintenance; requires periodic QR code re-scans if the device is unlinked from the phone.

---

## 4. OpenRouter API Cascade for AI Nurturing

* **Date:** 2026-06-04
* **Status:** Approved / Implemented
* **Reason:** Conversational automation must remain highly responsive, cost-effective, and resilient to third-party API outages. Relying on a single AI provider poses a single point of failure. OpenRouter provides a unified interface to cascade through multiple high-performing LLM models.
* **Alternatives Considered:**
  * *Direct OpenAI API integration:* Discarded due to lack of automatic fallback options when API endpoints experience downtime or latency spikes.
  * *Local Hosted Models (e.g. Ollama/Llama-3):* Discarded due to high GPU/vRAM hosting requirements on the production VPS, which would raise operational costs significantly.
* **Decision Taken:** Use the OpenRouter API with a model cascade:
  1. `google/gemini-2.5-flash` (Primary; cost-effective and large context support)
  2. `google/gemini-2.5-flash-lite` (First fallback; low latency, cheaper)
  3. `deepseek/deepseek-chat-v3` (Second fallback; strong reasoning capabilities)
  4. `openrouter/auto` (Final auto-router fallback)
  *Implement a hard 20-second AbortController timeout and fallback to a local static Hinglish template if all calls fail.*
* **Impact:**
  * Near-100% AI uptime by bypassing individual model or API outages.
  * Optimizes API costs by compressing contexts to the last 10 messages + rolling summaries.
  * Outage resilience via local fallback template rendering.

---

## 5. Conversational State Machine & Safeguards

* **Date:** 2026-06-04
* **Status:** Approved / Implemented
* **Reason:** Automated chatbots are vulnerable to spam loops, double-firing from network retries, and getting stuck in repetitive flows. Strict conversational interlocks prevent spam and ensure human takeover when needed.
* **Alternatives Considered:**
  * *Stateless LLM prompt instructions:* Discarded because AI prompts alone cannot reliably enforce message deduplication, rate limiting, or absolute state transitions (e.g., stopping the bot when a human joins the chat).
* **Decision Taken:** Build a state machine layer in Node.js comprising:
  1. *Duplicate Message Guard:* 500-entry message ID cache set to discard network retries.
  2. *Anti-Spam Cooldown:* 5-second minimum interval per JID between automated replies.
  3. *Human Handoff Interlock:* Immediate pause (`ai_enabled = 0`) on specific escalation keywords or automatically on the 15th message if buying/booking intent is present.
  4. *Courtesy Cooldown Window:* A 3-message window post-appointment confirmation to let the bot answer polite messages before clearing `active_flow`.
* **Impact:**
  * Prevents infinite loops and message spam.
  * Improves customer experience by gracefully handing over hot leads to sales reps.
  * Guarantees appointment slot booking consistency using relative natural date/time parsing.
