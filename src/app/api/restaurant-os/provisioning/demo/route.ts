/**
 * Trinetra Restaurant OS — Demo Seeder API Route
 * POST /api/restaurant-os/provisioning/demo
 * Programmatically seeds the demo restaurant via ProvisioningService.
 */

import { NextResponse } from 'next/server';
import { ProvisioningService } from '@/lib/services/provisioningService';

export async function POST() {
  try {
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
