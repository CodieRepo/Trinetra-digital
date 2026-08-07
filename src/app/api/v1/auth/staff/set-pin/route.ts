/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Route: POST /api/v1/auth/staff/set-pin
 * Description: Pure transport handler for setting or resetting a staff member's PIN.
 */

import { NextRequest } from 'next/server';
import { SupabaseAuthRepository } from '../../../../../../repositories/auth/supabase-auth.repository';
import { StaffManagementService } from '../../../../../../services/auth/staff-management.service';
import { resolveRequestContext } from '../../../../../../lib/api/context-resolver';
import { createSuccessResponse } from '../../../../../../lib/api/response';
import { createErrorResponse } from '../../../../../../lib/api/error-mapper';

const authRepository = new SupabaseAuthRepository();
const staffManagementService = new StaffManagementService(authRepository);

export async function POST(req: NextRequest) {
  const { traceId } = resolveRequestContext(req);

  try {
    const body = await req.json();
    const result = await staffManagementService.setStaffPin(body);
    return createSuccessResponse(result, traceId, 200);
  } catch (error) {
    return createErrorResponse(error, traceId);
  }
}
