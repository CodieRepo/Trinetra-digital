/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/types/auth/session.types.ts
 * Description: Core authentication session types, user roles, terminal context,
 *              and immutable request context models.
 */

/**
 * 7 Primary User Roles in Trinetra Restaurant OS
 */
export type StaffRole = 
  | 'owner'
  | 'manager'
  | 'cashier'
  | 'waiter'
  | 'kitchen'
  | 'inventory'
  | 'accountant';

/**
 * Distinct Session Lifecycles supported by the Terminal-Centric Auth Engine
 */
export enum SessionType {
  /** Owner Administrative Session — Rare, password-authenticated SaaS session */
  OwnerAdmin = 'OWNER_ADMIN',
  
  /** Device Session — Long-lived, hardware paired terminal session */
  Device = 'DEVICE',
  
  /** Staff Session — Short-lived (15 min), PIN-authenticated working shift */
  Staff = 'STAFF',
  
  /** Manager Elevation Session — Temporary (5 min), action-scoped privileged override */
  ManagerElevation = 'MANAGER_ELEVATION'
}

/**
 * Hardware Terminal Types deployed across restaurant floors
 */
export type TerminalType = 'FloorPOS' | 'CashierPOS' | 'KitchenKDS' | 'ManagerMobile';

/**
 * Terminal Status Lifecycle States
 */
export type TerminalStatus = 'Active' | 'Suspended' | 'Revoked';

/**
 * Immutable Context carried by every authenticated API request
 */
export interface AuthContext {
  /** Unique Tenant Identifier */
  tenant_id: string;
  
  /** Restaurant / Branch Identifier */
  restaurant_id: string;
  
  /** Hardware Terminal Identifier (if request originates from terminal) */
  terminal_id: string | null;
  
  /** Authenticated Staff Member ID (if staff session active) */
  staff_id: string | null;
  
  /** Active RBAC Role for authorization check */
  role: StaffRole | 'super_admin';
  
  /** Session Type of the current request */
  session_type: SessionType;
  
  /** Unique Request Trace ID for logging and audit correlation */
  trace_id: string;
}

/**
 * Metadata for a paired hardware terminal
 */
export interface TerminalContext {
  terminal_id: string;
  tenant_id: string;
  restaurant_id: string;
  terminal_name: string;
  terminal_type: TerminalType;
  device_fingerprint: string | null;
  status: TerminalStatus;
  app_version: string;
  paired_at: string;
  last_seen_at: string;
}

/**
 * Context for an active staff member operating a terminal
 */
export interface StaffContext {
  staff_id: string;
  tenant_id: string;
  restaurant_id: string;
  name: string;
  role: StaffRole;
  is_active: boolean;
  last_login_at: string | null;
}
