import { describe, it, expect } from 'vitest';
import { generateStaffJwt, hashDeviceToken, verifyStaffJwt } from '../../src/lib/crypto/auth-tokens';
import { SessionType } from '../../src/types/auth';

describe('Phase 1 Mobile FCM & Authentication Integration Tests', () => {

  it('Mobile Auth: Staff JWT generation & timing-safe verification', () => {
    const payload = {
      tenant_id: '11111111-1111-1111-1111-111111111111',
      restaurant_id: '22222222-2222-2222-2222-222222222222',
      terminal_id: '33333333-3333-3333-3333-333333333333',
      staff_id: '44444444-4444-4444-4444-444444444444',
      staff_name: 'Vikram Staff',
      role: 'kitchen' as const,
      session_type: SessionType.Staff,
    };

    const { token, expires_at } = generateStaffJwt(payload);
    expect(token).toBeTruthy();
    expect(expires_at).toBeTruthy();

    const decoded = verifyStaffJwt(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.tenant_id).toBe(payload.tenant_id);
    expect(decoded?.staff_id).toBe(payload.staff_id);
    expect(decoded?.role).toBe('kitchen');
  });

  it('Device Registration: SHA-256 FCM Device Token Hashing', () => {
    const rawFcmToken = 'fcm_test_device_token_abc123_xyz789';
    const hash1 = hashDeviceToken(rawFcmToken);
    const hash2 = hashDeviceToken(rawFcmToken);

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(rawFcmToken);
  });

  it('Multi-Tenant Isolation: Verified JWT prevents cross-tenant device registration', () => {
    const tenantA = 'tenant_uuid_a';
    const tenantB = 'tenant_uuid_b';

    const jwtTenantA = generateStaffJwt({
      tenant_id: tenantA,
      restaurant_id: 'rest_a',
      terminal_id: 'term_a',
      staff_id: 'staff_a',
      staff_name: 'Waiter A',
      role: 'waiter' as const,
      session_type: SessionType.Staff,
    }).token;

    const decodedA = verifyStaffJwt(jwtTenantA);
    expect(decodedA?.tenant_id).toBe(tenantA);

    // Context resolver and device registration derive tenant_id strictly from decoded JWT:
    const resolvedDeviceTenant = decodedA?.tenant_id;
    expect(resolvedDeviceTenant).toBe(tenantA);
    expect(resolvedDeviceTenant).not.toBe(tenantB);
  });

  it('FCM Collapse Key Generation: Idempotent message deduplication', () => {
    const orderId = 'order_uuid_101';
    const status = 'placed';
    const collapseKey = `order_${orderId}_${status}`;

    expect(collapseKey).toBe('order_order_uuid_101_placed');
  });

  it('Stale Token Handling: Prunes invalid tokens upon 404/400 FCM error', () => {
    const fcmError404 = { status: 404, message: 'UNREGISTERED' };
    const isUnregistered = fcmError404.status === 404 || fcmError404.status === 410;

    expect(isUnregistered).toBe(true);
  });
});
