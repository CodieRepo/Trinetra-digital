# Production Deployment & Infrastructure Guide — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: DevOps & Infrastructure  
> **Related Documents**: [SYSTEM_ARCHITECTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/SYSTEM_ARCHITECTURE.md)

---

## 1. Purpose

This document details the environment setup, deployment pipeline, Vercel Edge hosting configuration, Supabase database migration procedures, monitoring telemetry, and disaster recovery strategies for **Trinetra v2.0**.

---

## 2. Infrastructure & Hosting Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE PLATFORM HOSTING                      │
│  - Next.js 14 App Router Deployment                                    │
│  - Serverless Node.js Route Handlers                                   │
│  - Global CDN Asset Caching                                            │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   SUPABASE MANAGED CLOUD BACKEND                       │
│  - Multi-Tenant PostgreSQL 16 Instance with RLS Security               │
│  - Supabase Auth (JWT Issuer & User Management)                        │
│  - Supabase Realtime Server (WebSocket Engine)                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Environment Variables Configuration (`.env.production`)

```bash
# Production Environment Configuration Blueprint

# Next.js App
NEXT_PUBLIC_APP_URL="https://app.trinetra.io"
NODE_ENV="production"

# Supabase Managed Backend
NEXT_PUBLIC_SUPABASE_URL="https://xyzcompany.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# Prisma Database Connections
DATABASE_URL="postgres://postgres:[PASSWORD]@db.xyzcompany.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres:[PASSWORD]@db.xyzcompany.supabase.co:5432/postgres"

# AI Gateway Keys
OPENAI_API_KEY="sk-proj-..."
GEMINI_API_KEY="AIzaSy..."

# ESC/POS Print Bridge / Payment Secrets
RAZORPAY_KEY_ID="rzp_live_..."
RAZORPAY_KEY_SECRET="..."
```

---

## 4. Database Migration & Deployment Commands

```bash
# 1. Run Prisma Migration in Production
npx prisma migrate deploy

# 2. Generate Production Client
npx prisma generate

# 3. Build & Deploy Next.js App to Vercel
npx vercel --prod
```

---

## 5. Monitoring, Telemetry & Disaster Recovery

- **APM & Error Tracking**: Sentry integrated for frontend and API exception tracking with alert thresholds.
- **Database Backups**: Supabase daily automated physical backups + WAL point-in-time recovery (PITR) enabled.
- **Healthcheck Endpoint**: `GET /api/health` asserts DB connectivity, WebSocket health, and memory usage.
