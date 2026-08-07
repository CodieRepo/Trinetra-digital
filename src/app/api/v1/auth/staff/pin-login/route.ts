/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Route: POST /api/v1/auth/staff/pin-login
 * Description: Pure transport handler for staff PIN authentication on paired terminals.
 */

import { NextRequest } from 'next/server';
import { SupabaseAuthRepository } from '../../../../../../repositories/auth/supabase-auth.repository';
import { StaffAuthenticationService } from '../../../../../../services/auth/staff-authentication.service';
import { resolveRequestContext } from '../../../../../../lib/api/context-resolver';
import { createSuccessResponse } from '../../../../../../lib/api/response';
import { createErrorResponse } from '../../../../../../lib/api/error-mapper';

const authRepository = new SupabaseAuthRepository();
const staffAuthService = new StaffAuthenticationService(authRepository);

export async function POST(req: NextRequest) {
  const { traceId, ipAddress } = resolveRequestContext(req);

  try {
    const body = await req.json();
    const result = await staffAuthService.loginWithPin({
      ...body,
      ip_address: ipAddress,
    });
    return createSuccessResponse(result, traceId, 200);
  } catch (error) {
    return createErrorResponse(error, traceId);
  }
}
