/**
 * Trinetra Restaurant OS — Setup Wizard Floors & Tables API
 * GET  /api/restaurant-os/provisioning/floors?restaurantId=...  -> Fetch floors and tables
 * POST /api/restaurant-os/provisioning/floors                   -> Create/update floor or table
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProvisioningService } from '@/lib/services/provisioningService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'restaurantId is required' }, { status: 400 });
    }

    const data = await ProvisioningService.getFloorsAndTables(restaurantId);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, restaurantId, floorId, tableId, name, tableNumber, capacity } = body;

    if (!restaurantId && action !== 'deleteFloor' && action !== 'deleteTable' && action !== 'updateTable') {
      return NextResponse.json({ success: false, error: 'restaurantId is required' }, { status: 400 });
    }

    if (action === 'createFloor') {
      const floor = await ProvisioningService.createFloor(restaurantId, name || 'Main Dining');
      return NextResponse.json({ success: true, data: floor }, { status: 201 });
    }

    if (action === 'deleteFloor') {
      await ProvisioningService.deleteFloor(floorId);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (action === 'createTable') {
      const table = await ProvisioningService.createTable(restaurantId, floorId, tableNumber, capacity || 4);
      return NextResponse.json({ success: true, data: table }, { status: 201 });
    }

    if (action === 'updateTable') {
      const table = await ProvisioningService.updateTable(tableId, tableNumber, capacity);
      return NextResponse.json({ success: true, data: table }, { status: 200 });
    }

    if (action === 'deleteTable') {
      await ProvisioningService.deleteTable(tableId);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
