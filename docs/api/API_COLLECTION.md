# Trinetra Restaurant OS — Milestone 2 REST API Specification

**Version:** `v1.0.0`  
**Base Path:** `/api/v1/auth`  
**Authentication Standard:** Dual-Mode (Device Token Header + Short-Lived Staff JWT)  
**Contract Version:** Version 1.0 (Frozen)

---

## Overview & Architecture Rules

1. **Standard Response Envelope (`ApiResponse<T>`):**
   All API endpoints return JSON conforming to the following structure:
   ```json
   {
     "success": true,
     "data": { ... },
     "meta": {
       "timestamp": "2026-08-05T15:15:00.000Z",
       "version": "v1",
       "trace_id": "c89a0b12-3456-7890-abcd-1234567890ab"
     }
   }
   ```

2. **Standard Error Envelope (`ApiErrorResponse`):**
   All failure responses return HTTP 4xx/5xx status codes conforming to:
   ```json
   {
     "success": false,
     "error": {
       "code": "INVALID_STAFF_PIN",
       "message": "Incorrect staff PIN entered",
       "details": null,
       "timestamp": "2026-08-05T15:15:00.000Z",
       "trace_id": "c89a0b12-3456-7890-abcd-1234567890ab"
     },
     "meta": {
       "timestamp": "2026-08-05T15:15:00.000Z",
       "version": "v1",
       "trace_id": "c89a0b12-3456-7890-abcd-1234567890ab"
     }
   }
   ```

---

## Endpoint Specifications

### 1. Pair Terminal Device
Registers a hardware terminal device and issues a long-lived 256-bit device token.

- **URL:** `POST /api/v1/auth/terminals/pair`
- **Auth Required:** Owner / Manager SaaS Session
- **Status Codes:**
  - `201 Created`: Device successfully paired.
  - `400 Bad Request`: Schema validation failure.
  - `409 Conflict`: Device token already paired.

#### Request Example Payload:
```json
{
  "tenant_id": "1ab21b6e-d5ea-4395-81e4-ba2d06907194",
  "restaurant_id": "a3c3e5f7-36e7-4409-8a25-76e4f7f47213",
  "terminal_name": "Main Floor POS Tablet 1",
  "terminal_type": "FloorPOS",
  "device_fingerprint": "fp_mac_78:21:84:a9:01:bc",
  "app_version": "v1.0.0"
}
```

#### Success Response Payload (`201 Created`):
```json
{
  "success": true,
  "data": {
    "terminal_id": "c93acd8a-44ea-4b78-b34c-6d4dbf450a77",
    "terminal_name": "Main Floor POS Tablet 1",
    "terminal_type": "FloorPOS",
    "device_token": "9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a",
    "status": "Active",
    "paired_at": "2026-08-05T15:15:00.000Z"
  },
  "meta": {
    "timestamp": "2026-08-05T15:15:00.000Z",
    "version": "v1",
    "trace_id": "req_8f1234bc"
  }
}
```

---

### 2. Staff PIN Login
Authenticates a staff member on a paired terminal using a 4-to-6 digit numeric PIN.

- **URL:** `POST /api/v1/auth/staff/pin-login`
- **Auth Required:** None (Paired Terminal Token passed in body)
- **Status Codes:**
  - `200 OK`: PIN verified; 15-minute staff JWT issued.
  - `400 Bad Request`: Invalid PIN format.
  - `401 Unauthorized`: Incorrect staff PIN.
  - `422 Unprocessable Entity`: Terminal revoked or inactive.
  - `429 Too Many Requests`: 15-minute brute-force lockout triggered (5 consecutive failures).

#### Request Example Payload:
```json
{
  "restaurant_id": "a3c3e5f7-36e7-4409-8a25-76e4f7f47213",
  "device_token": "9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a",
  "pin": "4321"
}
```

