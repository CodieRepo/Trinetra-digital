# Role-Based Access Control (RBAC) Permissions Matrix — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Platform Security Blueprint  
> **Related Documents**: [AUTHENTICATION.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/07_Security/AUTHENTICATION.md)

---

## 1. Purpose

This document provides the canonical Role-Based Access Control (RBAC) matrix for **Trinetra v2.0**. It maps explicit permission strings to user roles (`OWNER`, `MANAGER`, `CASHIER`, `CHEF`, `WAITER`).

---

## 2. Exhaustive Permission Matrix

| Permission Code | Category | Description | OWNER | MANAGER | CASHIER | CHEF | WAITER |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `pos:order:create` | POS | Create new orders & add line items | ✅ | ✅ | ✅ | ❌ | ✅ |
| `pos:order:update` | POS | Edit active draft/placed order items | ✅ | ✅ | ✅ | ❌ | ✅ |
| `pos:order:bill` | POS | Generate & print customer bill | ✅ | ✅ | ✅ | ❌ | ❌ |
| `pos:order:pay` | POS | Process payments & close order | ✅ | ✅ | ✅ | ❌ | ❌ |
| `pos:order:discount`| POS | Apply bill/item percentage discount | ✅ | ✅ | ❌ | ❌ | ❌ |
| `pos:order:void` | POS | Cancel order & refund payment | ✅ | ✅ | ❌ | ❌ | ❌ |
| `table:view` | Floor | View table occupancy floorplan | ✅ | ✅ | ✅ | ❌ | ✅ |
| `table:transfer` | Floor | Transfer order between tables | ✅ | ✅ | ✅ | ❌ | ✅ |
| `table:manage` | Floor | Edit floorplan layout & grid | ✅ | ✅ | ❌ | ❌ | ❌ |
| `kds:view` | KDS | View kitchen display screens | ✅ | ✅ | ❌ | ✅ | ❌ |
| `kds:ticket:update`| KDS | Bump ticket & change prep state | ✅ | ✅ | ❌ | ✅ | ❌ |
| `menu:view` | Menu | View menu catalog & pricing | ✅ | ✅ | ✅ | ✅ | ✅ |
| `menu:manage` | Menu | Edit categories, items, prices | ✅ | ✅ | ❌ | ❌ | ❌ |
| `menu:toggle_stock`| Menu | 86 an item (toggle stock) | ✅ | ✅ | ✅ | ✅ | ❌ |
| `inventory:view` | Stock | View raw ingredient inventory | ✅ | ✅ | ❌ | ✅ | ❌ |
| `inventory:adjust` | Stock | Perform manual stock adjustments| ✅ | ✅ | ❌ | ✅ | ❌ |
| `reports:daily_close`| Reports | View & perform daily Z-close | ✅ | ✅ | ❌ | ❌ | ❌ |
| `reports:financials`| Reports | View net revenue & margins | ✅ | ✅ | ❌ | ❌ | ❌ |
| `settings:manage` | Admin | Edit branch settings & users | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Implementation Code Example

```typescript
// src/modules/core/security/permissions.ts

export type PermissionCode = 
  | 'pos:order:create'
  | 'pos:order:bill'
  | 'pos:order:discount'
  | 'pos:order:void'
  | 'kds:ticket:update'
  | 'menu:manage'
  | 'menu:toggle_stock'
  | 'inventory:adjust'
  | 'reports:daily_close';

export function checkUserPermission(userRole: string, permission: PermissionCode): boolean {
  if (userRole === 'OWNER') return true; // Owner inherits all permissions
  if (userRole === 'MANAGER') return permission !== 'settings:manage';
  
  if (userRole === 'CASHIER') {
    return ['pos:order:create', 'pos:order:update', 'pos:order:bill', 'pos:order:pay', 'table:view', 'table:transfer', 'menu:view', 'menu:toggle_stock'].includes(permission);
  }
  
  if (userRole === 'CHEF') {
    return ['kds:view', 'kds:ticket:update', 'menu:view', 'menu:toggle_stock', 'inventory:view', 'inventory:adjust'].includes(permission);
  }

  return false;
}
```
