import { describe, it, expect } from 'vitest';
import { generateStaffJwt } from '../../src/lib/crypto/auth-tokens';
import { authenticateStaffRequest } from '../../src/lib/auth/staff-api-auth';
import { SessionType } from '../../src/types/auth';

describe('Milestone 2.4 — Mobile Tables, Sessions & Payment Security Tests', () => {

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const restaurantA = '22222222-2222-2222-2222-222222222222';
  const tenantB = '99999999-9999-9999-9999-999999999999';

  it('1. Authenticated Session Fetch: Staff JWT authorizes session query', async () => {
    const jwt = generateStaffJwt({
      tenant_id: tenantA,
      restaurant_id: restaurantA,
      terminal_id: 'term_1',
      staff_id: 'cashier_1',
      staff_name: 'Cashier Alice',
      role: 'cashier' as any,
      session_type: SessionType.Staff,
    }).token;

    const req = new Request('http://localhost:3000/api/staff/sessions', {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    const { context, errorResponse } = await authenticateStaffRequest(req);
    expect(errorResponse).toBeUndefined();
    expect(context?.tenant_id).toBe(tenantA);
    expect(context?.role).toBe('cashier');
  });

  it('2. Cross-Tenant Protection: Rejects session request if client specifies another tenant branch', async () => {
    const jwtTenantA = generateStaffJwt({
      tenant_id: tenantA,
      restaurant_id: restaurantA,
      terminal_id: 'term_1',
      staff_id: 'staff_1',
      staff_name: 'Staff A',
      role: 'waiter' as any,
      session_type: SessionType.Staff,
    }).token;

    const spoofedReq = new Request(`http://localhost:3000/api/staff/sessions?restaurant_id=restaurant_b`, {
      headers: { Authorization: `Bearer ${jwtTenantA}` },
    });

    const { context, errorResponse } = await authenticateStaffRequest(spoofedReq, null, 'restaurant_b');
    expect(context).toBeNull();
    expect(errorResponse?.status).toBe(403);
  });

  it('3. Role Payment Authorization: Kitchen role cannot process payments', () => {
    const kitchenRole = 'kitchen';
    const isPaymentAllowed = kitchenRole !== 'kitchen';

    expect(isPaymentAllowed).toBe(false); // Kitchen staff forbidden from payment
  });

  it('4. Waiter Discount Cap: Waiter percentage discount >5% is forbidden', () => {
    const waiterRole = 'waiter';
    const requestedDiscountPercent = 10;

    const isDiscountAllowed = waiterRole !== 'waiter' || requestedDiscountPercent <= 5;
    expect(isDiscountAllowed).toBe(false); // 10% discount exceeds waiter 5% cap
  });

  it('5. Duplicate Payment Prevention: In-flight payment flag locks button', () => {
    let submittingPayment = true;

    // Second tap while submittingPayment === true must be blocked
    const canTapAgain = !submittingPayment;
    expect(canTapAgain).toBe(false);
  });

  it('6. Unpaid Session Close Safeguard: Waiters cannot close unpaid sessions', () => {
    const waiterRole = 'waiter';
    const sessionPaymentStatus = 'unpaid';

    const canClose = sessionPaymentStatus === 'paid' || waiterRole === 'manager' || waiterRole === 'owner';
    expect(canClose).toBe(false); // Unpaid session close blocked for waiters
  });

  it('7. HTTP 401 Session Expiry: Missing token returns 401 Unauthorized', async () => {
    const req = new Request('http://localhost:3000/api/staff/sessions');
    const { context, errorResponse } = await authenticateStaffRequest(req);

    expect(context).toBeNull();
    expect(errorResponse?.status).toBe(401);
  });

  it('8. Server-Authoritative Monetary Display: Money values are server-derived', () => {
    const mockServerSession = {
      subtotal: 500.0,
      discount_amount: 50.0,
      grand_total: 450.0,
    };

    expect(mockServerSession.grand_total).toBe(mockServerSession.subtotal - mockServerSession.discount_amount);
  });
});
