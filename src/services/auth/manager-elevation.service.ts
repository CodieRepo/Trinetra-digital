/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/services/auth/manager-elevation.service.ts
 * Description: Domain service handling temporary manager PIN elevation for restricted actions.
 */

import {
  ManagerElevationInput,
  ManagerElevationResponseDTO,
  managerElevationSchema,
  AuthErrorCode,
  SessionType,
  StaffRole,
  AuthContext,
} from '../../types/auth';
import { IAuthRepository } from '../../repositories/auth/auth.repository';
import { generateStaffJwt } from '../../lib/crypto/auth-tokens';

export class ManagerElevationService {
  constructor(private authRepo: IAuthRepository) {}

  /**
   * Elevate privileges using Manager PIN for restricted actions
   */
  async elevateManager(
    rawInput: ManagerElevationInput,
    actorContext?: AuthContext
  ): Promise<ManagerElevationResponseDTO> {
    // 1. Validate Input Schema
    const validatedInput = managerElevationSchema.parse(rawInput);

    // 2. Fetch Terminal Context to ensure device token or active terminal
    const terminal = await this.authRepo.getTerminalById(validatedInput.terminal_id);
    if (!terminal || terminal.status !== 'Active') {
      throw new Error(AuthErrorCode.TERMINAL_NOT_ACTIVE);
    }

    // 3. Verify Manager PIN via Repository RPC (uses mock device token hash for PIN lookup)
    const result = await this.authRepo.verifyStaffPin({
      restaurant_id: validatedInput.restaurant_id,
      device_token_hash: 'ELEVATION_MOCK_HASH', // Uses terminal lookup or active branch staff check
      pin: validatedInput.manager_pin,
    });

    if (!result.success || !result.staff_id || !result.staff_name || !result.role) {
      throw new Error(AuthErrorCode.INVALID_STAFF_PIN);
    }

    // 4. Verify Role is Manager or Owner
    if (!['owner', 'manager'].includes(result.role)) {
      throw new Error(AuthErrorCode.INSUFFICIENT_ELEVATION);
    }

    // 5. Generate Short-Lived (5-Minute) Elevation Token
    const { token: elevationToken, expires_at } = generateStaffJwt(
      {
        tenant_id: terminal.tenant_id,
        restaurant_id: validatedInput.restaurant_id,
        terminal_id: validatedInput.terminal_id,
        staff_id: result.staff_id,
        staff_name: result.staff_name,
        role: result.role as StaffRole,
        session_type: SessionType.ManagerElevation,
      },
      300 // 5 minutes TTL
    );

    // 6. Log Elevation Audit Event
    await this.authRepo.logAuthEvent({
      tenant_id: terminal.tenant_id,
      restaurant_id: validatedInput.restaurant_id,
      terminal_id: validatedInput.terminal_id,
      actor_id: actorContext?.staff_id || result.staff_id,
      actor_role: actorContext?.role || result.role,
      event_type: 'auth.manager.elevated',
      metadata: {
        target_action: validatedInput.target_action,
        reason: validatedInput.reason || 'Manager PIN elevation requested',
      },
    });

    // 7. Return Typed Response DTO
    return {
      elevation_token: elevationToken,
      expires_at,
      manager: {
        staff_id: result.staff_id,
        name: result.staff_name,
        role: result.role as 'owner' | 'manager',
      },
      target_action: validatedInput.target_action,
      session_type: SessionType.ManagerElevation,
    };
  }
}
