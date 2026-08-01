import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  legalName: z.string().optional(),
  taxId: z.string().optional()
});

export async function GET() {
  try {
    const orgs = await prisma.organization.findMany({
      where: { deletedAt: null },
      include: { restaurants: { include: { branches: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: orgs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateOrganizationSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const org = await prisma.organization.create({
      data: parsed.data
    });

    return NextResponse.json({ success: true, data: org }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
