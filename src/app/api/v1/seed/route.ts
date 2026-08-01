import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    // 1. Create Organization
    let org = await prisma.organization.findFirst({ where: { name: 'Trinetra Hospitality Group' } });
    if (!org) {
      org = await prisma.organization.create({
        data: { name: 'Trinetra Hospitality Group', legalName: 'Trinetra Hospitality LLC', taxId: 'TAX-998877' }
      });
    }

    // 2. Create Restaurant
    let rest = await prisma.restaurant.findFirst({ where: { organizationId: org.id } });
    if (!rest) {
      rest = await prisma.restaurant.create({
        data: { organizationId: org.id, name: 'Downtown Bistro Concept', cuisineType: 'Modern Italian & Fusion' }
      });
    }

    // 3. Create Branch
    let branch = await prisma.branch.findFirst({ where: { restaurantId: rest.id } });
    if (!branch) {
      branch = await prisma.branch.create({
        data: { restaurantId: rest.id, name: 'Downtown Main Branch', address: '450 Park Avenue, NY 10022', phone: '+1 (555) 234-5678', currency: 'USD' }
      });
    }

    // 4. Create Floors
    let floorMain = await prisma.floor.findFirst({ where: { branchId: branch.id, name: 'Main Dining Room' } });
    if (!floorMain) {
      floorMain = await prisma.floor.create({
        data: { branchId: branch.id, name: 'Main Dining Room' }
      });
    }

    let floorTerrace = await prisma.floor.findFirst({ where: { branchId: branch.id, name: 'Rooftop Terrace' } });
    if (!floorTerrace) {
      floorTerrace = await prisma.floor.create({
        data: { branchId: branch.id, name: 'Rooftop Terrace' }
      });
    }

    // 5. Create Tables
    const tableConfigs = [
      { label: 'T-01', capacity: 4, shape: 'SQUARE', status: 'AVAILABLE' as const, positionX: 10, positionY: 10 },
      { label: 'T-02', capacity: 2, shape: 'ROUND', status: 'AVAILABLE' as const, positionX: 120, positionY: 10 },
      { label: 'T-03', capacity: 6, shape: 'RECTANGLE', status: 'OCCUPIED' as const, positionX: 230, positionY: 10 },
      { label: 'T-04', capacity: 4, shape: 'SQUARE', status: 'DIRTY' as const, positionX: 10, positionY: 120 },
      { label: 'T-05', capacity: 8, shape: 'RECTANGLE', status: 'AVAILABLE' as const, positionX: 120, positionY: 120 }
    ];

    for (const config of tableConfigs) {
      const existing = await prisma.table.findFirst({ where: { floorId: floorMain.id, label: config.label } });
      if (!existing) {
        await prisma.table.create({
          data: { floorId: floorMain.id, ...config }
        });
      }
    }

    // 6. Create Categories & Menu Items
    const categoryConfigs = [
      {
        name: 'Starters & Appetizers',
        sortOrder: 1,
        items: [
          { name: 'Truffle Mushroom Arancini', description: 'Crispy risotto balls stuffed with wild mushrooms and truffle oil', basePriceCents: 1450, taxRatePercent: 8.0 },
          { name: 'Artisanal Garlic Flatbread', description: 'Woodfired sourdough flatbread with roasted garlic butter and herbs', basePriceCents: 800, taxRatePercent: 8.0 }
        ]
      },
      {
        name: 'Woodfired Pizzas',
        sortOrder: 2,
        items: [
          { name: 'Classic Margherita Pizza', description: 'San Marzano tomato sauce, fresh mozzarella, and Genovese basil', basePriceCents: 1600, taxRatePercent: 8.0 },
          { name: 'Smoked Pepperoni Supreme', description: 'Artisanal pepperoni, spicy honey drizzle, and fresh oregano', basePriceCents: 1950, taxRatePercent: 8.0 }
        ]
      },
      {
        name: 'Main Course & Grills',
        sortOrder: 3,
        items: [
          { name: 'Grilled Angus Ribeye Steak', description: '12oz prime ribeye served with truffle butter and rosemary fries', basePriceCents: 3400, taxRatePercent: 8.0 },
          { name: 'Creamy Wild Mushroom Risotto', description: 'Arborio rice, porcini mushrooms, parmesan crisp, and truffle oil', basePriceCents: 2200, taxRatePercent: 8.0 }
        ]
      },
      {
        name: 'Beverages & Drinks',
        sortOrder: 4,
        items: [
          { name: 'Classic Iced Americano', description: 'Double espresso over chilled mineral water and ice', basePriceCents: 550, taxRatePercent: 8.0 },
          { name: 'Sparkling Italian Soda', description: 'Refreshing blood orange craft soda', basePriceCents: 600, taxRatePercent: 8.0 }
        ]
      }
    ];

    for (const cat of categoryConfigs) {
      let category = await prisma.category.findFirst({ where: { branchId: branch.id, name: cat.name } });
      if (!category) {
        category = await prisma.category.create({
          data: { branchId: branch.id, name: cat.name, sortOrder: cat.sortOrder }
        });
      }

      for (const item of cat.items) {
        const existingItem = await prisma.menuItem.findFirst({ where: { categoryId: category.id, name: item.name } });
        if (!existingItem) {
          await prisma.menuItem.create({
            data: { categoryId: category.id, ...item }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Realistic restaurant demo data successfully seeded into database!',
      data: { organizationId: org.id, restaurantId: rest.id, branchId: branch.id }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
