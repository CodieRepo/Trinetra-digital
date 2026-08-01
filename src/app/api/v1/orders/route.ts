import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { OrderStatus, OrderType } from '@prisma/client';

const CreateOrderSchema = z.object({
  branchId: z.string().uuid('Valid branch ID required'),
  tableId: z.string().uuid().optional(),
  orderType: z.nativeEnum(OrderType).default('DINE_IN'),
  items: z.array(
    z.object({
      menuItemId: z.string().uuid(),
      quantity: z.number().int().min(1).default(1),
      modifiersJson: z.any().optional()
    })
  ).min(1, 'At least 1 item is required to place an order')
});

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const tableId = req.nextUrl.searchParams.get('tableId');
    const status = req.nextUrl.searchParams.get('status');

    const orders = await prisma.order.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(tableId ? { tableId } : {}),
        ...(status ? { status: status as OrderStatus } : {})
      },
      include: {
        table: true,
        items: { include: { menuItem: true } },
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { branchId, tableId, orderType, items } = parsed.data;

    // Fetch menu item prices to calculate exact minor unit financial totals
    const menuItemIds = items.map(i => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } }
    });
    const menuItemMap = new Map(menuItems.map(m => [m.id, m]));

    let subtotalCents = 0;
    let taxCents = 0;

    const orderItemsData = items.map(item => {
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) throw new Error(`Menu item not found: ${item.menuItemId}`);

      const unitPriceCents = menuItem.basePriceCents;
      const totalPriceCents = unitPriceCents * item.quantity;
      subtotalCents += totalPriceCents;

      const itemTaxRate = Number(menuItem.taxRatePercent) || 8.0;
      const itemTax = Math.round((totalPriceCents * itemTaxRate) / 100);
      taxCents += itemTax;

      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPriceCents,
        totalPriceCents,
        modifiersJson: item.modifiersJson ?? null,
        status: 'PENDING'
      };
    });

    const totalAmountCents = subtotalCents + taxCents;
    const count = await prisma.order.count({ where: { branchId } });
    const orderNumber = `ORD-${1001 + count}`;

    // Execute in transaction: Create Order + Update Table Status to OCCUPIED
    const result = await prisma.$transaction(async tx => {
      const order = await tx.order.create({
        data: {
          branchId,
          tableId,
          orderNumber,
          orderType,
          status: 'PLACED',
          subtotalCents,
          taxCents,
          discountCents: 0,
          totalAmountCents,
          items: { createMany: { data: orderItemsData } }
        },
        include: { table: true, items: { include: { menuItem: true } } }
      });

      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: 'OCCUPIED' }
        });
      }

      return order;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
