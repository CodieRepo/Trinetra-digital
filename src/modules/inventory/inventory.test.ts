import { describe, it, expect } from 'vitest';

function calculateDishCostAndMargin(
  basePriceCents: number,
  boms: Array<{ costPerUnitCents: number; quantityUsed: number }>
) {
  const estimatedCostCents = boms.reduce((acc, b) => acc + Math.round(b.costPerUnitCents * b.quantityUsed), 0);
  const profitMarginPercent = basePriceCents > 0
    ? Number((((basePriceCents - estimatedCostCents) / basePriceCents) * 100).toFixed(2))
    : 0;

  return { estimatedCostCents, profitMarginPercent };
}

describe('Sprint 4 Inventory & Recipe BOM Unit Tests', () => {
  it('calculates food cost per dish and profit margin correctly', () => {
    const basePriceCents = 2200; // $22.00
    const boms = [
      { costPerUnitCents: 500, quantityUsed: 0.8 }, // Arborio Rice: $4.00 (400 cents)
      { costPerUnitCents: 1200, quantityUsed: 0.25 } // Porcini Mushrooms: $3.00 (300 cents)
    ]; // Total Cost = $7.00 (700 cents)

    const res = calculateDishCostAndMargin(basePriceCents, boms);
    expect(res.estimatedCostCents).toBe(700);
    expect(res.profitMarginPercent).toBe(68.18); // (22 - 7) / 22 * 100 = 68.18%
  });

  it('triggers low stock alert threshold correctly', () => {
    const checkIsLowStock = (currentStock: number, reorderPoint: number) => currentStock <= reorderPoint;

    expect(checkIsLowStock(8.5, 10.0)).toBe(true);
    expect(checkIsLowStock(15.0, 10.0)).toBe(false);
  });
});
