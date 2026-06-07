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

---

## 6. Context-Aware AI Handoff Logic

* **Date:** 2026-06-06
* **Status:** Approved / Implemented
* **Reason:** The original `detectHandoff` function in `openrouter.service.ts` used flat keyword matching, which caused false-positive escalations. Routine service inquiries (e.g., "koi package batao") containing words like "batao" were triggering handoff to human agents, breaking automated nurturing flows and prematurely disabling AI.
* **Alternatives Considered:**
  * *Broader keyword suppression:* Discarded because adding blanket exceptions would risk suppressing genuine distress signals.
  * *ML-based intent classification:* Discarded as overly complex for the current scale; deterministic pattern matching is sufficient and more auditable.
* **Decision Taken:** Refactor `detectHandoff` into a priority-ordered evaluation chain:
  1. **Explicit human request patterns** (absolute priority — e.g., "insaan chahiye", "real person")
  2. **Emotional distress detection** (urgent safety-critical signals)
  3. **Closing signals** (polite conversation endings like "nahi chahiye", "no thanks")
  4. **Safe service pattern suppression** — if the message matches routine inquiry patterns (pricing, booking, package info), suppress general handoff triggers entirely
  5. **General handoff triggers** (only evaluated if no safe pattern matches)
* **Impact:**
  * Eliminates false-positive handoffs during routine service conversations.
  * Preserves genuine distress and explicit human-request escalation paths.
  * Maintains all appointment booking, qualification, and revenue qualification flows.

---

## 7. VACUUM INTO for WAL-Safe Database Backups

* **Date:** 2026-06-06
* **Status:** Approved / Implemented
* **Reason:** The previous backup implementation used `fs.copyFileSync()`, which is unsafe for SQLite databases in WAL mode. Copying the `.db` file while a write-ahead log exists can produce a corrupt or incomplete backup because the WAL file contents are not flushed into the main database file during a raw copy.
* **Alternatives Considered:**
  * *`.backup` API via better-sqlite3:* Not applicable because Trinetra uses the async `sqlite3`/`sql.js` driver which doesn't expose the C-level backup API.
  * *Stop-the-world backup (close DB, copy, reopen):* Discarded because it requires downtime and risks dropped WhatsApp messages during the backup window.
* **Decision Taken:** Use SQLite's `VACUUM INTO ?` command, which creates a transactionally consistent, standalone copy of the entire database (including all WAL contents) without locking the active database. Verified compatibility with the production SQLite engine (v3.44.2, which supports `VACUUM INTO` since v3.27.0).
* **Impact:**
  * Zero-downtime, WAL-safe backups with full transactional consistency.
  * Backup files are self-contained `.db` files that can be opened independently.
  * No risk of corrupt backups from partial WAL state.

---

## 8. Dead Code Pruning Policy

* **Date:** 2026-06-06
* **Status:** Approved / Implemented
* **Reason:** Legacy files (`wa.service.ts`, `database/db.ts`) remained in the source tree after being superseded by newer implementations (`whatsapp/gateway.ts`, `database/connection.ts`). Dead code increases cognitive overhead, creates false-positive search results, and risks accidental re-import.
* **Decision Taken:** Delete legacy files only after verifying:
  1. No import statements reference the file across the entire `src/` tree (verified via `grep`)
  2. No runtime dependency exists (no dynamic `require()` or string-based imports)
  3. Evidence is documented before deletion
* **Files Deleted:**
  * `server/src/services/wa.service.ts` — Legacy Baileys client, replaced by `whatsapp/gateway.ts`
  * `server/src/database/db.ts` — Legacy DB connection, replaced by `database/connection.ts`
* **Impact:**
  * Cleaner codebase with no ambiguity about which modules are authoritative.
  * Build output reduced by ~200 lines of dead JavaScript.

---

## 9. Defensive AI Output Sanitization & Type Checking

* **Date:** 2026-06-06
* **Status:** Approved / Implemented
* **Reason:** Heavy reliance on JSON parsed output from LLMs introduced vulnerabilities: regex stripping failed on preambles, missing state fields wiped conversational context, and hallucinated datatypes crashed the Node.js process during string operations. Furthermore, the LLM hallucinated handoffs for formal quotation requests despite clear business rules stating the AI handles quotations.
* **Alternatives Considered:**
  * *OpenRouter Strict JSON Schema (`response_format: { type: 'json_schema' }`):* Fully building a large nested JSON Schema inside the API request was evaluated, but since LLMs still struggle with perfect conformance on complex nested schemas and fallback is still needed for network truncations, programmatic defensive checks were preferred.
* **Decision Taken:** 
  1. Expand the `parseAIResponse` fallback logic to accept context (`ctx`) and selectively salvage existing state variables (score, intent, booking dates).
  2. Implement strict programmatic `typeof` checks before invoking methods like `.test()` or writing to the database in `conversation.service.ts`.
  3. Hardcode a defensive sanitization rule in `openrouter.service.ts` that automatically forces `human_handoff = false` if the `intent` is `QUOTATION_REQUIRED` or if the handoff reason contains keywords like "quotation", "proposal", or "proceed".
* **Impact:**
  * No silent lead downgrades (score defaults back to current score instead of 50).
  * System no longer crashes on hallucinated array/object injection into string fields.
  * Zero false-positive human handoffs for business proposal or quotation requests.


## 2026-06-07: WhatsApp Credentials Preservation
* **Context**: The gateway was executing fs.rmSync on the first 401 Unauthorized error from Baileys. This was meant to clear bad sessions but triggered catastrophic lockouts because 401s can be transient.
* **Decision**: 
  1. Remove shouldCleanSession = true from badSession logic.
  2. Implement quarantine limit (5 consecutive bad sessions) before ceasing reconnection.
  3. Change max reconnect attempts from 5 hard-cap to infinite backoff (5 min max).
* **Rationale**: Auto-deleting keys guarantees human intervention. Quarantine limits plus infinite backoff provides maximum recovery chances without spamming Meta.



## 2026-06-07: WhatsApp LID Phone Number Resolution
* **Context**: Meta's new policy masks incoming WhatsApp Ad leads with LID (+2224) numbers instead of the real phone number. This broke wa.me links in the CRM notifications.
* **Decision**: 
  1. Parse contacts.update and contacts.upsert inside gateway.ts to intercept the async mapping between LID and real JID.
  2. Implement an automatic retroactive SQL UPDATE to leads and conversations tables.
  3. Generate a 'Number Syncing' disclaimer for the immediate notification, followed by a 'Number Resolved' webhook once the sync completes.
* **Rationale**: Delaying initial notification would hurt response times. Asynchronous retro-resolution guarantees the lead is immediately actionable, and the valid wa.me link is provided as soon as Meta releases it.

