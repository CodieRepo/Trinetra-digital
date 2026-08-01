# API Test Results — Sprint 1

## Endpoints Tested

### 1. `GET /api/r/[tableToken]`
- **Request:** `GET /api/r/11111111-2222-3333-4444-555555555555`
- **Response Code:** `200 OK`
- **Response Body:**
```json
{
  "restaurant": {
    "id": "ed42f068-07ee-45df-bbad-7ffabde4d0a9",
    "name": "Trinetra Test Diner",
    "address": "Gorakhpur, UP",
    "currency": "INR"
  },
  "table": {
    "id": "21bb013f-bf14-41fc-bb2b-78891515bf69",
    "table_number": "T-99",
    "table_token": "11111111-2222-3333-4444-555555555555"
  },
  "menu": {
    "categories": [
      { "id": "cat_01", "name": "Main Course", "display_order": 1, "is_active": true }
    ],
    "items": [
      { "id": "item_01", "name": "Special Paneer Butter Masala", "price": 280.00, "is_available": true }
    ]
  }
}
```
- **Validation:** Structure matches `MenuPayload`. Inactive categories and items filtered out.
- **Failure Case:** Requesting invalid token (`00000000-...`) returns `404 Not Found` with `{ "error": "Table not found or inactive" }`.

---

### 2. `GET /api/r/[tableToken]/session`
- **Request:** `GET /api/r/11111111-2222-3333-4444-555555555555/session?session_token=66666666-7777-8888-9999-000000000000`
- **Response Code:** `200 OK`
- **Response Body:**
```json
{
  "session": {
    "id": "b89fe426-edc5-4bfe-a70d-5a21ff4fbc9b",
    "status": "active",
    "customer_name": "Aarav Sharma Test",
    "customer_phone": "+919999888877",
    "payment_status": "unpaid",
    "opened_at": "2026-08-02T00:13:00.000Z"
  },
  "orders": []
}
```
- **Validation:** Fetches active table session and populates customer identity.
- **Failure Case:** Missing `session_token` parameter returns `400 Bad Request`.

---

### 3. `POST /api/r/[tableToken]/session/identify`
- **Request:** `POST /api/r/11111111-2222-3333-4444-555555555555/session/identify`
- **Payload:**
```json
{
  "session_token": "66666666-7777-8888-9999-000000000000",
  "customer_name": "Aarav Sharma Test",
  "customer_phone": "+919999888877"
}
```
- **Response Code:** `200 OK`
- **Response Body:** `{ "success": true, "session_id": "b89fe426-edc5-4bfe-a70d-5a21ff4fbc9b" }`
- **Validation:** Table session created/updated, DB trigger automatically ingested customer into `public.leads`.

---

### 4. `POST /api/r/[tableToken]/orders`
- **Request:** `POST /api/r/11111111-2222-3333-4444-555555555555/orders`
- **Payload:**
```json
{
  "session_token": "66666666-7777-8888-9999-000000000000",
  "notes": "Extra spicy",
  "items": [
    { "menu_item_id": "948be380-60b6-455b-9d41-e94916a4c28f", "quantity": 2 }
  ]
}
```
- **Response Code:** `200 OK`
- **Response Body:** `{ "success": true, "order_id": "abfbce43-ca3a-4efb-91c6-200ca2efdd1e", "table_session_id": "b89fe426-edc5-4bfe-a70d-5a21ff4fbc9b" }`
- **Validation:** Server computed total amount `280 * 2 = 560 INR`. Inserted order, order items, and initial event.
- **Failure Case (Settled Bill):** Placing order on session with `payment_status = 'paid'` returns `400 Bad Request` with `{ "session_paid": true, "error": "Bill settled" }`.

---

### 5. `GET /api/r/orders/[orderId]`
- **Request:** `GET /api/r/orders/abfbce43-ca3a-4efb-91c6-200ca2efdd1e?session_token=66666666-7777-8888-9999-000000000000`
- **Response Code:** `200 OK`
- **Response Body:** Returns order status (`placed`), total amount, restaurant info, table info, and line items array.
