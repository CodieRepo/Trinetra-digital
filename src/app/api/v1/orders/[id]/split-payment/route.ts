import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const SplitPaymentSchema = z.object({
  payments: z.array(
    z.object({
      paymentMethod: z.enum(['CASH', 'CARD', 'UPI']),
      amountCents: z.number().int().min(1),
      transactionRef: z.string().optional()
    })
  ).min(1, 'At least one payment line is required')
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = SplitPaymentSchema.safeParse(body);
    
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

    const totalPaid = parsed.data.payments.reduce((acc, p) => acc + p.amountCents, 0);
    if (totalPaid < order.totalAmountCents) {
      return NextResponse.json(
        { success: false, error: `Insufficient payment amount. Total required: ${(order.totalAmountCents / 100).toFixed(2)}, Provided: ${(totalPaid / 100).toFixed(2)}` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async tx => {
      // 1. Create Payment records
      const createdPayments = await Promise.all(
        parsed.data.payments.map(p =>
          tx.payment.create({
            data: {
              orderId: params.id,
              paymentMethod: p.paymentMethod,
              amountCents: p.amountCents,
              transactionRef: p.transactionRef || `SPLIT-${p.paymentMethod}-${Date.now()}`
            }
          })
        )
      );

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

      return { payments: createdPayments, order: updatedOrder };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
