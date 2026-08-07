/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/types/auth/dtos.ts
 * Description: Version-friendly Request and Response Data Transfer Objects (DTOs)
 *              and generic API response contract wrappers.
 */

import { StaffRole, TerminalType, TerminalStatus, SessionType } from './session.types';
import { ApiErrorResponse } from './errors';

/**
 * Metadata Wrapper attached to every API Response
 */
export interface ApiResponseMeta {
  timestamp: string;
  version: 'v1';
  trace_id: string;
}

/**
 * Standardized API Response Wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
  meta: ApiResponseMeta;
}

// =========================================================================
// 1. TERMINAL PAIRING DTOs
// =========================================================================

export interface PairTerminalRequestDTO {
  tenant_id: string;
  restaurant_id: string;
  terminal_name: string;
  terminal_type: TerminalType;
  device_fingerprint?: string;
  app_version: string;
}

export interface PairTerminalResponseDTO {
  terminal_id: string;
  terminal_name: string;
  terminal_type: TerminalType;
  device_token: string; // Plaintext token returned ONCE upon pairing
  status: TerminalStatus;
  paired_at: string;
}

// =========================================================================
// 2. STAFF PIN LOGIN DTOs
// =========================================================================

export interface StaffPinLoginRequestDTO {
  restaurant_id: string;
  device_token: string;
  pin: string;
  ip_address?: string;
}

export interface StaffPinLoginResponseDTO {
  staff_jwt: string;
  expires_at: string;
  staff: {
    staff_id: string;
    name: string;
    role: StaffRole;
  };
  terminal: {
    terminal_id: string;
    terminal_name: string;
    terminal_type: TerminalType;
  };
  session_type: SessionType.Staff;
}

// =========================================================================
// 3. MANAGER ELEVATION DTOs
// =========================================================================

export interface ManagerElevationRequestDTO {
  restaurant_id: string;
  terminal_id: string;
  manager_pin: string;
  target_action: string;
  reason?: string;
}

export interface ManagerElevationResponseDTO {
  elevation_token: string;
  expires_at: string;
  manager: {
    staff_id: string;
    name: string;
    role: 'owner' | 'manager';
  };
  target_action: string;
  session_type: SessionType.ManagerElevation;
}

// =========================================================================
// 4. TERMINAL REVOCATION DTOs
// =========================================================================

export interface RevokeTerminalRequestDTO {
  terminal_id: string;
  reason: string;
}

export interface RevokeTerminalResponseDTO {
  terminal_id: string;
  status: 'Revoked';
  revoked_at: string;
}

// =========================================================================
// 5. STAFF PIN MANAGEMENT DTOs
// =========================================================================

export interface SetStaffPinRequestDTO {
  staff_id: string;
  restaurant_id: string;
  pin: string;
}

export interface SetStaffPinResponseDTO {
  staff_id: string;
  updated_at: string;
}
