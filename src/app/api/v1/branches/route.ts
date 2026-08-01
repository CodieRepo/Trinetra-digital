import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const CreateBranchSchema = z.object({
  restaurantId: z.string().uuid('Valid restaurant ID required'),
  name: z.string().min(2, 'Branch name must be at least 2 characters'),
  address: z.string().min(3, 'Address is required'),
  phone: z.string().optional(),
  timezone: z.string().default('UTC'),
  currency: z.string().default('USD')
});

export async function GET(req: NextRequest) {
  try {
    const restId = req.nextUrl.searchParams.get('restaurantId');
    const branches = await prisma.branch.findMany({
      where: restId ? { restaurantId: restId } : undefined,
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: branches });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateBranchSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.create({
      data: parsed.data
    });

    return NextResponse.json({ success: true, data: branch }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
