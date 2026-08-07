/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * File: src/services/auth/audit-log.service.ts
 * Description: Domain service handling append-only authentication audit logging and audit trail queries.
 */

import {
  IAuthRepository,
  LogAuthEventRepositoryInput,
  AuthAuditLogEntity,
} from '../../repositories/auth/auth.repository';

export class AuditLogService {
  constructor(private authRepo: IAuthRepository) {}

  /**
   * Record an authentication audit event
   */
  async logAuthEvent(input: LogAuthEventRepositoryInput): Promise<void> {
    await this.authRepo.logAuthEvent(input);
  }

  /**
   * Retrieve immutable authentication audit trail for branch
   */
  async getAuditLogs(
    tenantId: string,
    restaurantId: string,
    limit: number = 50
  ): Promise<AuthAuditLogEntity[]> {
    return this.authRepo.getAuditLogs(tenantId, restaurantId, limit);
  }
}
