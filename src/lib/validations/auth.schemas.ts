/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/lib/validations/auth.schemas.ts
 * Description: Zod validation schemas with explicit validation rules, custom error messages,
 *              inferred TypeScript types, and reusable exports for runtime validation.
 */

import { z } from 'zod';

// =========================================================================
// 1. TERMINAL PAIRING SCHEMA
// =========================================================================
export const pairTerminalSchema = z.object({
  tenant_id: z.string().uuid({
    message: 'Invalid tenant UUID format',
  }),
  restaurant_id: z.string().uuid({
    message: 'Invalid restaurant/branch UUID format',
  }),
  terminal_name: z
    .string()
    .min(2, { message: 'Terminal name must be at least 2 characters' })
    .max(50, { message: 'Terminal name must not exceed 50 characters' }),
  terminal_type: z.enum(['FloorPOS', 'CashierPOS', 'KitchenKDS', 'ManagerMobile'], {
    message: 'Terminal type must be one of: FloorPOS, CashierPOS, KitchenKDS, ManagerMobile',
  }),
  device_fingerprint: z.string().max(255).optional(),
  app_version: z.string().min(1, { message: 'App version is required' }).default('v1.0.0'),
});

export type PairTerminalInput = z.infer<typeof pairTerminalSchema>;

// =========================================================================
// 2. STAFF PIN LOGIN SCHEMA
// =========================================================================
export const staffPinLoginSchema = z.object({
  restaurant_id: z.string().uuid({
    message: 'Invalid restaurant/branch UUID format',
  }),
  device_token: z.string().min(16, {
    message: 'Device token must be at least 16 characters',
  }),
  pin: z.string().regex(/^\d{4,6}$/, {
    message: 'PIN must be between 4 and 6 numeric digits',
  }),
  ip_address: z.string().optional(),
});

export type StaffPinLoginInput = z.infer<typeof staffPinLoginSchema>;

// =========================================================================
// 3. MANAGER ELEVATION SCHEMA
// =========================================================================
export const managerElevationSchema = z.object({
  restaurant_id: z.string().uuid({
    message: 'Invalid restaurant/branch UUID format',
  }),
  terminal_id: z.string().uuid({
    message: 'Invalid terminal UUID format',
  }),
  manager_pin: z.string().regex(/^\d{4,6}$/, {
    message: 'Manager PIN must be between 4 and 6 numeric digits',
  }),
  target_action: z.string().min(2, {
    message: 'Target action description is required for manager elevation',
  }),
  reason: z.string().optional(),
});

export type ManagerElevationInput = z.infer<typeof managerElevationSchema>;

// =========================================================================
// 4. TERMINAL REVOCATION SCHEMA
// =========================================================================
export const revokeTerminalSchema = z.object({
  terminal_id: z.string().uuid({
    message: 'Invalid terminal UUID format',
  }),
  reason: z.string().min(3, {
    message: 'Revocation reason must be at least 3 characters',
  }),
});

export type RevokeTerminalInput = z.infer<typeof revokeTerminalSchema>;

// =========================================================================
// 5. SET / RESET STAFF PIN SCHEMA
// =========================================================================
export const setStaffPinSchema = z.object({
  staff_id: z.string().uuid({
    message: 'Invalid staff UUID format',
  }),
  restaurant_id: z.string().uuid({
    message: 'Invalid restaurant/branch UUID format',
  }),
  pin: z.string().regex(/^\d{4,6}$/, {
    message: 'PIN must be between 4 and 6 numeric digits',
  }),
});

export type SetStaffPinInput = z.infer<typeof setStaffPinSchema>;
