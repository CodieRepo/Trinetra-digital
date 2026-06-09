# Deployment & Operations Guide

This guide details the build, deployment, process management, and fallback recovery procedures for the Trinetra CRM production environment.

---

## 1. Verified Infrastructure Profile

* **Server OS:** Ubuntu 24.04.4 LTS (Noble Numbat)
* **Kernel:** `Linux 6.8.0-124-generic x86_64`
* **Node.js Runtime:** `v22.22.2`
* **PM2 Process Manager:** `v5.3.1` (or latest)
* **Web Server:** Nginx (configured as reverse proxy and SSL terminator)
* **Production Paths:**
  - Project Root: `/var/www/trinetra`
  - Frontend Build Path: `/var/www/trinetra/dist`
  - Backend Root Path: `/var/www/trinetra/server`
  - Backend Build Path: `/var/www/trinetra/server/dist`
  - SQLite Database File: `/var/www/trinetra/server/data/trinetra.db`
  - WhatsApp Session Data: `/var/www/trinetra/server/data/wa-session`

---

## 2. Environment Variables Configuration

Environment variables reside in `/var/www/trinetra/server/.env` on the production server.

```env
PORT=5000
DATABASE_PATH=./data/trinetra.db
WHATSAPP_SESSION_PATH=./data/wa-session
JWT_SECRET=your_super_secret_jwt_hash_key
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_api_key
ADMIN_NOTIFY_PHONE=+918810721068
CALENDLY_URL=https://calendly.com/trinetra-demo
FRONTEND_URL=https://trinetradigitalsolution.com
NODE_ENV=production
```

> [!WARNING]
> Credentials, tokens, and SSH passwords must **NEVER** be committed to Git or printed in public documents. They must be configured directly on the server file system.

---

## 3. Deployment Flow (Step-by-Step)

To deploy updates to the production server:

1. **Push Changes:** Ensure local code is fully tested, committed, and pushed to the remote repository.
   ```bash
   git push origin main
   ```
2. **Access VPS:** SSH into the production server:
   ```bash
   ssh root@187.127.170.222
   ```
3. **Pull Updates:** Navigate to the project root and retrieve the latest commits:
   ```bash
   cd /var/www/trinetra
   git pull origin main
   ```
4. **Rebuild Frontend:** Install dependencies and bundle the React assets:
   ```bash
   npm install
   npm run build
   ```
5. **Rebuild Backend:** Navigate to the server folder, install backend packages, and compile TypeScript:
   ```bash
   cd server
   npm install
   npm run build
   ```
6. **Restart Backend Process:** Restart the server under PM2 using the update-env flag:
   ```bash
   pm2 restart trinetra-crm-backend --update-env
   ```
7. **Verify Nginx & Reload (if modified):**
   ```bash
   nginx -t
   systemctl reload nginx
   ```

---

## 4. PM2 Process Management

PM2 coordinates the background lifecycle of the backend API server. The process is defined in the configuration file: [server/ecosystem.config.js](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/ecosystem.config.js).

### Essential PM2 Commands:
* **View Status:** `pm2 status`
* **Restart Process:** `pm2 restart trinetra-crm-backend --update-env`
* **Stop Process:** `pm2 stop trinetra-crm-backend`
* **View Real-Time Logs:** `pm2 logs trinetra-crm-backend --lines 100`
* **Flush Logs:** `pm2 flush`
* **Check Memory Usage:** `pm2 monit`

---

## 5. Nginx Configuration

The production reverse proxy configuration resides at `/etc/nginx/sites-available/trinetra` (linked to `/etc/nginx/sites-enabled/trinetra`).

It separates the React SPA static routes (on `trinetradigitalsolution.com`) from API/WebSocket proxies (on `api.trinetradigitalsolution.com` pointing to local port `5000`):

```nginx
upstream trinetra_backend {
    server 127.0.0.1:5000;
    keepalive 32;
}

# Frontend Config Block
server {
    listen 443 ssl http2;
    server_name trinetradigitalsolution.com www.trinetradigitalsolution.com;

    ssl_certificate /etc/letsencrypt/live/api.trinetradigitalsolution.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.trinetradigitalsolution.com/privkey.pem;

    root /var/www/trinetra/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# API Backend Config Block
server {
    listen 443 ssl http2;
    server_name api.trinetradigitalsolution.com;

    ssl_certificate /etc/letsencrypt/live/api.trinetradigitalsolution.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.trinetradigitalsolution.com/privkey.pem;

    location /api/ {
        proxy_pass http://trinetra_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }
}
```

---

## 6. Safe SQLite Database Operations

Because the SQLite database is a single local file, operational upgrades require care:

### A. Database Migrations
* Database schema mutations are managed additively inside [server/src/database/connection.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/server/src/database/connection.ts).
* **Migration Rule:** Never run destructive migrations (such as `DROP TABLE`, `ALTER TABLE DROP COLUMN`, or renaming critical fields) in production unless explicitly approved in writing by the administrator. All columns must be added as `NULL` or with `DEFAULT` constraints.

### B. Automated Backups
* SQLite backups should be taken using the native SQLite backup command to ensure WAL files are safely flushed.
* **Manual Backup Command:**
  ```bash
  sqlite3 /var/www/trinetra/server/data/trinetra.db ".backup '/var/www/trinetra/server/data/backups/trinetra-backup-$(date +%F).db'"
  ```

---

## 7. Post-Deployment Verification Steps

Always perform these validation checks immediately following a deployment:

1. **Verify Backend Compile:** Check that the backend compilation successfully generated files in `server/dist`.
2. **Execute Functional Verify Script:** Run the automated post-deployment check suite on the server:
   ```bash
   cd /var/www/trinetra/server
   node verify_production_post.js
   ```
   *This checks database connection, WhatsApp socket health, OpenRouter cascading calls, CRM analytics calculations, and quotation PDF builds.*
3. **Verify API health endpoints:**
   - Query `/health` to verify Express web server state:
     `curl -s http://127.0.0.1:5000/health`
   - Query `/api/health` to verify database connection and Baileys WhatsApp state:
     `curl -s http://127.0.0.1:5000/api/health`
4. **Inspect Logs:** Ensure no crashes or loop restarts are occurring:
   ```bash
   pm2 logs trinetra-crm-backend --lines 50
   ```

---

## 8. Rollback Procedure

If a deployment breaks critical production capabilities:
1. **Revert Git Head:** Reset the working branch to the last known stable commit hash or release tag:
   ```bash
   git checkout tags/v1.0.0-trinetra-crm
   ```
2. **Rebuild Application:** Recompile both frontend and backend:
   ```bash
   npm install && npm run build
   cd server
   npm install && npm run build
   ```
3. **Restart Service:** Restart the PM2 process:
   ```bash
   pm2 restart trinetra-crm-backend --update-env
   ```
4. **Validate Rollback:** Run `node verify_production_post.js` to ensure the previous stable environment is fully restored.
