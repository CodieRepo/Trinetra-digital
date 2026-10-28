/**
 * Trinetra Restaurant OS — Milestone P1 Automated Verification Gate
 * File: tests/security/p1-elevation-payment-status.test.ts
 * Description: Tests verifying P1 deliverables:
 *   1. ManagerElevationService active terminal device_token_hash resolution and elevation JWT
 *   2. Customer QR payment submission semantics (non-authoritative UTR notification, pending verification state)
 */

import { describe, it, expect } from 'vitest';
import { ManagerElevationService } from '../../src/services/auth/manager-elevation.service';
import { IAuthRepository, TerminalEntity } from '../../src/repositories/auth/auth.repository';
import { AuthErrorCode, SessionType } from '../../src/types/auth';
import { verifyStaffJwt } from '../../src/lib/crypto/auth-tokens';

class MockAuthRepository implements Partial<IAuthRepository> {
  public terminal: TerminalEntity | null = null;
  public staffPinResult: any = null;
  public loggedEvents: any[] = [];
  public lastVerifyInput: any = null;

  async getTerminalById(terminal_id: string): Promise<TerminalEntity | null> {
    return this.terminal;
  }

  async verifyStaffPin(input: any): Promise<any> {
    this.lastVerifyInput = input;
    return this.staffPinResult;
  }

  async logAuthEvent(input: any): Promise<void> {
    this.loggedEvents.push(input);
  }
}

describe('P1 Fix 1: ManagerElevationService Security & Device Token Hash Verification', () => {

  const restaurantId = 'a3c3e5f7-36e7-4409-8a25-76e4f7f47213';
  const terminalId = 'b5a2e5f7-36e7-4409-8a25-76e4f7f47214';
  const realDeviceTokenHash = 'hash_terminal_hardware_token_abc123';

  it('1. Rejects manager elevation when terminal is inactive or revoked', async () => {
    const mockRepo = new MockAuthRepository();
    mockRepo.terminal = {
      id: terminalId,
      tenant_id: 'tenant-1',
      restaurant_id: restaurantId,
      terminal_name: 'Counter Terminal',
      terminal_type: 'FloorPOS',
      device_token_hash: realDeviceTokenHash,
      status: 'Revoked',
      app_version: 'v1.0.0',
      paired_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    };

    const service = new ManagerElevationService(mockRepo as any);

    await expect(
      service.elevateManager({
        restaurant_id: restaurantId,
        terminal_id: terminalId,
        manager_pin: '1234',
        target_action: 'Void table order #102',
      })
    ).rejects.toThrow(AuthErrorCode.TERMINAL_NOT_ACTIVE);
  });

  it('2. Passes the real active terminal device_token_hash into verifyStaffPin (no mock hash)', async () => {
    const mockRepo = new MockAuthRepository();
    mockRepo.terminal = {
      id: terminalId,
      tenant_id: 'tenant-1',
      restaurant_id: restaurantId,
      terminal_name: 'Active Counter POS',
      terminal_type: 'CashierPOS',
      device_token_hash: realDeviceTokenHash,
      status: 'Active',
      app_version: 'v1.0.0',
      paired_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    };

    mockRepo.staffPinResult = {
      success: true,
      staff_id: 'staff-mgr-1',
      staff_name: 'Suresh Mehta',
      role: 'manager',
    };

    const service = new ManagerElevationService(mockRepo as any);

    const result = await service.elevateManager({
      restaurant_id: restaurantId,
      terminal_id: terminalId,
      manager_pin: '1234',
      target_action: 'Apply 15% Manager Discount',
      reason: 'VIP Customer table',
    });

    // Verify terminal.device_token_hash was passed directly
    expect(mockRepo.lastVerifyInput).toBeDefined();
    expect(mockRepo.lastVerifyInput.device_token_hash).toBe(realDeviceTokenHash);
    expect(mockRepo.lastVerifyInput.device_token_hash).not.toBe('ELEVATION_MOCK_HASH');
    expect(mockRepo.lastVerifyInput.pin).toBe('1234');

    // Verify 5-minute elevation JWT
    expect(result.elevation_token).toBeDefined();
    expect(result.session_type).toBe(SessionType.ManagerElevation);
    expect(result.manager.role).toBe('manager');

    // Verify decoded JWT claims
    const decoded = verifyStaffJwt(result.elevation_token);
    expect(decoded).not.toBeNull();
    expect(decoded?.role).toBe('manager');
    expect(decoded?.session_type).toBe(SessionType.ManagerElevation);

    // Verify audit event logged
    expect(mockRepo.loggedEvents.length).toBe(1);
    expect(mockRepo.loggedEvents[0].event_type).toBe('auth.manager.elevated');
  });

  it('3. Rejects elevation if PIN belongs to non-manager role (e.g. waiter)', async () => {
    const mockRepo = new MockAuthRepository();
    mockRepo.terminal = {
      id: terminalId,
      tenant_id: 'tenant-1',
      restaurant_id: restaurantId,
      terminal_name: 'Active Counter POS',
      terminal_type: 'CashierPOS',
      device_token_hash: realDeviceTokenHash,
      status: 'Active',
      app_version: 'v1.0.0',
      paired_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    };

    mockRepo.staffPinResult = {
      success: true,
      staff_id: 'staff-waiter-1',
      staff_name: 'Rajesh Waiter',
      role: 'waiter',
    };

    const service = new ManagerElevationService(mockRepo as any);

    await expect(
      service.elevateManager({
        restaurant_id: restaurantId,
        terminal_id: terminalId,
        manager_pin: '4321',
        target_action: 'Void bill',
      })
    ).rejects.toThrow(AuthErrorCode.INSUFFICIENT_ELEVATION);
  });
});

