import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { TableStatus } from '@prisma/client';

const UpdateTableSchema = z.object({
  label: z.string().min(1, 'Table label required').optional(),
  capacity: z.number().int().min(1).optional(),
  shape: z.enum(['SQUARE', 'ROUND', 'RECTANGLE']).optional(),
  positionX: z.number().int().optional(),
  positionY: z.number().int().optional(),
  status: z.nativeEnum(TableStatus).optional()
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = UpdateTableSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updated = await prisma.table.update({
      where: { id: params.id },
      data: parsed.data
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.table.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true, message: 'Table deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
