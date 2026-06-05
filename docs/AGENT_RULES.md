# Agent Rules & Operating Guidelines

This document provides strict instructions and rules of engagement for all future AI agents (and human developers) working on the Trinetra CRM codebase. 

---

## 1. Core Operating Guidelines

* **Mandatory Bootstrap:** Work cannot begin until [SESSION_START.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/SESSION_START.md) has been read in its entirety.
* **Documentation Authority:** Documentation is the single source of truth and overrides all assumptions, previous memory, or generic guidelines.
* **Disagreement Resolution:** If documentation and code disagree, you must verify the actual implementation, update the documentation to align with reality, and record findings in [HANDOFF.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/HANDOFF.md). Do not guess.
* **Context Limit Handling:** If the context window becomes limited, stop implementation immediately and update [HANDOFF.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/HANDOFF.md) with a complete continuation summary before stopping.
* **Handoff Requirement:** No task is complete until [HANDOFF.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/HANDOFF.md) is updated with completed work, files modified, deployment status, and next recommended actions.
* **No Speculative Assumptions:** Do not assume directories, network ports, or API architectures. Verify them directly using repository search or local inspection commands.
* **Minimal Surgical Changes:** Prefer localized, highly targeted code edits. Avoid rewriting entire files or refactoring working subsystems unless explicitly requested.
* **Keep Production Stable:** Trinetra CRM is a live, revenue-generating SaaS product. Ensure your modifications maintain 100% uptime and introduce no regressions.

---

## 2. Database & Migration Controls

* **No Destructive Operations:** Never delete, rename, or drop existing database tables or columns. Doing so will break historical CRM lead data.
* **Additive Migrations Only:** All schema upgrades must be strictly additive (adding new optional columns with default values or new tables). Additive changes should be coded incrementally in [server/src/database/connection.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/database/connection.ts).
* **Verify Constraints:** Always ensure foreign key checks and indices are maintained on new tables.

---

## 3. WhatsApp Gateway Integrity

* **Do Not Modify Lightly:** The Baileys WhatsApp Gateway ([server/src/whatsapp/gateway.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/whatsapp/gateway.ts)) manages real-time socket connections and is highly sensitive. Do not modify queue handling, rate-limiting anti-spam delays, or session recovery routines without dedicated staging verification.
* **ID Masking:** Database JIDs and LIDs must never be exposed to the client interface. Ensure all API responses format contacts with clean names and readable phone numbers.

---

## 4. UI/UX Controls

* **SaaS Client-Facing Focus:** Trinetra CRM is a polished, sellable SaaS application. The admin panels must look premium, modern, and clean. Emojis, micro-interactions, clear scroll boundaries, and robust error fallback messages must be preserved.
* **Technical Metrics Isolation:** Raw developer tools (such as Nginx configuration syntax tests, SQLite lock counts, system RAM usage, or process metrics) must **NEVER** be displayed on the main Overview charts. They must reside strictly under **Settings → Developer Settings**.

---

## 5. Development Workflow (Mandatory)

Always follow this pipeline when executing a task:

```
┌─────────────┐     ┌───────────────┐     ┌─────────────┐     ┌────────────┐     ┌────────────┐
│   1. AUDIT  │ ──> │ 2. IMPLEMENT  │ ──> │  3. BUILD   │ ──> │ 4. DEPLOY  │ ──> │ 5. VERIFY  │
└─────────────┘     └───────────────┘     └─────────────┘     └────────────┘     └────────────┘
```

1. **Audit:** Inspect the active code, routes, and database schema to plan changes.
2. **Implement:** Write clean, typed TypeScript code. Preserve docstrings and comments.
3. **Build:** Verify that the frontend compiles cleanly (`npm run build`) and the backend compiles cleanly (`cd server && npm run build`) with **zero** TypeScript compiler errors.
4. **Deploy:** Coordinate server updates (push code, pull on VPS, restart PM2 process `trinetra-crm-backend`).
5. **Verify:** Check logs (`pm2 logs`), verify health endpoints (`/health`, `/api/health`), and run automated post-deployment validation tests (`node server/verify_production_post.js`).
6. **Handoff:** Document your changes, file edits, and verified deployment status in `docs/HANDOFF.md`.

---

## 6. Escalation Protocol
If a task cannot be completed due to missing permissions, missing environment variables, API key errors, or third-party service limitations:
1. Do not guess or substitute mock keys.
2. Halt execution.
3. Explain exactly what resources or parameters are missing and specify the required actions to unblock development.
