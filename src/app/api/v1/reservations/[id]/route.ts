import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const UpdateReservationSchema = z.object({
  status: z.enum(['CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW']).optional(),
  tableId: z.string().uuid().optional(),
  notes: z.string().optional()
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = UpdateReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.reservation.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 });
    }

    const newStatus = parsed.data.status || existing.status;
    const targetTableId = parsed.data.tableId !== undefined ? parsed.data.tableId : existing.tableId;

    const result = await prisma.$transaction(async tx => {
      const updated = await tx.reservation.update({
        where: { id: params.id },
        data: {
          status: newStatus,
          tableId: targetTableId,
          notes: parsed.data.notes !== undefined ? parsed.data.notes : existing.notes
        }
      });

      // Update table status based on reservation state transition
      if (targetTableId) {
        if (newStatus === 'SEATED') {
          await tx.table.update({ where: { id: targetTableId }, data: { status: 'OCCUPIED' } });
        } else if (newStatus === 'CANCELLED' || newStatus === 'NO_SHOW') {
          await tx.table.update({ where: { id: targetTableId }, data: { status: 'AVAILABLE' } });
        }
      }

      return updated;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.reservation.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: 'Reservation deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
