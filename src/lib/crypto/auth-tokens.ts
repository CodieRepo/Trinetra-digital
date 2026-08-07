/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/lib/crypto/auth-tokens.ts
 * Description: Secure cryptographic helper utilities for device tokens, PIN hashing,
 *              and short-lived JWT generation. Uses Node.js crypto standard library.
 */

import crypto from 'crypto';
import { StaffRole, SessionType } from '../../types/auth';

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

/**
 * Compute SHA-256 hash of a staff PIN for secure database storage
 */
export function hashStaffPin(rawPin: string): string {
  return crypto.createHash('sha256').update(rawPin).digest('hex');
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

/**
 * Generate a short-lived (15-min) signed staff JWT for terminal operations
 */
export function generateStaffJwt(
  payload: Omit<StaffJwtPayload, 'iat' | 'exp'>,
  ttlSeconds: number = 900 // Default 15 minutes
): { token: string; expires_at: string } {
  const secret = process.env.JWT_SECRET || 'trinetra-pos-terminal-secret-key-2026';
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;

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
    const secret = process.env.JWT_SECRET || 'trinetra-pos-terminal-secret-key-2026';
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const payload: StaffJwtPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}
