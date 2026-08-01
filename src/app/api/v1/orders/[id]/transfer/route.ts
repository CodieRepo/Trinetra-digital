import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const TransferSchema = z.object({
  targetTableId: z.string().uuid('Valid target table ID required')
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = TransferSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const sourceTableId = order.tableId;
    const targetTableId = parsed.data.targetTableId;

    const result = await prisma.$transaction(async tx => {
      // 1. Update Order tableId
      const updatedOrder = await tx.order.update({
        where: { id: params.id },
        data: { tableId: targetTableId },
        include: { table: true, items: true }
      });

      // 2. Set source table status to AVAILABLE
      if (sourceTableId) {
        await tx.table.update({
          where: { id: sourceTableId },
          data: { status: 'AVAILABLE' }
        });
      }

      // 3. Set target table status to OCCUPIED
      await tx.table.update({
        where: { id: targetTableId },
        data: { status: 'OCCUPIED' }
      });

      return updatedOrder;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
