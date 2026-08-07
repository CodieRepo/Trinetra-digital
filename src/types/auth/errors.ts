/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/types/auth/errors.ts
 * Description: Standardized error code taxonomy and API error response DTOs.
 */

/**
 * Standardized Auth Error Codes
 */
export enum AuthErrorCode {
  // Device & Terminal Errors
  TERMINAL_NOT_FOUND = 'TERMINAL_NOT_FOUND',
  TERMINAL_NOT_ACTIVE = 'TERMINAL_NOT_ACTIVE',
  TERMINAL_REVOKED = 'TERMINAL_REVOKED',
  DEVICE_TOKEN_INVALID = 'DEVICE_TOKEN_INVALID',
  DEVICE_ALREADY_PAIRED = 'DEVICE_ALREADY_PAIRED',

  // Staff & PIN Errors
  STAFF_NOT_FOUND = 'STAFF_NOT_FOUND',
  STAFF_INACTIVE = 'STAFF_INACTIVE',
  INVALID_STAFF_PIN = 'INVALID_STAFF_PIN',
  PIN_LOCKOUT_ACTIVE = 'PIN_LOCKOUT_ACTIVE',
  PIN_FORMAT_INVALID = 'PIN_FORMAT_INVALID',

  // Elevation & RBAC Errors
  INSUFFICIENT_ELEVATION = 'INSUFFICIENT_ELEVATION',
  ELEVATION_EXPIRED = 'ELEVATION_EXPIRED',
  MANAGER_PIN_REQUIRED = 'MANAGER_PIN_REQUIRED',
  UNAUTHORIZED_TENANT = 'UNAUTHORIZED_TENANT',
  FORBIDDEN_ROLE = 'FORBIDDEN_ROLE',

  // Token & Session Errors
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_MALFORMED = 'TOKEN_MALFORMED',

  // Rate Limiting & Validation
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_AUTH_ERROR = 'INTERNAL_AUTH_ERROR'
}

/**
 * Standardized API Error Response Payload
 */
export interface ApiErrorResponse {
  /** Machine-readable error code */
  code: AuthErrorCode;
  
  /** Human-readable error message */
  message: string;
  
  /** Field-level validation errors or metadata */
  details?: Record<string, string[] | string | number | boolean>;
  
  /** Timestamp when error occurred (ISO 8601) */
  timestamp: string;
  
  /** Unique correlation trace ID */
  trace_id: string;
}
