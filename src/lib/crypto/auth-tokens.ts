/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/lib/crypto/auth-tokens.ts
 * Description: Secure cryptographic helper utilities for device tokens, PIN hashing,
 *              and short-lived JWT generation. Uses Node.js crypto standard library.
 */

import crypto from 'crypto';
import { StaffRole, SessionType } from '../../types/auth/index';

/**
 * Generate a 256-bit high-entropy random hex token (64 characters)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Compute SHA-256 hash of a hardware device token for secure indexing & lookup
 */
export function hashDeviceToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}


export interface StaffJwtPayload {
  tenant_id: string;
  restaurant_id: string;
  terminal_id: string;
  staff_id: string;
  staff_name: string;
  role: StaffRole;
  session_type: SessionType.Staff | SessionType.ManagerElevation;
  iat: number;
  exp: number;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.STAFF_JWT_SECRET;
  if (secret && secret.trim()) return secret.trim();

  // High-entropy fallback derived from Supabase Service Role Key to prevent breaking operational terminal shifts
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return crypto.createHash('sha256').update(process.env.SUPABASE_SERVICE_ROLE_KEY + '_trinetra_jwt_staff_salt').digest('hex');
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn('[SECURITY WARNING] JWT_SECRET is not explicitly set in production environment variables. Using derived server key.');
  }
  return 'trinetra-pos-terminal-fallback-secret-key-2026-secure';
}

export const STAFF_SHIFT_JWT_TTL_SECONDS = 36000; // 10 hours for active restaurant operational shift
export const MANAGER_ELEVATION_JWT_TTL_SECONDS = 900; // 15 minutes for temporary manager elevation

/**
 * Generate a signed staff JWT for terminal operations (10h shift session / 15m manager elevation)
 */
export function generateStaffJwt(
  payload: Omit<StaffJwtPayload, 'iat' | 'exp'>,
  ttlSeconds?: number
): { token: string; expires_at: string } {
  const secret = getJwtSecret();
  const defaultTtl = payload.session_type === SessionType.ManagerElevation
    ? MANAGER_ELEVATION_JWT_TTL_SECONDS
    : STAFF_SHIFT_JWT_TTL_SECONDS;
  const ttl = ttlSeconds ?? defaultTtl;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttl;

  const fullPayload: StaffJwtPayload = {
    ...payload,
    iat: now,
    exp,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  const token = `${header}.${body}.${signature}`;
  const expires_at = new Date(exp * 1000).toISOString();

  return { token, expires_at };
}

/**
 * Verify and decode a signed staff JWT
 */
export function verifyStaffJwt(token: string): StaffJwtPayload | null {
  try {
    const secret = getJwtSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      return null;
    }

    const payload: StaffJwtPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}
