# Trinetra Digital Solution AI CRM & WhatsApp Automation Backend

An enterprise-grade, modular, and performance-hardened backend engine powering the **Trinetra Digital SaaS Platform**. Built with Node.js, Express, SQLite (WAL Mode), Baileys WhatsApp client connection socket, and Google Gemini LLM automation triggers.

---

## 🚀 Key Features

*   **Modular Clean Architecture**: Standard separation of concerns (Routes, Controllers, Services, Database Models, Middleware, config validation, and Sockets).
*   **High-Performance DB Connection Layer**: Embedded SQLite compiled with **Write-Ahead Logging (WAL)** indexings, synchronous Normal configurations, synchronous memory storage, and automatic schema provisions.
*   **Persistent WhatsApp Multi-File Gateway**: Highly stable Baileys connection socket mapping active multi-file state directories. Generates scannable, real-time Base64 QR code image URIs.
*   **Automated Gemini AI Lead Qualification**: Automatically intercepts inbound customer messages, structures historical conversation logs, scores intent utilizing Gemini models, and sends simulated human response sequences under simulated offsets (1.5s to 3s).
*   **Automated Rolling Backups**: Automatically creates timestamped binary database backups, keeping only the latest 7 files to preserve VPS storage.
*   **Anti-Spam Rate Limiting**: Embedded IP rate shielding allowing a maximum of 5 requests per 15 minutes.
*   **Enterprise Telemetry & Diagnostics Monitoring**: Custom Express exception filter categorizing exceptions (`network`, `database`, `ai_service`, `whatsapp_gateway`) while masking sensitive JWT tokens and API keys.

---

## 📂 Project Structure

```text
server/
├── data/                          # SQLite databases & active WhatsApp sessions
├── dist/                          # Compiled production JavaScript files
├── logs/                          # PM2 server error/info logs
├── src/
│   ├── config/                    # Env validation and JWT configurations
│   ├── database/                  # Connection layer, WAL, schemas, and seeds
│   ├── models/                    # Strongly-typed schemas (LeadModel, MessageModel)
│   ├── whatsapp/                  # Baileys pairing gateway lifecycle
│   ├── services/                  # Business logics (Gemini, Cron intervals, Analytics)
│   ├── controllers/               # Express Request/Response validators
│   ├── routes/                    # API Router mounts
│   ├── middleware/                # Security, JWT auth, rate limits, error logging
│   └── server.ts                  # Startup server and teardown handlers
├── .env.example                   # Environment configuration template
├── ecosystem.config.js            # PM2 production orchestration config
├── package.json                   # Dependencies and npm scripts
└── tsconfig.json                  # TypeScript compiler settings
```

---

## 🛠️ Installation & Setup

### Prerequisites
*   Node.js (v18 or higher recommended)
*   npm (v9 or higher)

### 1. Clone & Install Dependencies
Navigate into the server directory and run:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your custom values, including your **Google Gemini API Key** and a production-grade **JWT Secret**.

### 3. Run in Development Mode
Start the local server with hot-reloading:
```bash
npm run dev
```
The server will initialize the SQLite database (`./data/trinetra.db`), preload 3 realistic leads, start the follow-up nurturing chron scheduler, and generate a scannable WhatsApp pairing QR code directly in the terminal!

---

## 📦 Production Deployment

### 1. Compile TypeScript to JavaScript
Generate a production bundle in the `dist` directory:
```bash
npm run build
```

### 2. Launch under PM2 (Recommended)
PM2 ensures the process remains active, auto-recovers on reboots, and persists WhatsApp links. Start the service in **Fork Mode** to prevent database locks:
```bash
pm2 start ecosystem.config.js --env production
```

### 3. Monitor Process Status
```bash
pm2 logs trinetra-crm-backend
pm2 status trinetra-crm-backend
```

---

## 🧪 Integration Testing (E2E)

You can run automated E2E integration tests to verify database seeds, authentication routes, API capture parameters, rate limiters, and backup rolling pruning:
```bash
node scratch/test_e2e.js
```
All core server endpoints must return `HTTP 200 OK` and pass automatically!
