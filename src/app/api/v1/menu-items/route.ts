import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const CreateMenuItemSchema = z.object({
  categoryId: z.string().uuid('Valid category ID required'),
  name: z.string().min(2, 'Menu item name must be at least 2 characters'),
  description: z.string().optional(),
  basePriceCents: z.number().int().min(0, 'Price minor units (cents) must be non-negative'),
  isAvailable: z.boolean().default(true),
  taxRatePercent: z.number().default(8.0)
});

export async function GET(req: NextRequest) {
  try {
    const categoryId = req.nextUrl.searchParams.get('categoryId');
    const branchId = req.nextUrl.searchParams.get('branchId');

    const items = await prisma.menuItem.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(branchId ? { category: { branchId } } : {})
      },
      include: { category: true, modifierGroups: { include: { options: true } } },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json({ success: true, data: items });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateMenuItemSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const menuItem = await prisma.menuItem.create({
      data: parsed.data,
      include: { category: true }
    });

    return NextResponse.json({ success: true, data: menuItem }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
