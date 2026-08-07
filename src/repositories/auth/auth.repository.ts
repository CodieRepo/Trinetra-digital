/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/repositories/auth/auth.repository.ts
 * Description: Repository boundary interface and database access implementation
 *              for authentication, terminal pairing, PIN checks, and audit logs.
 */

export interface PairTerminalRepositoryInput {
  tenant_id: string;
  restaurant_id: string;
  terminal_name: string;
  terminal_type: string;
  device_token_hash: string;
  device_fingerprint?: string;
  owner_id?: string;
}

export interface VerifyStaffPinRepositoryInput {
  restaurant_id: string;
  device_token_hash: string;
  pin: string;
  ip_address?: string;
}

export interface SetStaffPinRepositoryInput {
  staff_id: string;
  restaurant_id: string;
  pin_hash: string;
}

export interface LogAuthEventRepositoryInput {
  tenant_id: string;
  restaurant_id: string;
  terminal_id?: string | null;
  actor_id?: string | null;
  actor_role?: string | null;
  event_type: string;
  ip_address?: string | null;
  metadata?: Record<string, unknown>;
}

export interface TerminalEntity {
  id: string;
  tenant_id: string;
  restaurant_id: string;
  terminal_name: string;
  terminal_type: string;
  status: string;
  app_version: string;
  paired_at: string;
  last_seen_at: string;
}

export interface StaffEntity {
  id: string;
  tenant_id: string;
  restaurant_id: string;
  name: string;
  role: string;
  is_active: boolean;
}

export interface AuthAuditLogEntity {
  id: string;
  tenant_id: string;
  restaurant_id: string;
  terminal_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  event_type: string;
  ip_address: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Abstract Repository Interface — Decouples Domain Services from Database Client
 */
export interface IAuthRepository {
  pairTerminalDevice(input: PairTerminalRepositoryInput): Promise<{
    success: boolean;
    terminal_id: string;
    terminal_name: string;
    terminal_type: string;
  }>;

  verifyStaffPin(input: VerifyStaffPinRepositoryInput): Promise<{
    success: boolean;
    error_code?: string;
    message?: string;
    tenant_id?: string;
    restaurant_id?: string;
    terminal_id?: string;
    staff_id?: string;
    staff_name?: string;
    role?: string;
  }>;

  setStaffPin(input: SetStaffPinRepositoryInput): Promise<{
    success: boolean;
    message: string;
  }>;

  revokeTerminalDevice(terminal_id: string, revoked_by?: string): Promise<{
    success: boolean;
    message: string;
  }>;

  getTerminalById(terminal_id: string): Promise<TerminalEntity | null>;
  getStaffById(staff_id: string, restaurant_id: string): Promise<StaffEntity | null>;
  logAuthEvent(input: LogAuthEventRepositoryInput): Promise<void>;
  getAuditLogs(tenant_id: string, restaurant_id: string, limit?: number): Promise<AuthAuditLogEntity[]>;
}
