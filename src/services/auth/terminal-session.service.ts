/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/services/auth/terminal-session.service.ts
 * Description: Domain service handling terminal session context and heartbeat monitoring.
 */

import { TerminalContext, TerminalStatus, TerminalType, AuthErrorCode } from '../../types/auth';
import { IAuthRepository } from '../../repositories/auth/auth.repository';

export class TerminalSessionService {
  constructor(private authRepo: IAuthRepository) {}

  /**
   * Fetch active hardware terminal context by terminal ID
   */
  async getTerminalContext(terminalId: string): Promise<TerminalContext> {
    const terminal = await this.authRepo.getTerminalById(terminalId);

    if (!terminal) {
      throw new Error(AuthErrorCode.TERMINAL_NOT_FOUND);
    }

    if (terminal.status !== 'Active') {
      throw new Error(
        terminal.status === 'Revoked'
          ? AuthErrorCode.TERMINAL_REVOKED
          : AuthErrorCode.TERMINAL_NOT_ACTIVE
      );
    }

    return {
      terminal_id: terminal.id,
      tenant_id: terminal.tenant_id,
      restaurant_id: terminal.restaurant_id,
      terminal_name: terminal.terminal_name,
      terminal_type: terminal.terminal_type as TerminalType,
      device_fingerprint: null,
      status: terminal.status as TerminalStatus,
      app_version: terminal.app_version,
      paired_at: terminal.paired_at,
      last_seen_at: terminal.last_seen_at,
    };
  }
}
