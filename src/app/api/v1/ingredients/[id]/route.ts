import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const UpdateIngredientSchema = z.object({
  name: z.string().min(2).optional(),
  unitOfMeasure: z.string().optional(),
  currentStock: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).optional()
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = UpdateIngredientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updated = await prisma.ingredient.update({
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
    await prisma.ingredient.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: 'Ingredient deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
