/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/services/auth/staff-authentication.service.ts
 * Description: Domain service handling staff PIN authentication and short-lived JWT generation.
 */

import {
  StaffPinLoginInput,
  StaffPinLoginResponseDTO,
  staffPinLoginSchema,
  AuthErrorCode,
  SessionType,
  StaffRole,
} from '../../types/auth';
import { IAuthRepository } from '../../repositories/auth/auth.repository';
import { hashDeviceToken, generateStaffJwt } from '../../lib/crypto/auth-tokens';

export class StaffAuthenticationService {
  constructor(private authRepo: IAuthRepository) {}

  /**
   * Authenticate staff member on paired terminal using PIN
   */
  async loginWithPin(rawInput: StaffPinLoginInput): Promise<StaffPinLoginResponseDTO> {
    // 1. Validate Input Schema
    const validatedInput = staffPinLoginSchema.parse(rawInput);

    // 2. Hash Device Token for Lookup
    const deviceTokenHash = hashDeviceToken(validatedInput.device_token);

    // 3. Execute PIN Verification & Lockout Evaluation via Repository RPC
    const result = await this.authRepo.verifyStaffPin({
      restaurant_id: validatedInput.restaurant_id,
      device_token_hash: deviceTokenHash,
      pin: validatedInput.pin,
      ip_address: validatedInput.ip_address,
    });

    if (!result.success) {
      if (result.error_code === 'TERMINAL_NOT_ACTIVE') {
        throw new Error(AuthErrorCode.TERMINAL_NOT_ACTIVE);
      }
      if (result.error_code === 'PIN_LOCKOUT_ACTIVE') {
        throw new Error(AuthErrorCode.PIN_LOCKOUT_ACTIVE);
      }
      throw new Error(AuthErrorCode.INVALID_STAFF_PIN);
    }

    if (
      !result.tenant_id ||
      !result.restaurant_id ||
      !result.terminal_id ||
      !result.staff_id ||
      !result.staff_name ||
      !result.role
    ) {
      throw new Error(AuthErrorCode.INTERNAL_AUTH_ERROR);
    }

    // 4. Generate 15-Minute Short-Lived Staff JWT
    const { token: staffJwt, expires_at } = generateStaffJwt({
      tenant_id: result.tenant_id,
      restaurant_id: result.restaurant_id,
      terminal_id: result.terminal_id,
      staff_id: result.staff_id,
      staff_name: result.staff_name,
      role: result.role as StaffRole,
      session_type: SessionType.Staff,
    });

    // 5. Return Typed Response DTO
    return {
      staff_jwt: staffJwt,
      expires_at,
      staff: {
        staff_id: result.staff_id,
        name: result.staff_name,
        role: result.role as StaffRole,
      },
      terminal: {
        terminal_id: result.terminal_id,
        terminal_name: 'Paired Terminal',
        terminal_type: 'FloorPOS',
      },
      session_type: SessionType.Staff,
    };
  }
}
