import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

const UpdateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  discountCents: z.number().int().min(0).optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        table: true,
        items: { include: { menuItem: true } },
        payments: true
      }
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = UpdateOrderSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.order.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    let discountCents = existing.discountCents;
    if (parsed.data.discountCents !== undefined) {
      discountCents = parsed.data.discountCents;
    }

    const totalAmountCents = Math.max(0, existing.subtotalCents + existing.taxCents - discountCents);
    const newStatus = parsed.data.status || existing.status;

    const result = await prisma.$transaction(async tx => {
      const updated = await tx.order.update({
        where: { id: params.id },
        data: {
          status: newStatus,
          discountCents,
          totalAmountCents
        },
        include: { table: true, items: { include: { menuItem: true } }, payments: true }
      });

      // Handle table status transitions upon order close or cancellation
      if ((newStatus === 'CLOSED' || newStatus === 'CANCELLED') && existing.tableId) {
        await tx.table.update({
          where: { id: existing.tableId },
          data: { status: 'AVAILABLE' }
        });
      } else if (newStatus === 'BILLING' && existing.tableId) {
        await tx.table.update({
          where: { id: existing.tableId },
          data: { status: 'BILLING' }
        });
      }

      return updated;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
