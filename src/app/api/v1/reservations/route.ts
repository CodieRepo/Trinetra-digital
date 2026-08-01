import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const CreateReservationSchema = z.object({
  branchId: z.string().uuid('Valid branch ID required'),
  tableId: z.string().uuid().optional(),
  customerName: z.string().min(2, 'Customer name required'),
  customerPhone: z.string().min(5, 'Valid phone number required'),
  guestCount: z.number().int().min(1).default(2),
  reservationTime: z.string(),
  notes: z.string().optional()
});

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const status = req.nextUrl.searchParams.get('status');

    if (!branchId) {
      return NextResponse.json({ success: false, error: 'branchId query parameter is required' }, { status: 400 });
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        branchId,
        ...(status ? { status } : {})
      },
      orderBy: { reservationTime: 'asc' }
    });

    return NextResponse.json({ success: true, data: reservations });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const reservation = await prisma.$transaction(async tx => {
      const res = await tx.reservation.create({
        data: {
          branchId: parsed.data.branchId,
          tableId: parsed.data.tableId,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          guestCount: parsed.data.guestCount,
          reservationTime: new Date(parsed.data.reservationTime),
          status: 'CONFIRMED',
          notes: parsed.data.notes
        }
      });

      // Auto update table status to RESERVED if tableId assigned
      if (parsed.data.tableId) {
        await tx.table.update({
          where: { id: parsed.data.tableId },
          data: { status: 'RESERVED' }
        });
      }

      return res;
    });

    return NextResponse.json({
      success: true,
      data: reservation,
      smsWebhookPayload: {
        recipient: parsed.data.customerPhone,
        message: `Hi ${parsed.data.customerName}, your reservation at Trinetra Bistro for ${parsed.data.guestCount} guests at ${new Date(parsed.data.reservationTime).toLocaleTimeString()} is CONFIRMED!`
      }
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
