# Session Start Entry Point

Welcome to the Trinetra CRM development session. To ensure system stability, compliance with business logic, and deployment safety, any developer or AI agent starting a new session must execute the bootstrap sequence.

## 1. Documentation Index

Please read the following documents in order before inspecting the codebase or proposing any modifications:

* **[PROJECT_MASTER_CONTEXT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/PROJECT_MASTER_CONTEXT.md)**
  *System architecture, frontend/backend entry points, database parameters (SQLite WAL), AI openrouter cascade, and WhatsApp gateway rate limits.*
* **[PROJECT_MAP.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/PROJECT_MAP.md)**
  *Directory layout, file responsibilities, and directory structure index.*
* **[BUSINESS_RULES.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/BUSINESS_RULES.md)**
  *Sales pipeline definitions, revenue calculation formulas, UI/UX workspace guidelines (no raw IDs, full phone numbers, mobile layout), anti-spam rules, human handoff triggers, and appointment booking state machines.*
* **[SERVER_ACCESS.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/SERVER_ACCESS.md)**
  *Server network IP (187.127.170.222), VPS paths, SSL certificate locations, and domain names mapped on Nginx.*
* **[DEPLOYMENT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/DEPLOYMENT.md)**
  *Build instructions, PM2 restart commands, Nginx configurations, database backups, functional verify scripts, and rollback procedures.*
* **[AGENT_RULES.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/AGENT_RULES.md)**
  *Development guidelines, additive-only database migration mandates, WhatsApp gateway session protection, and validation pipelines.*
* **[HANDOFF.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/HANDOFF.md)**
  *The living status log tracking recently completed changes, files modified, active work-in-progress, and pending actions.*

## 2. Bootstrapping Steps

1. Read all files listed above.
2. Formulate the short internal project summary matching the requirements in the startup sequence.
3. Once the summary is ready, proceed with the active tasks.
4. Ensure `docs/HANDOFF.md` is updated before ending the session.
