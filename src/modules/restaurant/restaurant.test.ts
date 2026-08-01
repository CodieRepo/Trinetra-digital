import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const CreateMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(2),
  basePriceCents: z.number().int().min(0),
  isAvailable: z.boolean().default(true)
});

const CreateTableSchema = z.object({
  floorId: z.string().uuid(),
  label: z.string().min(1),
  capacity: z.number().int().min(1).default(4),
  shape: z.enum(['SQUARE', 'ROUND', 'RECTANGLE']).default('SQUARE')
});

describe('Sprint 1B Restaurant Foundation Validation Tests', () => {
  it('validates Menu Item DTO creation with price in minor cents', () => {
    const valid = CreateMenuItemSchema.safeParse({
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Truffle Pasta',
      basePriceCents: 1850,
      isAvailable: true
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.basePriceCents).toBe(1850);
    }
  });

  it('rejects Menu Item DTO with negative price', () => {
    const invalid = CreateMenuItemSchema.safeParse({
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Truffle Pasta',
      basePriceCents: -500
    });
    expect(invalid.success).toBe(false);
  });

  it('validates Table DTO creation with shape and capacity', () => {
    const validTable = CreateTableSchema.safeParse({
      floorId: '123e4567-e89b-12d3-a456-426614174000',
      label: 'T-04',
      capacity: 6,
      shape: 'ROUND'
    });
    expect(validTable.success).toBe(true);
    if (validTable.success) {
      expect(validTable.data.shape).toBe('ROUND');
      expect(validTable.data.capacity).toBe(6);
    }
  });
});
