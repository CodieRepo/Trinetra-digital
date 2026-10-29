/**
 * Trinetra Restaurant OS — Automated Recipe (BOM) Inventory Deduction Engine
 * File: src/lib/services/inventory-deduction.ts
 *
 * Automatically calculates and mutates raw ingredient inventory levels
 * when customer/waiter orders are punched in POS or QR menu.
 */

import { getSupabaseAdmin } from "../supabase/admin";

export interface OrderItemDeductionTarget {
  menu_item_id: string;
  quantity: number;
  name?: string;
}

export interface InventoryDeductionParams {
  tenantId: string;
  restaurantId: string;
  orderId: string;
  items: OrderItemDeductionTarget[];
}

export interface DeductionResult {
  success: boolean;
  deductedIngredients: number;
  warnings?: string[];
}

/**
 * Deducts raw material inventory for the given order's items based on configured recipes.
 */
export async function deductInventoryForOrder(
  params: InventoryDeductionParams
): Promise<DeductionResult> {
  const { tenantId, restaurantId, orderId, items } = params;
  const db = getSupabaseAdmin();

  if (!items || items.length === 0) {
    return { success: true, deductedIngredients: 0 };
  }

  const warnings: string[] = [];
  let deductedCount = 0;

  try {
    const menuItemIds = items.map((i) => i.menu_item_id).filter(Boolean);
    if (menuItemIds.length === 0) {
      return { success: true, deductedIngredients: 0 };
    }

    // 1. Fetch recipe ingredients for all items in this order
    const { data: recipes, error: recErr } = await db
      .from("restaurant_recipe_items")
      .select("menu_item_id, inventory_item_id, quantity_consumed, unit")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .in("menu_item_id", menuItemIds);

    if (recErr || !recipes || recipes.length === 0) {
      // No recipes configured for these items — nothing to deduct
      return { success: true, deductedIngredients: 0 };
    }

    // Map ordered quantities: menuItemId -> orderedQty
    const orderedQtyMap = new Map<string, number>();
    for (const item of items) {
      const prev = orderedQtyMap.get(item.menu_item_id) || 0;
      orderedQtyMap.set(item.menu_item_id, prev + (Number(item.quantity) || 1));
    }

    // Aggregate total consumption per raw inventory item
    const consumptionMap = new Map<string, number>(); // inventory_item_id -> totalToDeduct
    for (const r of recipes) {
      const orderedQty = orderedQtyMap.get(r.menu_item_id) || 1;
      const consumed = (Number(r.quantity_consumed) || 0) * orderedQty;
      const prev = consumptionMap.get(r.inventory_item_id) || 0;
      consumptionMap.set(r.inventory_item_id, prev + consumed);
    }

    const inventoryItemIds = Array.from(consumptionMap.keys());
    if (inventoryItemIds.length === 0) {
      return { success: true, deductedIngredients: 0 };
    }

    // 2. Fetch current stock levels of affected inventory items
    const { data: inventoryItems, error: invErr } = await db
      .from("restaurant_inventory_items")
      .select("id, name, current_stock, min_stock_alert, unit")
      .eq("tenant_id", tenantId)
      .eq("restaurant_id", restaurantId)
      .in("id", inventoryItemIds);

    if (invErr || !inventoryItems) {
      warnings.push(`Failed to fetch inventory items: ${invErr?.message}`);
      return { success: false, deductedIngredients: 0, warnings };
    }

    // 3. Mutate each inventory item and log stock movement
    for (const inv of inventoryItems) {
      const toDeduct = consumptionMap.get(inv.id) || 0;
      if (toDeduct <= 0) continue;

      const prevStock = Number(inv.current_stock) || 0;
      const newStock = Math.max(0, Math.round((prevStock - toDeduct) * 1000) / 1000);

      // Update current stock
      await db
        .from("restaurant_inventory_items")
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inv.id);

      // Log movement audit
      const isUuid = Boolean(orderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId));
      const { error: movErr } = await db.from("restaurant_stock_movements").insert({
        tenant_id: tenantId,
        restaurant_id: restaurantId,
        inventory_item_id: inv.id,
        movement_type: "order_consumption",
        quantity: -toDeduct,
        previous_stock: prevStock,
        new_stock: newStock,
        order_id: isUuid ? orderId : null,
        actor_name: "POS System",
        notes: `Auto-deducted for Order #${orderId ? orderId.slice(0, 8) : "N/A"}`,
      });
      if (movErr) {
        console.warn("⚠️ Stock movement insert warning:", movErr.message);
      }

      deductedCount++;

      if (newStock <= Number(inv.min_stock_alert)) {
        warnings.push(`Low stock alert: ${inv.name} is now at ${newStock} ${inv.unit} (Alert threshold: ${inv.min_stock_alert})`);
      }
    }

    return {
      success: true,
      deductedIngredients: deductedCount,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err: any) {
    console.error("❌ Exception during inventory auto-deduction:", err);
    return {
      success: false,
      deductedIngredients: deductedCount,
      warnings: [err?.message || "Unknown error during deduction"],
    };
  }
}
