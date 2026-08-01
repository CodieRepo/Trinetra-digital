import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const station = req.nextUrl.searchParams.get('station');

    const orders = await prisma.order.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        status: { in: ['PLACED', 'PREPARING', 'READY_TO_SERVE'] }
      },
      include: {
        table: true,
        items: { include: { menuItem: { include: { category: true } } } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Filter items by kitchen station routing if specified
    const result = orders.map(order => {
      let items = order.items;
      if (station && station !== 'ALL') {
        items = items.filter(i => {
          const catName = i.menuItem.category?.name.toUpperCase() || '';
          return catName.includes(station.toUpperCase());
        });
      }
      return { ...order, items };
    }).filter(order => order.items.length > 0);

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
