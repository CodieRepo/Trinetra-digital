# Testing Strategy & QA Architecture — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: QA Quality Blueprint  
> **Related Documents**: [SUCCESS_CRITERIA.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/00_Project/SUCCESS_CRITERIA.md)

---

## 1. Purpose

This document details the testing methodology, unit testing standards (Vitest), integration testing rules, E2E browser automation (Playwright), and quality assurance gates required for **Trinetra v2.0**.

---

## 2. Testing Pyramid & Target Metrics

```
        ▲
       / \         E2E Tests (Playwright) - 15% Coverage
      /   \        - POS Checkout Flow, KDS Realtime Sync, Table Canvas
     /-----\
    /       \      Integration Tests (Vitest + Supabase Emulator) - 35% Coverage
   /---------\     - API Handlers, RLS Policies, State Machine Transitions
  /           \
 /-------------\   Unit Tests (Vitest) - 50% Coverage
/---------------\  - Calculation Logic, Zod Schemas, ESC/POS Buffer Generators
```

---

## 3. Test Runner Setup & Commands

- **Unit & Integration Tests**: Executed via Vitest with isolated in-memory DB mocks.
  `npm run test`
- **End-to-End Tests**: Automated Playwright test browser suite simulating POS cashier and KDS screen interactions.
  `npm run test:e2e`

---

## 4. E2E Test Case Example (POS Checkout Flow)

```typescript
// tests/e2e/pos-checkout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('POS Order & Checkout Execution', () => {
  test('Cashier creates dine-in order, adds items, and completes cash checkout', async ({ page }) => {
    await page.goto('/pos');
    
    // Select Table T-04
    await page.click('text="T-04"');
    
    // Add Margherita Pizza via hotkey search
    await page.keyboard.press('/');
    await page.keyboard.type('Margherita');
    await page.keyboard.press('Enter');
    
    // Verify cart total
    await expect(page.locator('[data-testid="cart-total"]')).toContainText('$14.00');
    
    // Open Checkout via F2
    await page.keyboard.press('F2');
    
    // Select Cash & Complete Payment
    await page.click('button:has-text("Cash")');
    await page.click('button:has-text("Complete Pay")');
    
    // Assert Order Paid Toast & Table Cleared
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
```

---

## 5. Quality Gate Enforcement

- CI/CD builds fail automatically if unit test coverage drops below **85%**.
- Zero failing E2E tests permitted on `main` release branches.
