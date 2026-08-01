export type Role = 'OWNER' | 'MANAGER' | 'CASHIER' | 'CHEF' | 'WAITER';

export type PermissionCode = 
  | 'pos:order:create'
  | 'pos:order:update'
  | 'pos:order:bill'
  | 'pos:order:pay'
  | 'pos:order:discount'
  | 'pos:order:void'
  | 'table:view'
  | 'table:transfer'
  | 'table:manage'
  | 'kds:view'
  | 'kds:ticket:update'
  | 'menu:view'
  | 'menu:manage'
  | 'menu:toggle_stock'
  | 'inventory:view'
  | 'inventory:adjust'
  | 'reports:daily_close'
  | 'reports:financials'
  | 'settings:manage';

export function hasPermission(role: Role, permission: PermissionCode): boolean {
  if (role === 'OWNER') return true;
  if (role === 'MANAGER') return permission !== 'settings:manage';
  
  if (role === 'CASHIER') {
    return [
      'pos:order:create',
      'pos:order:update',
      'pos:order:bill',
      'pos:order:pay',
      'table:view',
      'table:transfer',
      'menu:view',
      'menu:toggle_stock'
    ].includes(permission);
  }

  if (role === 'CHEF') {
    return [
      'kds:view',
      'kds:ticket:update',
      'menu:view',
      'menu:toggle_stock',
      'inventory:view',
      'inventory:adjust'
    ].includes(permission);
  }

  if (role === 'WAITER') {
    return ['pos:order:create', 'pos:order:update', 'table:view', 'table:transfer', 'menu:view'].includes(permission);
  }

  return false;
}
