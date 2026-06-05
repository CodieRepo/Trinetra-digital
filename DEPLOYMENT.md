# Trinetra OS — Deployment Guide

## Prerequisites

* Ubuntu 22.04 LTS (or similar)
* Node.js v20+
* Nginx (for reverse proxying and SSL)
* PM2 (Process Manager for Node.js)
* Git

## 1. Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

## 2. Application Deployment

```bash
# Clone the repository
git clone https://github.com/your-org/trinetra-crm.git /var/www/trinetra
cd /var/www/trinetra

# Build the Frontend
npm install
npm run build

# Build the Backend
cd server
npm install
npm run build
```

## 3. Environment Configuration

Create a `.env` file in the `/var/www/trinetra/server` directory:

```env
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://crm.trinetra.digital

# Database
DB_FILE=./data/trinetra.db

# OpenRouter Configuration
OPENROUTER_API_KEY=your_key_here
```

## 4. PM2 Process Management

Start the backend server using PM2.

```bash
# Start the application
cd /var/www/trinetra/server
pm2 start dist/index.js --name "trinetra-backend" --update-env

# Save the PM2 list to auto-start on server reboot
pm2 save
pm2 startup
```

## 5. Reverse Proxy Setup (Nginx)

Configure Nginx to serve the static frontend and proxy backend API requests.

```nginx
server {
    listen 80;
    server_name crm.trinetra.digital;

    # Serve built frontend static files
    root /var/www/trinetra/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API and WebSocket requests to Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 6. Update Procedure (Routine Deployments)

When pushing new features, run the following commands on the VPS:

```bash
cd /var/www/trinetra
git pull origin main

# Rebuild Frontend
npm install && npm run build

# Rebuild Backend
cd server
npm install && npm run build

# Restart the application
pm2 restart trinetra-backend --update-env
```

## 7. Backup Procedure

Automate SQLite backups using a cron job. The database is stored at `/var/www/trinetra/server/data/trinetra.db`.

```bash
# Example backup script (run daily via cron)
#!/bin/bash
BACKUP_DIR="/var/backups/trinetra"
DATE=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR
sqlite3 /var/www/trinetra/server/data/trinetra.db ".backup '$BACKUP_DIR/trinetra_$DATE.db'"
```

## 8. Rollback Procedure

If a deployment introduces critical bugs, execute the following commands to revert to a previous stable tag (e.g., `v1.0.0-trinetra-crm`).

```bash
cd /var/www/trinetra

# Fetch tags and checkout the stable version
git fetch --tags
git checkout tags/v1.0.0-trinetra-crm

# Rebuild Frontend and Backend
npm install && npm run build
cd server
npm install && npm run build

# Restart the application
pm2 restart trinetra-backend --update-env
```
