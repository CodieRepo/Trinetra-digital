# Project Map: Directory Index

This document provides a complete map of the Trinetra CRM codebase, outlining folder purposes, entry points, and directory responsibilities.

---

## 1. Directory Structure Overview

```
trinetra-digital/                   # Workspace Root (Vite Frontend context)
├── docs/                           # Central Project Documentation System
├── dist/                           # Production static build folder for React frontend
├── public/                         # Public assets for Vite (logos, icons, etc.)
├── scripts/                        # Automation & testing helper scripts
├── src/                            # Frontend source code (React + TypeScript)
│   ├── components/                 # Reusable UI components (inlines, cards, loaders)
│   ├── data/                       # Local JSON assets and configuration tables
│   ├── hooks/                      # Custom React hooks (auth, sockets, leads)
│   ├── layouts/                    # Navigation and shell wrappers (PageLayout)
│   ├── pages/                      # Page components mapped to React Router routes
│   │   ├── admin/                  # CRM Portal Views (AdminCrm, AdminPipeline)
│   │   └── services/               # Public service descriptions (Website dev, SEO)
│   ├── services/                   # Frontend API adapters (auth, leads, WhatsApp)
│   ├── utils/                      # Helper utilities
│   ├── App.tsx                     # React Router Dom routing configurations
│   ├── index.css                   # Tailwind tokens and master design system styles
│   └── main.tsx                    # Vite entry point
├── server/                         # Backend source code (Node.js + Express)
│   ├── data/                       # Local SQLite database files, session data, and backups
│   ├── dist/                       # Transpiled JavaScript outputs (runs in production)
│   ├── src/                        # Backend TypeScript source code
│   │   ├── config/                 # Environment and Knowledge Base rules
│   │   ├── controllers/            # Express controllers handling route actions
│   │   ├── database/               # Database connection and schema migrations
│   │   ├── middleware/             # Route interceptors (JWT auth, error handlers)
│   │   ├── models/                 # SQLite queries and models (Tasks, Lead schema)
│   │   ├── routes/                 # Express route path mapping
│   │   ├── services/               # Core business services (AI, pipeline, billing)
│   │   ├── utils/                  # Backend utilities (natural date parsers, PDFs)
│   │   └── whatsapp/               # Baileys Socket Gateway implementation
│   ├── ecosystem.config.js         # PM2 production process configuration
│   └── package.json                # Node package script manager
```

---

## 2. Key Directories & File Responsibilities

### A. Frontend Layer (`/src`)
* **Entry Point:** [src/main.tsx](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/src/main.tsx) boots the React application.
* **Routing:** [src/App.tsx](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/src/App.tsx) handles protected dashboard routes (`/admin/pipeline`, `/admin/conversions`, `/admin/leads`) using a JWT localStorage check.
* **CRM Portal Page:** [src/pages/admin/AdminCrm.tsx](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/src/pages/admin/AdminCrm.tsx) is the master console. It combines the list of active leads, conversation threads, the Lead Intelligence card, the task list, timeline entries, and quotation forms in a responsive split layout.
* **Pipeline Kanban:** [src/pages/admin/AdminPipeline.tsx](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/src/pages/admin/AdminPipeline.tsx) renders the drag-and-drop sales pipeline, deal value calculations, and win probabilities.
* **Design System & Tokens:** [src/index.css](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/src/index.css) holds the theme variables, color tokens, and custom UI overrides.

### B. Backend Layer (`/server/src`)
* **Entry Point:** [server/src/index.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/index.ts) mounts Express, establishes SQLite connection, starts crons, runs the cost monitor, and launches the WhatsApp socket listener.
* **Routes Layer (`/routes`):** Mounts all REST endpoints.
  - [auth.routes.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/routes/auth.routes.ts) — Admin credentials checks and token issuance.
  - [leads.routes.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/routes/leads.routes.ts) — Database query paths for leads.
  - [whatsapp.routes.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/routes/whatsapp.routes.ts) — QR code generation and session management.
  - [quotations.routes.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/routes/quotations.routes.ts) — PDF quotes generation and approval states.
  - [appointments.routes.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/routes/appointments.routes.ts) — Booking consultation triggers.
* **Services Layer (`/services`):** Focuses entirely on business logic.
  - [wa.service.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/services/wa.service.ts) — Core send handlers.
  - [openrouter.service.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/services/openrouter.service.ts) — OpenRouter cascade, timeout limits, and error handling.
  - [conversation.service.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/services/conversation.service.ts) — Main handler for incoming messages, anti-spam filters, state machines, and lead taggers.
  - [memory.service.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/services/memory.service.ts) — Conversation history management and rolling AI summarizer triggers.
  - [cost-monitor.service.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/services/cost-monitor.service.ts) — Token tracking and daily cost alert monitoring.
  - [pipeline.service.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/services/pipeline.service.ts) — Deal value overrides, probability calculations, stuck lead cron tags, and revenue forecasting.
  - [quotation.service.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/services/quotation.service.ts) — Itemization billing engine and quote creation.
  - [cron.service.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/services/cron.service.ts) — Background task runners.
* **Database Layer (`/database`):**
  - [connection.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/database/connection.ts) — Houses the schema migrations, PRAGMAs, indexes, and user setup logic.
* **WhatsApp Gateway Layer (`/whatsapp`):**
  - [gateway.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/whatsapp/gateway.ts) — Manages direct connection sockets, credential writes, and outbound queues.
