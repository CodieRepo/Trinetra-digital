import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const CreateIngredientSchema = z.object({
  branchId: z.string().uuid('Valid branch ID required'),
  name: z.string().min(2, 'Name is required'),
  unitOfMeasure: z.string().min(1, 'Unit of measure required (e.g. KG, G, L, ML, PCS)'),
  currentStock: z.number().min(0).default(0),
  reorderPoint: z.number().min(0).default(10)
});

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    if (!branchId) {
      return NextResponse.json({ success: false, error: 'branchId query parameter is required' }, { status: 400 });
    }

    const ingredients = await prisma.ingredient.findMany({
      where: { branchId },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, data: ingredients });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateIngredientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        branchId: parsed.data.branchId,
        name: parsed.data.name,
        unitOfMeasure: parsed.data.unitOfMeasure,
        currentStock: parsed.data.currentStock,
        reorderPoint: parsed.data.reorderPoint
      }
    });

    return NextResponse.json({ success: true, data: ingredient }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
