# AI Restaurant Assistant Engine Specification — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Priority 1 (Flagship SaaS Product)  
> **Related Documents**: [RESTAURANT_VISION.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/RESTAURANT_VISION.md), [REPORTING_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/REPORTING_SYSTEM.md)

---

## 1. Purpose

This document details the software architecture, prompt engineering schemas, function calling tools, security guardrails, and natural language interfaces powering the **Trinetra AI Restaurant Assistant**.

---

## 2. Capabilities & AI Use-Cases

1. **Natural Language Business Querying**: Restaurant owners can ask operational questions (e.g., *"What were our top 3 selling dishes during lunch yesterday?"*) and receive instant data insights.
2. **Automated Daily Executive Summary**: Generates concise daily closing reports highlighting revenue, margin, peak hour velocity, customer volume, and item wastage.
3. **Predictive Inventory Reorder Suggestions**: Analyzes historical dish sales velocity to project ingredient depletion and draft supplier purchase orders automatically.
4. **Menu Engineering Recommendations**: Classifies menu items into the Boston Consulting Group Matrix (Stars, Dogs, Puzzles, Workhorses) and suggests pricing adjustments.

---

## 3. Architecture & LLM Function Calling Workflow

```
[ User Natural Language Prompt ]
              │
              ▼
[ Trinetra AI Gateway (Next.js API Route) ]
              │
              ├── Step 1: Validate Tenant Context & Permissions
              ├── Step 2: Inject System Prompt & Schema Constraints
              │
              ▼
[ Gemini 1.5 Pro / GPT-4o Agent Engine ]
              │
              ├── Step 3: Trigger Function Call (e.g. `getSalesSummary()`)
              │
              ▼
[ Trinetra Structured Query Execution (Prisma / Supabase Read Replica) ]
              │
              ├── Step 4: Return Formatted JSON Payload to LLM
              │
              ▼
[ Synthesized Natural Language Response + Visual Charts ]
```

---

## 4. Function Calling Tool Specifications

```typescript
// src/modules/ai/tools/restaurant-tools.ts
import { z } from 'zod';

export const SalesQueryToolSchema = z.object({
  branchId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  groupBy: z.enum(['HOUR', 'DAY', 'CATEGORY', 'ITEM'])
});

export interface SalesQueryToolResult {
  totalRevenueCents: number;
  totalOrders: number;
  averageOrderValueCents: number;
  breakdown: Array<{ key: string; revenueCents: number; orderCount: number }>;
}

export async function executeSalesQueryTool(
  input: z.infer<typeof SalesQueryToolSchema>
): Promise<SalesQueryToolResult> {
  // Query read-replica DB for aggregated metrics
  const data = await prisma.order.aggregate({
    where: {
      branchId: input.branchId,
      createdAt: { gte: new Date(input.startDate), lte: new Date(input.endDate) },
      status: 'PAID'
    },
    _sum: { totalAmountCents: true },
    _count: { id: true }
  });

  return {
    totalRevenueCents: data._sum.totalAmountCents || 0,
    totalOrders: data._count.id || 0,
    averageOrderValueCents: data._count.id ? Math.round((data._sum.totalAmountCents || 0) / data._count.id) : 0,
    breakdown: []
  };
}
```

---

## 5. Security, Privacy & Guardrails

- **Zero Multi-Tenant Data Leakage**: AI prompts and tool calls are strictly locked to the authenticated user's `branch_id`. The system prompt explicitly forbids querying data outside the tenant scope.
- **No Model Training on Tenant Data**: Enterprise API endpoints are configured with zero data retention for AI model training.
