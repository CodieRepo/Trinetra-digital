/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/lib/api/response.ts
 * Description: Standardized success response builder adhering to ApiResponse<T> contract.
 */

import { NextResponse } from 'next/server';
import { ApiResponse } from '../../types/auth';

/**
 * Build a standardized Next.js JSON success response
 */
export function createSuccessResponse<T>(
  data: T,
  traceId: string,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      trace_id: traceId,
    },
  };

  return NextResponse.json(payload, { status: statusCode });
}
