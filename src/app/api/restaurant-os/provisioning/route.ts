/**
 * Trinetra Restaurant OS — Provisioning API Route
 * POST /api/restaurant-os/provisioning
 * Thin route handler: validates request body, invokes ProvisioningService, returns typed JSON.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProvisioningService } from '@/lib/services/provisioningService';
import { ProvisionRestaurantInput } from '@/types/restaurant-os/provisioning';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProvisionRestaurantInput;

    if (!body.restaurantName || typeof body.restaurantName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Restaurant name is required' },
        { status: 400 }
      );
    }

    if (!body.ownerEmail || typeof body.ownerEmail !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Owner email is required' },
        { status: 400 }
      );
    }

    if (!body.ownerName || typeof body.ownerName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Owner name is required' },
        { status: 400 }
      );
    }

    const result = await ProvisioningService.provisionRestaurant(body);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    console.error('[Provisioning API Error]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Provisioning failed' },
      { status: 500 }
    );
  }
}
