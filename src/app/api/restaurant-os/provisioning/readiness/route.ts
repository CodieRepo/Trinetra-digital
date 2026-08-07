/**
 * Trinetra Restaurant OS — Readiness Check API Route
 * GET /api/restaurant-os/provisioning/readiness?restaurantId=...
 * Executes RPC validate_restaurant_readiness_rpc via ProvisioningService.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProvisioningService } from '@/lib/services/provisioningService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId query parameter is required' },
        { status: 400 }
      );
    }

    const readiness = await ProvisioningService.checkReadiness(restaurantId);

    return NextResponse.json({ success: true, data: readiness }, { status: 200 });
  } catch (error: any) {
    console.error('[Readiness API Error]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check readiness' },
      { status: 500 }
    );
  }
}
