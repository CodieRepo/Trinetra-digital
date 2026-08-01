# Authentication & RBAC Security Specification — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Security Blueprint  
> **Related Documents**: [MULTI_TENANT_ARCHITECTURE.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/MULTI_TENANT_ARCHITECTURE.md)

---

## 1. Purpose

This document details the authentication protocols, Role-Based Access Control (RBAC) permission maps, quick-switch cashier PIN hashing, JWT session lifecycle, rate limiting, and security hardening for **Trinetra v2.0**.

---

## 2. Authentication Methods

1. **Manager & Owner Auth**: Standard Email + Password / OAuth via Supabase Auth issuing short-lived JWT access tokens (1-hour expiry) and HTTP-only secure refresh cookies.
2. **Cashier POS Quick-Switch PIN Auth**: 4-digit PIN authentication hashed with Argon2id / bcrypt. Cashiers switch terminal user context in `< 1s` without destroying active POS UI state.

---

## 3. Role-Based Access Control (RBAC) Permission Matrix

| Permission Key | Description | OWNER | MANAGER | CASHIER | CHEF | WAITER |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `pos:order:create` | Create new orders | Yes | Yes | Yes | No | Yes |
| `pos:order:bill` | Print bill & apply tax | Yes | Yes | Yes | No | No |
| `pos:order:discount`| Apply order discount | Yes | Yes | No | No | No |
| `pos:order:void` | Void order / refund | Yes | Yes | No | No | No |
| `kds:ticket:update` | Bump KDS tickets | Yes | Yes | No | Yes | No |
| `inventory:adjust` | Modify raw stock levels | Yes | Yes | No | Yes | No |
| `reports:view_financials` | View daily closing reports | Yes | Yes | No | No | No |
| `settings:manage_branch` | Edit floorplan / menu | Yes | Yes | No | No | No |

---

## 4. Permission Checker Hook Example

```typescript
// src/modules/core/hooks/use-permissions.ts
import { useTenantContext } from '../context/tenant-context';

export function usePermissions() {
  const { userPermissions } = useTenantContext();

  const hasPermission = (permission: string): boolean => {
    return userPermissions.has(permission);
  };

  return { hasPermission };
}
```

---

## 5. Security & OWASP Hardening Checklist

- **Strict Input Sanitization**: All incoming request payloads validated against Zod schemas.
- **SQL Injection Prevention**: Prisma ORM parametrized queries + PostgreSQL RLS.
- **Rate Limiting**: API routes limited to 100 requests per minute per IP using Redis / Upstash rate limiters.
- **CSRF & CORS**: SameSite Lax cookies + explicit CORS origin whitelist.
