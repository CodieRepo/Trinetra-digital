# Server Access & Infrastructure Reference

This document serves as an operational reference for the Trinetra CRM production server environment. It contains network coordinates, folder bindings, and service locations.

---

## 1. Host & Network Details

* **SSH Host IP:** `187.127.170.222`
* **SSH Port:** `22`
* **SSH User:** `root`
* **Root Access Method:** Password authentication (credentials managed locally outside the codebase).
* **VPS Provider:** `NOT YET VERIFIED` (managed under parent DNS and server hostings).
* **Server OS:** `Ubuntu 24.04.4 LTS (Noble Numbat)`
* **Kernel version:** `Linux 6.8.0-124-generic x86_64`

---

## 2. Directories & Process Information

* **Main Project Path:** `/var/www/trinetra`
* **Express Backend Path:** `/var/www/trinetra/server`
* **PM2 Process Name:** `trinetra-crm-backend`
* **PM2 Process ID (Production):** `0`
* **Express Listening Port:** `5000` (proxied to public traffic via Nginx reverse proxy)
* **SQLite Database File:** `/var/www/trinetra/server/data/trinetra.db` (in Write-Ahead Log WAL mode)
* **WhatsApp Session Folder:** `/var/www/trinetra/server/data/wa-session` (contains baileys socket session `creds.json`)
* **Session Backups Folder:** `/var/www/trinetra/server/data/backups`

---

## 3. Web Server & SSL Certificates

* **Nginx Configuration Path:** `/etc/nginx/sites-available/trinetra` (linked to `/etc/nginx/sites-enabled/trinetra`)
* **Systemd Service Name:** `nginx`
* **Nginx Status Check:** `systemctl status nginx`
* **Nginx Config Check:** `nginx -t`
* **SSL Certificates Provider:** Let's Encrypt Certbot
* **SSL Certificate Paths:**
  - **Full Chain:** `/etc/letsencrypt/live/api.trinetradigitalsolution.com/fullchain.pem`
  - **Private Key:** `/etc/letsencrypt/live/api.trinetradigitalsolution.com/privkey.pem`
  - **SSL Options:** `/etc/letsencrypt/options-ssl-nginx.conf`
  - **DH Params:** `/etc/letsencrypt/ssl-dhparams.pem`

---

## 4. Production Domain Registry

The production Nginx block handles routes for the following domains:

* **Production CRM Portal & Marketing Site:** `https://trinetradigitalsolution.com` (served from `/var/www/trinetra/dist`)
* **Production API Server:** `https://api.trinetradigitalsolution.com` (proxied to port `5000/api`)
* **Developer Panel / Sandbox Subdomain:** `https://dev.trinetradigitalsolution.com` (proxied to staging ports)
* **Staging Sandbox Subdomain:** `https://paperclip.trinetradigitalsolution.com` (proxied to port `3100`)

---

## 5. Security & Credentials Warning

> [!WARNING]
> Security credentials, including the server root password, SSH private keys, OpenRouter API keys (`OPENROUTER_API_KEY`), and JWT secret tokens (`JWT_SECRET`), must **NEVER** be committed to Git or written in any repository markdown files. They must reside exclusively in secure `.env` files on the production server.
