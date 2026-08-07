/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/lib/api/error-mapper.ts
 * Description: Centralized error mapper translating domain exceptions & Zod errors into
 *              standardized HTTP status codes and ApiErrorResponse payloads.
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthErrorCode, ApiResponse, ApiErrorResponse } from '../../types/auth';

/**
 * Map AuthErrorCode enum values to HTTP Status Codes
 */
export function getHttpStatusCode(code: AuthErrorCode): number {
  switch (code) {
    case AuthErrorCode.VALIDATION_ERROR:
    case AuthErrorCode.PIN_FORMAT_INVALID:
      return 400; // Bad Request

    case AuthErrorCode.INVALID_STAFF_PIN:
    case AuthErrorCode.DEVICE_TOKEN_INVALID:
    case AuthErrorCode.SESSION_EXPIRED:
    case AuthErrorCode.TOKEN_INVALID:
    case AuthErrorCode.TOKEN_MALFORMED:
      return 401; // Unauthorized

    case AuthErrorCode.UNAUTHORIZED_TENANT:
    case AuthErrorCode.FORBIDDEN_ROLE:
    case AuthErrorCode.INSUFFICIENT_ELEVATION:
    case AuthErrorCode.ELEVATION_EXPIRED:
    case AuthErrorCode.MANAGER_PIN_REQUIRED:
      return 403; // Forbidden

    case AuthErrorCode.TERMINAL_NOT_FOUND:
    case AuthErrorCode.STAFF_NOT_FOUND:
      return 404; // Not Found

    case AuthErrorCode.DEVICE_ALREADY_PAIRED:
      return 409; // Conflict

    case AuthErrorCode.TERMINAL_REVOKED:
    case AuthErrorCode.TERMINAL_NOT_ACTIVE:
    case AuthErrorCode.STAFF_INACTIVE:
      return 422; // Unprocessable Entity

    case AuthErrorCode.PIN_LOCKOUT_ACTIVE:
    case AuthErrorCode.RATE_LIMIT_EXCEEDED:
      return 429; // Too Many Requests / Lockout

    case AuthErrorCode.INTERNAL_AUTH_ERROR:
    default:
      return 500; // Internal Server Error
  }
}

/**
 * Handle errors thrown during API request processing and return typed ApiResponse wrapper
 */
export function createErrorResponse(
  error: unknown,
  traceId: string
): NextResponse<ApiResponse<never>> {
  let errorCode = AuthErrorCode.INTERNAL_AUTH_ERROR;
  let errorMessage = 'An unexpected authentication error occurred';
  let details: Record<string, string[]> | undefined = undefined;

  if (error instanceof ZodError) {
    errorCode = AuthErrorCode.VALIDATION_ERROR;
    errorMessage = 'Request validation failed';
    details = {};
    error.issues.forEach((issue) => {
      const pathKey = issue.path.join('.') || 'root';
      if (!details![pathKey]) details![pathKey] = [];
      details![pathKey].push(issue.message);
    });
  } else if (error instanceof Error) {
    if (Object.values(AuthErrorCode).includes(error.message as AuthErrorCode)) {
      errorCode = error.message as AuthErrorCode;
      errorMessage = getReadableErrorMessage(errorCode);
    } else {
      errorMessage = error.message;
    }
  }

  const statusCode = getHttpStatusCode(errorCode);

  const errorPayload: ApiErrorResponse = {
    code: errorCode,
    message: errorMessage,
    details,
    timestamp: new Date().toISOString(),
    trace_id: traceId,
  };

  const responsePayload: ApiResponse<never> = {
    success: false,
    error: errorPayload,
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      trace_id: traceId,
    },
  };

  return NextResponse.json(responsePayload, { status: statusCode });
}

function getReadableErrorMessage(code: AuthErrorCode): string {
  switch (code) {
    case AuthErrorCode.TERMINAL_NOT_FOUND:
      return 'The specified hardware terminal could not be found';
    case AuthErrorCode.TERMINAL_NOT_ACTIVE:
      return 'The hardware terminal is inactive or pending pairing';
    case AuthErrorCode.TERMINAL_REVOKED:
      return 'Access for this hardware terminal has been revoked';
    case AuthErrorCode.DEVICE_TOKEN_INVALID:
      return 'Invalid or unauthenticated device token provided';
    case AuthErrorCode.DEVICE_ALREADY_PAIRED:
      return 'This hardware terminal device token is already paired';
    case AuthErrorCode.STAFF_NOT_FOUND:
      return 'Staff member profile not found';
    case AuthErrorCode.STAFF_INACTIVE:
      return 'Staff member account is inactive';
    case AuthErrorCode.INVALID_STAFF_PIN:
      return 'Incorrect staff PIN entered';
    case AuthErrorCode.PIN_LOCKOUT_ACTIVE:
      return 'Terminal is temporarily locked out due to multiple failed PIN attempts';
    case AuthErrorCode.INSUFFICIENT_ELEVATION:
      return 'Privileged operation requires Owner or Manager elevation';
    default:
      return 'Authentication request failed';
  }
}
