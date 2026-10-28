import { NextRequest, NextResponse } from 'next/server';
import { ProvisioningService } from '@/lib/services/provisioningService';
import { ProvisionRestaurantInput } from '@/types/restaurant-os/provisioning';
import { verifySuperAdminAccess } from '@/lib/auth/admin-guard';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(req);
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized access" },
        { status: authResult.statusCode || 401 }
      );
    }
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
