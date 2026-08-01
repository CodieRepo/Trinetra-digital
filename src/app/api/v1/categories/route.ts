import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const CreateCategorySchema = z.object({
  branchId: z.string().uuid('Valid branch ID required'),
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  sortOrder: z.number().int().default(0)
});

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const categories = await prisma.category.findMany({
      where: branchId ? { branchId } : undefined,
      include: { items: true },
      orderBy: { sortOrder: 'asc' }
    });
    return NextResponse.json({ success: true, data: categories });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateCategorySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: parsed.data,
      include: { items: true }
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
