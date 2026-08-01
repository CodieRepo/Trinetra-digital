import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const UpdateMenuItemSchema = z.object({
  name: z.string().min(2, 'Menu item name must be at least 2 characters').optional(),
  description: z.string().optional(),
  basePriceCents: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
  taxRatePercent: z.number().optional(),
  categoryId: z.string().uuid().optional()
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = UpdateMenuItemSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updated = await prisma.menuItem.update({
      where: { id: params.id },
      data: parsed.data,
      include: { category: true }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.menuItem.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
