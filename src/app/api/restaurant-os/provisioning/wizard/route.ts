/**
 * Trinetra Restaurant OS — Setup Wizard API Route
 * GET   /api/restaurant-os/provisioning/wizard?restaurantId=... -> Fetch profile & wizard state
 * PATCH /api/restaurant-os/provisioning/wizard                 -> Update wizard step metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProvisioningService } from '@/lib/services/provisioningService';
import { WizardStepData } from '@/types/restaurant-os/provisioning';

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

    const profile = await ProvisioningService.getRestaurantProfile(restaurantId);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: `Restaurant profile for ${restaurantId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: profile }, { status: 200 });
  } catch (error: any) {
    console.error('[Wizard GET API Error]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch wizard profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantId, stepData } = body as {
      restaurantId: string;
      stepData: WizardStepData;
    };

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required' },
        { status: 400 }
      );
    }

    if (!stepData || typeof stepData.step !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Valid stepData with step number is required' },
        { status: 400 }
      );
    }

    const updatedProfile = await ProvisioningService.updateWizardStep(restaurantId, stepData);

    return NextResponse.json({ success: true, data: updatedProfile }, { status: 200 });
  } catch (error: any) {
    console.error('[Wizard PATCH API Error]:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update wizard step' },
      { status: 500 }
    );
  }
}
