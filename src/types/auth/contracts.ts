/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/types/auth/contracts.ts
 * Description: API Endpoint definitions and type-safe API contract mapping for all
 *              Milestone 2 authentication endpoints.
 */

import {
  PairTerminalRequestDTO,
  PairTerminalResponseDTO,
  StaffPinLoginRequestDTO,
  StaffPinLoginResponseDTO,
  ManagerElevationRequestDTO,
  ManagerElevationResponseDTO,
  RevokeTerminalRequestDTO,
  RevokeTerminalResponseDTO,
  SetStaffPinRequestDTO,
  SetStaffPinResponseDTO,
  ApiResponse,
} from './dtos';

/**
 * Standardized API Endpoint Constants for Milestone 2 Authentication
 */
export const AUTH_ENDPOINTS = {
  /** Pair a new hardware terminal device */
  PAIR_TERMINAL: '/api/v1/auth/terminals/pair',

  /** Staff PIN authentication on a paired terminal */
  STAFF_PIN_LOGIN: '/api/v1/auth/staff/pin-login',

  /** Elevate manager privileges for restricted operational actions */
  MANAGER_ELEVATION: '/api/v1/auth/manager/elevate',

  /** Revoke an active hardware terminal */
  REVOKE_TERMINAL: '/api/v1/auth/terminals/revoke',

  /** Set or update a staff member's security PIN */
  SET_STAFF_PIN: '/api/v1/auth/staff/set-pin',
} as const;

/**
 * Type-safe API Contract Map for API Endpoints
 */
export interface AuthApiContractMap {
  [AUTH_ENDPOINTS.PAIR_TERMINAL]: {
    method: 'POST';
    request: PairTerminalRequestDTO;
    response: ApiResponse<PairTerminalResponseDTO>;
  };
  [AUTH_ENDPOINTS.STAFF_PIN_LOGIN]: {
    method: 'POST';
    request: StaffPinLoginRequestDTO;
    response: ApiResponse<StaffPinLoginResponseDTO>;
  };
  [AUTH_ENDPOINTS.MANAGER_ELEVATION]: {
    method: 'POST';
    request: ManagerElevationRequestDTO;
    response: ApiResponse<ManagerElevationResponseDTO>;
  };
  [AUTH_ENDPOINTS.REVOKE_TERMINAL]: {
    method: 'POST';
    request: RevokeTerminalRequestDTO;
    response: ApiResponse<RevokeTerminalResponseDTO>;
  };
  [AUTH_ENDPOINTS.SET_STAFF_PIN]: {
    method: 'POST';
    request: SetStaffPinRequestDTO;
    response: ApiResponse<SetStaffPinResponseDTO>;
  };
}
