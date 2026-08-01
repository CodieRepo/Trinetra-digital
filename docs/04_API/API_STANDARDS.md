# REST & WebSocket API Standards & Guidelines — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Platform & Restaurant OS  
> **Related Documents**: [ERROR_CODES.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/04_API/ERROR_CODES.md), [AUTH_API.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/04_API/AUTH_API.md)

---

## 1. Purpose

This document codifies the mandatory API standards, URI structure, JSON response envelopes, authentication header requirements, error payload structures, and Zod input validation rules for **Trinetra v2.0**.

---

## 2. API Design Principles

1. **RESTful Resource URIs**: Plural nouns for collections (`/api/v1/orders`), clear hierarchy for sub-resources (`/api/v1/branches/:branchId/menu-items`).
2. **HTTP Method Semantics**:
   - `GET`: Idempotent read operations.
   - `POST`: Create a new resource or execute a domain command.
   - `PATCH`: Partial resource update.
   - `DELETE`: Soft-delete resource.
3. **Standardized Response Envelope**: All API endpoints return a uniform JSON wrapper containing success status, payload data, or structured error details.

---

## 3. Standard JSON Response Envelopes

### 3.1 Success Response Envelope
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "orderId": "ord_887766",
    "orderNumber": "104",
    "status": "PLACED",
    "totalAmountCents": 2376
  },
  "meta": {
    "timestamp": "2026-07-31T21:11:42Z",
    "requestId": "req_abc123"
  }
}
```

### 3.2 Error Response Envelope
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid request payload attributes",
    "details": [
      {
        "field": "items[0].quantity",
        "issue": "Quantity must be a positive integer"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-07-31T21:11:42Z",
    "requestId": "req_err456"
  }
}
```

---

## 4. Header Authentication Standard

Every request to protected API routes must include:
- `Authorization: Bearer <supabase_jwt_access_token>`
- `X-Branch-Id: <uuid_of_active_branch>`

---

## 5. Next.js API Handler Wrapper Pattern

```typescript
// src/modules/core/utils/api-handler.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export function createApiHandler<TInput, TOutput>(options: {
  schema?: z.ZodSchema<TInput>;
  handler: (input: TInput, req: NextRequest) => Promise<TOutput>;
}) {
  return async (req: NextRequest) => {
    try {
      let body: TInput = {} as TInput;
      if (options.schema) {
        const json = await req.json();
        const parsed = options.schema.safeParse(json);
        if (!parsed.success) {
          return NextResponse.json(
            {
              success: false,
              statusCode: 400,
              error: {
                code: 'VALIDATION_FAILED',
                message: 'Invalid payload attributes',
                details: parsed.error.issues.map(i => ({ field: i.path.join('.'), issue: i.message }))
              }
            },
            { status: 400 }
          );
        }
        body = parsed.data;
      }

      const result = await options.handler(body, req);
      return NextResponse.json({ success: true, statusCode: 200, data: result });
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          statusCode: 500,
          error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'An unexpected error occurred' }
        },
        { status: 500 }
      );
    }
  };
}
```
