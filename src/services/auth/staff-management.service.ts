/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/services/auth/staff-management.service.ts
 * Description: Domain service handling staff PIN assignment, updates, and profile lookup.
 */

import {
  SetStaffPinInput,
  SetStaffPinResponseDTO,
  setStaffPinSchema,
  AuthErrorCode,
  AuthContext,
} from '../../types/auth';
import { IAuthRepository } from '../../repositories/auth/auth.repository';

export class StaffManagementService {
  constructor(private authRepo: IAuthRepository) {}

  /**
   * Set or update a staff member's security PIN
   */
  async setStaffPin(
    rawInput: SetStaffPinInput,
    actorContext?: AuthContext
  ): Promise<SetStaffPinResponseDTO> {
    // 1. Validate Input Schema
    const validatedInput = setStaffPinSchema.parse(rawInput);

    // 2. Verify Staff Member Exists
    const staff = await this.authRepo.getStaffById(
      validatedInput.staff_id,
      validatedInput.restaurant_id
    );

    if (!staff) {
      throw new Error(AuthErrorCode.STAFF_NOT_FOUND);
    }

    if (!staff.is_active) {
      throw new Error(AuthErrorCode.STAFF_INACTIVE);
    }

    // 3. Set Staff PIN via Repository
    const result = await this.authRepo.setStaffPin({
      staff_id: validatedInput.staff_id,
      restaurant_id: validatedInput.restaurant_id,
      pin_hash: validatedInput.pin,
    });

    if (!result || !result.success) {
      throw new Error(AuthErrorCode.INTERNAL_AUTH_ERROR);
    }

    // 4. Log Audit Event
    await this.authRepo.logAuthEvent({
      tenant_id: staff.tenant_id,
      restaurant_id: validatedInput.restaurant_id,
      terminal_id: actorContext?.terminal_id,
      actor_id: actorContext?.staff_id,
      actor_role: actorContext?.role,
      event_type: 'auth.staff.pin_updated',
      metadata: { target_staff_id: validatedInput.staff_id },
    });

    // 5. Return Typed Response DTO
    return {
      staff_id: validatedInput.staff_id,
      updated_at: new Date().toISOString(),
    };
  }
}
