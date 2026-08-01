import { describe, it, expect } from 'vitest';

function calculateDineInTotals(
  items: Array<{ unitPriceCents: number; quantity: number; taxRatePercent: number }>,
  discountCents: number = 0
) {
  let subtotalCents = 0;
  let taxCents = 0;

  for (const item of items) {
    const itemTotal = item.unitPriceCents * item.quantity;
    subtotalCents += itemTotal;
    const itemTax = Math.round((itemTotal * item.taxRatePercent) / 100);
    taxCents += itemTax;
  }

  const totalAmountCents = Math.max(0, subtotalCents + taxCents - discountCents);
  return { subtotalCents, taxCents, discountCents, totalAmountCents };
}

describe('Sprint 2 Order Engine Financial Calculation Tests', () => {
  it('calculates exact subtotal, tax and total in minor units', () => {
    const items = [
      { unitPriceCents: 1450, quantity: 2, taxRatePercent: 8.0 }, // $29.00
      { unitPriceCents: 1600, quantity: 1, taxRatePercent: 8.0 }  // $16.00
    ];
    // Subtotal = $45.00 (4500 cents)
    // Tax 8% = $3.60 (360 cents)
    // Total = $48.60 (4860 cents)
    const result = calculateDineInTotals(items);
    expect(result.subtotalCents).toBe(4500);
    expect(result.taxCents).toBe(360);
    expect(result.totalAmountCents).toBe(4860);
  });

  it('applies discount correctly in minor units without floating point errors', () => {
    const items = [{ unitPriceCents: 2000, quantity: 1, taxRatePercent: 10.0 }];
    // Subtotal = 2000, Tax = 200, Discount = 500 ($5.00 off) -> Total = 1700 ($17.00)
    const result = calculateDineInTotals(items, 500);
    expect(result.subtotalCents).toBe(2000);
    expect(result.taxCents).toBe(200);
    expect(result.discountCents).toBe(500);
    expect(result.totalAmountCents).toBe(1700);
  });
});
