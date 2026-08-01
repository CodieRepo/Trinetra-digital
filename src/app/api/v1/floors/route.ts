import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const CreateFloorSchema = z.object({
  branchId: z.string().uuid('Valid branch ID required'),
  name: z.string().min(2, 'Floor name must be at least 2 characters')
});

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const floors = await prisma.floor.findMany({
      where: branchId ? { branchId } : undefined,
      include: { tables: { orderBy: { label: 'asc' } } },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json({ success: true, data: floors });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateFloorSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const floor = await prisma.floor.create({
      data: parsed.data,
      include: { tables: true }
    });

    return NextResponse.json({ success: true, data: floor }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
