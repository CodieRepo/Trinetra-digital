import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { TableStatus } from '@prisma/client';

const CreateTableSchema = z.object({
  floorId: z.string().uuid('Valid floor ID required'),
  label: z.string().min(1, 'Table label required'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').default(4),
  shape: z.enum(['SQUARE', 'ROUND', 'RECTANGLE']).default('SQUARE'),
  positionX: z.number().int().default(0),
  positionY: z.number().int().default(0),
  status: z.nativeEnum(TableStatus).default('AVAILABLE')
});

export async function GET(req: NextRequest) {
  try {
    const floorId = req.nextUrl.searchParams.get('floorId');
    const tables = await prisma.table.findMany({
      where: floorId ? { floorId } : undefined,
      orderBy: { label: 'asc' }
    });
    return NextResponse.json({ success: true, data: tables });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateTableSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const table = await prisma.table.create({
      data: parsed.data
    });

    return NextResponse.json({ success: true, data: table }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
