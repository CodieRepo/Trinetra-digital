import { describe, it, expect } from 'vitest';
import { hasPermission } from './permission';

describe('RBAC Permission Matrix Tests', () => {
  it('OWNER role inherits all permissions', () => {
    expect(hasPermission('OWNER', 'pos:order:create')).toBe(true);
    expect(hasPermission('OWNER', 'pos:order:discount')).toBe(true);
    expect(hasPermission('OWNER', 'pos:order:void')).toBe(true);
    expect(hasPermission('OWNER', 'settings:manage')).toBe(true);
  });

  it('MANAGER role can perform operational and reporting actions but not settings', () => {
    expect(hasPermission('MANAGER', 'pos:order:create')).toBe(true);
    expect(hasPermission('MANAGER', 'pos:order:discount')).toBe(true);
    expect(hasPermission('MANAGER', 'reports:financials')).toBe(true);
    expect(hasPermission('MANAGER', 'settings:manage')).toBe(false);
  });

  it('CASHIER role can create, bill, and pay orders but cannot apply discounts or void', () => {
    expect(hasPermission('CASHIER', 'pos:order:create')).toBe(true);
    expect(hasPermission('CASHIER', 'pos:order:bill')).toBe(true);
    expect(hasPermission('CASHIER', 'pos:order:pay')).toBe(true);
    expect(hasPermission('CASHIER', 'pos:order:discount')).toBe(false);
    expect(hasPermission('CASHIER', 'pos:order:void')).toBe(false);
  });

  it('CHEF role can view and bump KDS tickets and adjust inventory', () => {
    expect(hasPermission('CHEF', 'kds:view')).toBe(true);
    expect(hasPermission('CHEF', 'kds:ticket:update')).toBe(true);
    expect(hasPermission('CHEF', 'inventory:adjust')).toBe(true);
    expect(hasPermission('CHEF', 'pos:order:pay')).toBe(false);
  });
});
