import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const CreateRestaurantSchema = z.object({
  organizationId: z.string().uuid('Valid organization ID required'),
  name: z.string().min(2, 'Restaurant name must be at least 2 characters'),
  cuisineType: z.string().optional()
});

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('organizationId');
    const restaurants = await prisma.restaurant.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: { branches: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: restaurants });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateRestaurantSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.create({
      data: parsed.data
    });

    return NextResponse.json({ success: true, data: restaurant }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
