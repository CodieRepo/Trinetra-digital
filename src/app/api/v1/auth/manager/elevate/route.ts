/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Route: POST /api/v1/auth/manager/elevate
 * Description: Pure transport handler for temporary Manager PIN privilege elevation.
 */

import { NextRequest } from 'next/server';
import { SupabaseAuthRepository } from '../../../../../../repositories/auth/supabase-auth.repository';
import { ManagerElevationService } from '../../../../../../services/auth/manager-elevation.service';
import { resolveRequestContext } from '../../../../../../lib/api/context-resolver';
import { createSuccessResponse } from '../../../../../../lib/api/response';
import { createErrorResponse } from '../../../../../../lib/api/error-mapper';

const authRepository = new SupabaseAuthRepository();
const managerElevationService = new ManagerElevationService(authRepository);

export async function POST(req: NextRequest) {
  const { traceId } = resolveRequestContext(req);

  try {
    const body = await req.json();
    const result = await managerElevationService.elevateManager(body);
    return createSuccessResponse(result, traceId, 200);
  } catch (error) {
    return createErrorResponse(error, traceId);
  }
}
