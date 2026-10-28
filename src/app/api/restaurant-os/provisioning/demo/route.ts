import { NextResponse } from 'next/server';
import { ProvisioningService } from '@/lib/services/provisioningService';
import { verifySuperAdminAccess } from '@/lib/auth/admin-guard';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authResult = await verifySuperAdminAccess(request);
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthorized access" },
        { status: authResult.statusCode || 401 }
      );
    }

    const result = await ProvisioningService.seedDemoRestaurant();

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    console.error('[Demo Seeder API Error]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Demo seeding failed' },
      { status: 500 }
    );
  }
}
