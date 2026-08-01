import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const CreateRecipeBomSchema = z.object({
  menuItemId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  quantityUsed: z.number().positive()
});

export async function GET(req: NextRequest) {
  try {
    const menuItemId = req.nextUrl.searchParams.get('menuItemId');
    const branchId = req.nextUrl.searchParams.get('branchId');

    const boms = await prisma.recipeBom.findMany({
      where: {
        ...(menuItemId ? { menuItemId } : {}),
        ...(branchId ? { menuItem: { category: { branchId } } } : {})
      },
      include: {
        menuItem: true,
        ingredient: true
      }
    });

    return NextResponse.json({ success: true, data: boms });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateRecipeBomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const bom = await prisma.recipeBom.upsert({
      where: {
        menuItemId_ingredientId: {
          menuItemId: parsed.data.menuItemId,
          ingredientId: parsed.data.ingredientId
        }
      },
      update: { quantityUsed: parsed.data.quantityUsed },
      create: {
        menuItemId: parsed.data.menuItemId,
        ingredientId: parsed.data.ingredientId,
        quantityUsed: parsed.data.quantityUsed
      },
      include: { menuItem: true, ingredient: true }
    });

    return NextResponse.json({ success: true, data: bom }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
