/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/services/auth/terminal-pairing.service.ts
 * Description: Domain service handling hardware device pairing and revocation.
 */

import {
  PairTerminalInput,
  PairTerminalResponseDTO,
  RevokeTerminalInput,
  RevokeTerminalResponseDTO,
  pairTerminalSchema,
  revokeTerminalSchema,
  AuthErrorCode,
} from '../../types/auth';
import { IAuthRepository } from '../../repositories/auth/auth.repository';
import { generateSecureToken, hashDeviceToken } from '../../lib/crypto/auth-tokens';

export class TerminalPairingService {
  constructor(private authRepo: IAuthRepository) {}

  /**
   * Pair a new hardware terminal device
   */
  async pairTerminal(
    rawInput: PairTerminalInput,
    ownerId?: string
  ): Promise<PairTerminalResponseDTO> {
    // 1. Validate Input Schema
    const validatedInput = pairTerminalSchema.parse(rawInput);

    // 2. Generate 256-Bit Device Token and SHA-256 Hash
    const plaintextDeviceToken = generateSecureToken();
    const deviceTokenHash = hashDeviceToken(plaintextDeviceToken);

    // 3. Register Terminal via Repository
    const result = await this.authRepo.pairTerminalDevice({
      tenant_id: validatedInput.tenant_id,
      restaurant_id: validatedInput.restaurant_id,
      terminal_name: validatedInput.terminal_name,
      terminal_type: validatedInput.terminal_type,
      device_token_hash: deviceTokenHash,
      device_fingerprint: validatedInput.device_fingerprint,
      owner_id: ownerId,
    });

    if (!result || !result.success) {
      throw new Error(AuthErrorCode.DEVICE_ALREADY_PAIRED);
    }

    // 4. Return Typed Response DTO
    return {
      terminal_id: result.terminal_id,
      terminal_name: result.terminal_name,
      terminal_type: result.terminal_type as any,
      device_token: plaintextDeviceToken, // Returned ONCE upon initial pairing
      status: 'Active',
      paired_at: new Date().toISOString(),
    };
  }

  /**
   * Revoke an active hardware terminal device
   */
  async revokeTerminal(
    rawInput: RevokeTerminalInput,
    revokedBy?: string
  ): Promise<RevokeTerminalResponseDTO> {
    // 1. Validate Input Schema
    const validatedInput = revokeTerminalSchema.parse(rawInput);

    // 2. Revoke Terminal via Repository
    const result = await this.authRepo.revokeTerminalDevice(
      validatedInput.terminal_id,
      revokedBy
    );

    if (!result || !result.success) {
      throw new Error(AuthErrorCode.TERMINAL_NOT_FOUND);
    }

    // 3. Return Typed Response DTO
    return {
      terminal_id: validatedInput.terminal_id,
      status: 'Revoked',
      revoked_at: new Date().toISOString(),
    };
  }
}
