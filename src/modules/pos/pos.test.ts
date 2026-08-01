import { describe, it, expect } from 'vitest';

function calculateSplitPayment(
  totalCents: number,
  splits: Array<{ method: string; amountCents: number }>
) {
  const sum = splits.reduce((acc, s) => acc + s.amountCents, 0);
  return {
    isFullyPaid: sum >= totalCents,
    remainingCents: Math.max(0, totalCents - sum),
    sum
  };
}

describe('Sprint 3 POS & KDS Workflow Validation Tests', () => {
  it('validates multi-method split payment exact coverage', () => {
    const totalCents = 4860; // $48.60
    const splits = [
      { method: 'CASH', amountCents: 2000 }, // $20.00
      { method: 'CARD', amountCents: 2860 }  // $28.60
    ];

    const res = calculateSplitPayment(totalCents, splits);
    expect(res.isFullyPaid).toBe(true);
    expect(res.remainingCents).toBe(0);
    expect(res.sum).toBe(4860);
  });

  it('detects partial split payments correctly', () => {
    const totalCents = 5000;
    const splits = [{ method: 'CASH', amountCents: 2000 }];

    const res = calculateSplitPayment(totalCents, splits);
    expect(res.isFullyPaid).toBe(false);
    expect(res.remainingCents).toBe(3000);
  });
});