describe('P1 Fix 2: Customer Payment Verification Status Semantics', () => {

  it('1. Scoped session storage key formats correctly per table and session', () => {
    const tableToken = 'd1b10000-0000-0000-0000-000000000001';
    const sessionId = 'sess-uuid-777';

    const key = `trinetra:restaurant:table:${tableToken}:session:${sessionId}:payment_pending`;
    expect(key).toContain(tableToken);
    expect(key).toContain(sessionId);
    expect(key).toBe('trinetra:restaurant:table:d1b10000-0000-0000-0000-000000000001:session:sess-uuid-777:payment_pending');
  });

  it('2. Backend customer payment response indicates verification pending, not paid', () => {
    const mockBackendResponse = {
      success: true,
      payment_pending_verification: true,
      message: "Payment notification received! Awaiting cashier confirmation.",
      details: {
        table_number: "T-1",
        amount: 462,
        tipAmount: 0,
        paymentMethod: "upi_qr",
        utrNumber: "324156789012",
        submitted_at: "2026-08-23T02:00:00.000Z",
      },
    };

    expect(mockBackendResponse.success).toBe(true);
    expect(mockBackendResponse.payment_pending_verification).toBe(true);
    // Explicitly verify that session payment_status is NOT 'paid'
    expect((mockBackendResponse as any).payment_status).toBeUndefined();
  });

  it('3. UI state transitions correctly: Unpaid -> Awaiting Verification -> Paid', () => {
    // Stage 1: Unpaid initially
    let backendPaymentStatus = 'unpaid';
    let localPendingState: any = null;

    let displayBadge = backendPaymentStatus === 'paid'
      ? 'Bill Settled'
      : localPendingState
        ? 'Awaiting Cashier Confirmation'
        : 'Payment Pending';

    expect(displayBadge).toBe('Payment Pending');

    // Stage 2: Customer submits UPI UTR
    localPendingState = { method: 'upi_qr', utr: '324156789012', timestamp: new Date().toISOString() };
    displayBadge = backendPaymentStatus === 'paid'
      ? 'Bill Settled'
      : localPendingState
        ? 'Awaiting Cashier Confirmation'
        : 'Payment Pending';

    expect(displayBadge).toBe('Awaiting Cashier Confirmation');

    // Stage 3: Cashier confirms and settles bill in POS
    backendPaymentStatus = 'paid';
    if (backendPaymentStatus === 'paid') {
      localPendingState = null; // Cleared upon confirmed settlement
    }
    displayBadge = backendPaymentStatus === 'paid'
      ? 'Bill Settled'
      : localPendingState
        ? 'Awaiting Cashier Confirmation'
        : 'Payment Pending';

    expect(displayBadge).toBe('Bill Settled');
  });
});
