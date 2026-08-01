import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const PaymentSchema = z.object({
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI']).default('CASH'),
  amountCents: z.number().int().min(1),
  transactionRef: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = PaymentSchema.safeParse(body);
    
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

    const result = await prisma.$transaction(async tx => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          orderId: params.id,
          paymentMethod: parsed.data.paymentMethod,
          amountCents: parsed.data.amountCents,
          transactionRef: parsed.data.transactionRef || `TXN-${Date.now()}`
        }
      });

      // 2. Transition Order Status to CLOSED
      const updatedOrder = await tx.order.update({
        where: { id: params.id },
        data: { status: 'CLOSED' },
        include: { table: true, items: { include: { menuItem: true } }, payments: true }
      });

      // 3. Clear Table Status to AVAILABLE
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' }
        });
      }

      return { payment, order: updatedOrder };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
