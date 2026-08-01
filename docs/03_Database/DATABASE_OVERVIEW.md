# Database Architecture & Data Strategy Overview — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Platform & Restaurant OS Database  
> **Related Documents**: [DATABASE_SCHEMA.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/03_Database/DATABASE_SCHEMA.md), [MULTI_TENANT_ARCHITECTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/MULTI_TENANT_ARCHITECTURE.md)

---

## 1. Purpose

This document details the database architecture, engine selection, multi-tenant isolation strategy, indexing guidelines, migration patterns, and data retention policies for **Trinetra v2.0**.

---

## 2. Technology & Engine Selection

- **Primary Relational Database**: PostgreSQL 16+ hosted on Supabase Managed Cloud.
- **Object Relational Mapper (ORM)**: Prisma ORM for type-safe query generation, schema migrations, and relational modelling.
- **Security Engine**: PostgreSQL Row-Level Security (RLS) for tenant isolation scoped by `branch_id`.
- **Indexing Strategy**: B-Tree indexes on foreign keys, Composite indexes on `(branch_id, created_at)` for high-velocity queries, and GIN indexes for JSONB metadata fields.

---

## 3. High-Level Entity Relationship Overview

```
[ organizations ]
        │ 1:N
        ▼
  [ restaurants ]
        │ 1:N
        ▼
   [ branches ] ───► [ users / roles ]
        │ 1:N
        ├───► [ floors ] ──► [ tables ] ──► [ table_sessions ]
        │                                         │
        ├───► [ categories ] ──► [ menu_items ] ──┤
        │                              │          │
        │                              ▼          ▼
        ├───► [ ingredients ] ◄── [ recipe_bom ] ──► [ orders ] ──► [ order_items ]
        │                                               │
        └───────────────────────────────────────────────┴──► [ payments ]
```

---

## 4. Database Principles

1. **Strict Normalization**: Tables are normalized to 3rd Normal Form (3NF), except for deliberate JSONB fields storing immutable snapshot data (e.g., historical item prices in finalized receipts).
2. **Integer Currency Storage**: All monetary figures (`amount_cents`, `price_cents`, `tax_cents`) are stored as 64-bit BigInt/Integer values to prevent rounding inaccuracies.
3. **Soft Deletes**: Critical transactional records (menu items, categories, staff accounts) use `deleted_at IS NULL` filters rather than physical `DELETE` statements.
