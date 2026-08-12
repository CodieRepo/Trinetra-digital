import { describe, it, expect } from 'vitest';
import { generateStaffJwt } from '../../src/lib/crypto/auth-tokens';
import { authenticateStaffRequest } from '../../src/lib/auth/staff-api-auth';
import { SessionType } from '../../src/types/auth';
import { canStaffTransitionOrder } from '../../trinetra-business-os/packages/verticals/restaurant-os/types';

describe('Milestone 2.1 — Staff API & JWT Alignment Security Tests', () => {

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const restaurantA = '22222222-2222-2222-2222-222222222222';
  const tenantB = '99999999-9999-9999-9999-999999999999';
  const restaurantB = '88888888-8888-8888-8888-888888888888';

  it('1. Valid Staff JWT: Authenticates staff request cleanly', async () => {
    const jwt = generateStaffJwt({
      tenant_id: tenantA,
      restaurant_id: restaurantA,
      terminal_id: 'term_1',
      staff_id: 'staff_kitchen_1',
      staff_name: 'Chef Gordon',
      role: 'kitchen' as any,
      session_type: SessionType.Staff,
    }).token;

    const req = new Request('http://localhost:3000/api/staff/orders', {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    const { context, errorResponse } = await authenticateStaffRequest(req);
    expect(errorResponse).toBeUndefined();
    expect(context).not.toBeNull();
    expect(context?.tenant_id).toBe(tenantA);
    expect(context?.restaurant_id).toBe(restaurantA);
    expect(context?.role).toBe('kitchen');
  });

  it('2. Missing Authorization Token: Rejects unauthenticated requests with 401', async () => {
    const invalidReq = new Request('http://localhost:3000/api/staff/orders');
    const { context, errorResponse } = await authenticateStaffRequest(invalidReq);

    expect(context).toBeNull();
    expect(errorResponse).toBeDefined();
    expect(errorResponse?.status).toBe(401);
  });

  it('3. Cross-Tenant Spoofing: Rejects request if client specifies restaurant_id from another tenant/branch', async () => {
    const jwtStaffA = generateStaffJwt({
      tenant_id: tenantA,
      restaurant_id: restaurantA,
      terminal_id: 'term_1',
      staff_id: 'staff_1',
      staff_name: 'Waiter A',
      role: 'waiter' as any,
      session_type: SessionType.Staff,
    }).token;

    // Client attempts to pass restaurant_id belonging to Restaurant B in query parameter
    const spoofedReq = new Request(`http://localhost:3000/api/staff/orders?restaurant_id=${restaurantB}`, {
      headers: { Authorization: `Bearer ${jwtStaffA}` },
    });

    const { context, errorResponse } = await authenticateStaffRequest(spoofedReq, null, restaurantB);
    expect(context).toBeNull();
    expect(errorResponse).toBeDefined();
    expect(errorResponse?.status).toBe(403);
    expect(errorResponse?.message).toContain('Forbidden');
  });

  it('4. Role Transition Authorization: Enforces state machine transition rules', () => {
    // Kitchen staff transition checks
    expect(canStaffTransitionOrder('kitchen', 'placed', 'accepted')).toBe(true);
    expect(canStaffTransitionOrder('kitchen', 'accepted', 'preparing')).toBe(true);
    expect(canStaffTransitionOrder('kitchen', 'preparing', 'ready')).toBe(true);
    expect(canStaffTransitionOrder('kitchen', 'ready', 'served')).toBe(false); // Kitchen cannot mark served!

    // Waiter staff transition checks
    expect(canStaffTransitionOrder('waiter', 'ready', 'served')).toBe(true);
    expect(canStaffTransitionOrder('waiter', 'placed', 'accepted')).toBe(false); // Waiter cannot accept kitchen orders!
  });
});
