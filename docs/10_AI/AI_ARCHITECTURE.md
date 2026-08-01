# AI Architecture & Prompt Systems Blueprint — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: AI Intelligence Layer  
> **Related Documents**: [AI_RESTAURANT_ASSISTANT.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/02_Restaurant/AI_RESTAURANT_ASSISTANT.md)

---

## 1. Purpose

This document specifies the system architecture, LLM orchestration framework, function calling engine, context window management, and security guardrails governing the **Trinetra AI Subsystem**.

---

## 2. Architecture & Data Flow

```
[ User UI Input / Natural Language Query ]
                    │
                    ▼
[ Next.js AI Gateway Endpoint (`/api/v1/ai/chat`) ]
                    │
                    ├── Auth & Tenant Scoping (Inject `branchId`)
                    ├── Prompt Sanitization & Guardrail Check
                    │
                    ▼
[ Model Orchestrator (Google Gemini 1.5 Pro / OpenAI GPT-4o) ]
                    │
                    ├── Triggers Function Calling (e.g., `querySalesData`)
                    │
                    ▼
[ DB Read Replica Query via Prisma ]
                    │
                    ├── Returns Formatted Data JSON
                    │
                    ▼
[ Final Natural Language Response + Visual Analytics Widget ]
```

---

## 3. System Prompt & Guardrail Blueprint

```typescript
// src/modules/ai/prompts/system-prompt.ts

export const TRINETRA_AI_SYSTEM_PROMPT = `
You are the Trinetra AI Business Assistant, an expert operational analyst for restaurants.

CORE INVARIANTS:
1. TENANT SECURITY: You must ONLY query data for the active branch ID provided in the system context. Never reveal or attempt to query data from other restaurants.
2. ACCURACY: Base all financial and operational summaries strictly on database tool call outputs. Do not fabricate sales numbers.
3. CONCISENESS: Present insights clearly using markdown tables, bullet points, and bulleted recommendations suitable for busy restaurant owners.
`;
```

---

## 4. Operational & Privacy Standards

- **Zero Data Retention**: LLM API calls utilize enterprise privacy flags preventing provider model training on tenant data.
- **Cost & Rate Control**: Token usage is capped per user query (max 2,000 output tokens) with a daily query limit per branch tier.
