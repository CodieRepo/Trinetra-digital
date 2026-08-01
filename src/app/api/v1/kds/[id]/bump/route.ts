import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

const BumpSchema = z.object({
  targetStatus: z.nativeEnum(OrderStatus).default('READY_TO_SERVE')
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = BumpSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: { status: parsed.data.targetStatus },
      include: { table: true, items: { include: { menuItem: true } } }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
