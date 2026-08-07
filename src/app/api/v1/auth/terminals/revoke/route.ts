/**
 * Trinetra Restaurant OS — Milestone 2 Authentication & Terminal Security
 * Route: POST /api/v1/auth/terminals/revoke
 * Description: Pure transport handler for revoking hardware terminal access.
 */

import { NextRequest } from 'next/server';
import { SupabaseAuthRepository } from '../../../../../../repositories/auth/supabase-auth.repository';
import { TerminalPairingService } from '../../../../../../services/auth/terminal-pairing.service';
import { resolveRequestContext } from '../../../../../../lib/api/context-resolver';
import { createSuccessResponse } from '../../../../../../lib/api/response';
import { createErrorResponse } from '../../../../../../lib/api/error-mapper';

const authRepository = new SupabaseAuthRepository();
const terminalPairingService = new TerminalPairingService(authRepository);

export async function POST(req: NextRequest) {
  const { traceId } = resolveRequestContext(req);

  try {
    const body = await req.json();
    const result = await terminalPairingService.revokeTerminal(body);
    return createSuccessResponse(result, traceId, 200);
  } catch (error) {
    return createErrorResponse(error, traceId);
  }
}
