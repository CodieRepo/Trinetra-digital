/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/lib/api/context-resolver.ts
 * Description: Request context extractor retrieving trace_id, client IP address, and auth bearer headers.
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';

export interface ResolvedRequestContext {
  traceId: string;
  ipAddress: string;
  bearerToken: string | null;
}

/**
 * Extract tracing and authorization metadata from incoming NextRequest
 */
export function resolveRequestContext(req: NextRequest): ResolvedRequestContext {
  const traceId = req.headers.get('x-trace-id') || crypto.randomUUID();
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const authHeader = req.headers.get('authorization');
  let bearerToken: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.substring(7).trim();
  }

  return {
    traceId,
    ipAddress,
    bearerToken,
  };
}
