# Menu & Modifier Management Specification — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Priority 1 (Flagship SaaS Product)  
> **Related Documents**: [POS_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/POS_SYSTEM.md), [DATABASE_SCHEMA.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/03_Database/DATABASE_SCHEMA.md)

---

## 1. Purpose

This document specifies the data model, validation schemas, modifier rules, variant pricing, dynamic stock availability toggles, and day-part scheduling engine for **Trinetra Menu Management**.

---

## 2. Menu Data Hierarchy

Menu architecture follows a strict 6-tier nested structure:

```
Category (e.g. "Pizzas")
   └── Subcategory (e.g. "Gourmet Pizzas")
         └── Menu Item (e.g. "Truffle Mushroom Pizza")
               ├── Variants (e.g. Small: $14, Medium: $18, Large: $22)
               └── Modifier Groups (e.g. "Choose Crust", "Extra Toppings")
                     ├── Single Choice Group (Mandatory: Crust Type -> Thin / Pan / Stuffed)
                     └── Multi Choice Group (Optional: Extra Toppings -> Olives +$1.50, Cheese +$2.00)
```

---

## 3. TypeScript Domain Schema Definitions

```typescript
// src/modules/restaurant/types/menu.ts
import { z } from 'zod';

export const ModifierOptionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  isAvailable: z.boolean().default(true),
  ingredientBomId: z.string().uuid().optional()
});

export const ModifierGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  minSelection: z.number().int().min(0),
  maxSelection: z.number().int().positive(),
  options: z.array(ModifierOptionSchema)
});

export const MenuItemVariantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1), // e.g. "Large 14-inch"
  priceCents: z.number().int().positive(),
  sku: z.string().optional()
});

export const MenuItemSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  basePriceCents: z.number().int().positive(),
  isAvailable: z.boolean().default(true),
  taxRatePercent: z.number().nonnegative().default(8.0),
  variants: z.array(MenuItemVariantSchema).default([]),
  modifierGroups: z.array(ModifierGroupSchema).default([])
});

export type MenuItem = z.infer<typeof MenuItemSchema>;
```

---

## 4. Dynamic Availability & Stock Toggles

Managers can instant-toggle menu item availability (`86-ing an item`). Toggling availability invalidates client memory caches and broadcasts a WebSocket update across all POS, KDS, and QR Ordering interfaces in `< 100ms`.

```typescript
// src/modules/restaurant/services/menu-service.ts

export async function toggleMenuItemStock(
  menuItemId: string,
  isAvailable: boolean,
  branchId: string
): Promise<void> {
  // Update DB record
  await supabase
    .from('menu_items')
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq('id', menuItemId)
    .eq('branch_id', branchId);

  // Broadcast WebSocket Event
  await supabaseRealtime.broadcast(`realtime:branch:${branchId}:menu`, 'ITEM_STOCK_TOGGLE', {
    menuItemId,
    isAvailable
  });
}
```

---

## 5. Developer & Operational Notes

- **Price Invariant**: All item variant and modifier prices are specified in integer cents/paise.
- **Tax Calculation**: Taxes are dynamically calculated per line item based on its assigned `taxRatePercent`.