#### Success Response Payload (`200 OK`):
```json
{
  "success": true,
  "data": {
    "staff_jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2026-08-05T15:30:00.000Z",
    "staff": {
      "staff_id": "a5b835e8-9cf8-4944-b0da-0d111f329a23",
      "name": "Rajesh Kumar",
      "role": "waiter"
    },
    "terminal": {
      "terminal_id": "c93acd8a-44ea-4b78-b34c-6d4dbf450a77",
      "terminal_name": "Main Floor POS Tablet 1",
      "terminal_type": "FloorPOS"
    },
    "session_type": "STAFF"
  },
  "meta": {
    "timestamp": "2026-08-05T15:15:00.000Z",
    "version": "v1",
    "trace_id": "req_8f1234bd"
  }
}
```

---

### 3. Manager PIN Elevation
Generates a temporary (5-minute) elevated JWT for restricted actions (bill discounts, voiding orders, cash drawer overrides).

- **URL:** `POST /api/v1/auth/manager/elevate`
- **Auth Required:** Active Terminal Context
- **Status Codes:**
  - `200 OK`: Manager PIN verified; 5-minute elevation token issued.
  - `401 Unauthorized`: Incorrect Manager PIN.
  - `403 Forbidden`: Staff member is not a Manager or Owner.

#### Request Example Payload:
```json
{
  "restaurant_id": "a3c3e5f7-36e7-4409-8a25-76e4f7f47213",
  "terminal_id": "c93acd8a-44ea-4b78-b34c-6d4dbf450a77",
  "manager_pin": "9876",
  "target_action": "ORDER_VOID_ITEM",
  "reason": "Customer changed order item before kitchen prep"
}
```

#### Success Response Payload (`200 OK`):
```json
{
  "success": true,
  "data": {
    "elevation_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2026-08-05T15:20:00.000Z",
    "manager": {
      "staff_id": "eabf167a-6fea-4331-81a3-0bc87ee54f5e",
      "name": "Suresh Mehta",
      "role": "manager"
    },
    "target_action": "ORDER_VOID_ITEM",
    "session_type": "MANAGER_ELEVATION"
  },
  "meta": {
    "timestamp": "2026-08-05T15:15:00.000Z",
    "version": "v1",
    "trace_id": "req_8f1234be"
  }
}
```

---

### 4. Revoke Terminal Device
Revokes a paired hardware terminal, invalidating device session tokens.

- **URL:** `POST /api/v1/auth/terminals/revoke`
- **Auth Required:** Owner / Manager Role
- **Status Codes:**
  - `200 OK`: Terminal revoked.
  - `404 Not Found`: Terminal ID not found.

#### Request Example Payload:
```json
{
  "terminal_id": "c93acd8a-44ea-4b78-b34c-6d4dbf450a77",
  "reason": "Tablet lost or stolen from floor"
}
```

#### Success Response Payload (`200 OK`):
```json
{
  "success": true,
  "data": {
    "terminal_id": "c93acd8a-44ea-4b78-b34c-6d4dbf450a77",
    "status": "Revoked",
    "revoked_at": "2026-08-05T15:15:00.000Z"
  },
  "meta": {
    "timestamp": "2026-08-05T15:15:00.000Z",
    "version": "v1",
    "trace_id": "req_8f1234bf"
  }
}
```

---

### 5. Set or Reset Staff PIN
Sets or updates a staff member's security PIN.

- **URL:** `POST /api/v1/auth/staff/set-pin`
- **Auth Required:** Owner / Manager Role
- **Status Codes:**
  - `200 OK`: PIN updated.
  - `400 Bad Request`: Invalid PIN format (must be 4-6 digits).
  - `404 Not Found`: Staff member not found.

#### Request Example Payload:
```json
{
  "staff_id": "a5b835e8-9cf8-4944-b0da-0d111f329a23",
  "restaurant_id": "a3c3e5f7-36e7-4409-8a25-76e4f7f47213",
  "pin": "4321"
}
```

#### Success Response Payload (`200 OK`):
```json
{
  "success": true,
  "data": {
    "staff_id": "a5b835e8-9cf8-4944-b0da-0d111f329a23",
    "updated_at": "2026-08-05T15:15:00.000Z"
  },
  "meta": {
    "timestamp": "2026-08-05T15:15:00.000Z",
    "version": "v1",
    "trace_id": "req_8f1234bg"
  }
}
```
