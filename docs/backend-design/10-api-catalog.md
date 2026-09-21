# 10. API catalog và OpenAPI

- Base: `https://api.<domain>/api/v1`
- OpenAPI **3.0.3** sinh từ `@nestjs/swagger` (toolchain Nest 11 thực tế emit 3.0, không phải 3.1). Nguồn: [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction).
- Auth: `Authorization: Bearer <supabase_access_token>`
- Workspace: header `X-Workspace-Id` (UUID) — server check membership mỗi request.
- Idempotency: header `Idempotency-Key` (UUID) trên POST nhạy cảm. Scope: `(workspaceId, actorId, route, key)`. TTL response cache **24h**. Duplicate cùng payload → 200 cũ. Khác payload → `409 IDEMPOTENCY_KEY_REUSED`. Lệnh tiền/kho thêm `operationId` trong body, unique DB **không TTL**.
- Concurrency: `If-Match: "<version>"` hoặc body `expectedVersion`.
- Pagination: cursor `{"id":"...","sort":"..."}` opaque; `limit` mặc định 20, max 100; nearby max radius 50km, bbox span max 2 độ.
- Cache: GET public locations `Cache-Control: public, max-age=30`; GET đơn `private, no-store`.
- Lỗi:

```json
{
  "requestId": "01J...",
  "code": "VALIDATION_FAILED",
  "message": "Khối lượng không hợp lệ.",
  "fieldErrors": [{ "field": "qty", "code": "min", "message": "Phải lớn hơn 0." }]
}
```

Codes: `UNAUTHENTICATED`, `PERMISSION_DENIED`, `WORKSPACE_ACCESS_REVOKED`, `VALIDATION_FAILED`, `VERSION_CONFLICT`, `INVALID_STATE_TRANSITION`, `QUOTE_EXPIRED`, `INSUFFICIENT_STOCK`, `IDEMPOTENCY_KEY_REUSED`, `PLAN_LIMIT_REACHED`, `RATE_LIMITED`, `SYNC_CURSOR_EXPIRED`.  
Object không được biết tồn tại: **404** (không 403) với `code: PERMISSION_DENIED` chỉ khi đã biết resource trong scope nhưng thiếu action. Sync: không nhúng payload trái quyền.

Tương thích Android: `X-App-Version`; min supported tăng kèm deprecation 90 ngày; `/health/capabilities` liệt kê flags. V1 ổn định P0; breaking → `/api/v2`.

Thao tác **đi thẳng Supabase Auth** (không NestJS): `signInWithPassword`, `signUp`, `updateUser({password})`, `signOut`, `refreshSession`. NestJS: onboarding profile/workspace, devices, xóa TK (sau re-auth).

## 10.1 Endpoints P0 (use case, không raw CRUD)

### Session
- `GET /me`
- `POST /me/onboarding` (idempotent, reconcile Auth user)
- `PATCH /me`
- `GET /me/workspaces`
- `POST /me/workspaces/:id/select` (server ghi last workspace; **mọi** request sau vẫn check membership)
- `GET|POST /me/devices` ; `POST /me/devices/:id/revoke` ; `POST /me/sessions/revoke-all`
- Đổi mật khẩu / quên mật khẩu / refresh: **Supabase Auth** (`updateUser`, `resetPasswordForEmail`, refresh). NestJS không nhận password plaintext trừ re-auth `POST /me/reauthenticate` trước đảo tiền/xóa TK/đổi owner
- `POST /me/phone/change-requests` + verify (P0.1 OTP; P0 mặc định cờ unverified, không SMS bắt buộc — giả định §3)
- `POST /me/email/change-requests` + verify qua Auth
- Khôi phục: magic link/email recovery Auth; tài khoản `disabled` do admin không self-serve

### Workspace
- `POST /workspaces`
- `GET /workspaces/:id`
- `POST /workspaces/:id/invitations`
- `POST /invitations/:token/accept`
- `POST /memberships/:id/revoke`
- `POST /workspaces/:id/transfer-owner`

### Farms
- `GET|POST /farms`, `PATCH /farms/:id`
- `GET|POST /farms/:id/lots`

### Map
- `GET /locations/nearby?lat&lng&radiusM&commodityId&limit`
- `GET /locations/in-bounds?minLat&minLng&maxLat&maxLng&zoom`
- `GET /locations/:id` (public projection)
- `POST /locations`, `POST /locations/:id/submit-review`
- `POST /locations/:id/claim` (tranh chấp sở hữu)

### Giá / tin
- `GET|POST /locations/:id/price-quotes`
- `POST /listings`, `POST /listings/:id/publish|pause|close`
- `POST /buy-requests` + publish/pause/close
- `POST /locations/:id/follow` `DELETE .../follow`

### Quotations
- `POST /quotations` (draft)
- `POST /quotations/:id/send`
- `POST /quotations/:id/counter`
- `POST /quotations/:id/accept` body `{ revisionId, expectedVersion }`
- `POST /quotations/:id/reject|withdraw`

### Orders
- `GET /orders?role=buyer|seller`
- `GET /orders/:id`
- `POST /orders/:id/confirm`
- `POST /orders/:id/cancel`
- `POST /orders/:id/request-change`

### Appointments
- `POST /appointments`
- `POST /appointments/:id/confirm|reschedule|check-in|complete|cancel`

### Receiving
- `POST /orders/:id/fulfillments`
- `POST /fulfillments/:id/weigh`
- `POST /fulfillments/:id/quality-checks`
- `POST /fulfillments/:id/accept`
- `POST /fulfillments/:id/reject`

### Inventory
- `GET /inventory/availability`
- `GET /inventory/lots`
- `POST /inventory/reservations` (thường server-side)
- `POST /inventory/movements` (adjust có quyền; receive qua accept)

### Money
- `POST /settlements` (declare/record)
- `POST /settlements/:id/confirm`
- `POST /settlements/:id/reject`
- `POST /settlements/:id/allocate`
- `POST /settlements/:id/reverse`
- `GET /debts?filter=due|overdue`

### Approvals
- `POST /approvals/:id/submit|approve|reject|revoke`

### Files
- `POST /files/upload-sessions` → PUT signed
- `POST /files/:id/finalize`
- `POST /files/:id/links`
- `GET /files/:id/url` (short TTL)

### Notifications
- `GET /notifications` `POST /notifications/:id/read`
- `PATCH /notification-preferences`
- `POST|DELETE /push-registrations`

### Sync
- `POST /sync/commands`
- `GET /sync/changes?cursor&limit`
- `POST /sync/bootstrap`

### Account / admin / ops
- `POST /account/deletion-requests` `GET .../:id`
- `POST /account/export`
- Admin: review location, reports, disputes, lock, audit, export
- `GET /health/live` `GET /health/ready` `GET /health/version`
- Metrics: **không** public; scrape auth

## 10.2 Mapping màn hình hiện tại / mới

| Màn hiện có | API mới / giữ |
|---|---|
| `/tao-phieu` sổ riêng | P0: vẫn PostgREST `transactions` **hoặc** `POST /legacy/receipts` adapter; P0.2 chuyển command `recordLegacyReceipt` |
| `/nong-ho` `/nguoi-mua` | `contacts` |
| `/ton-kho` | `GET /inventory/*` + legacy aggregation đến khi map lot |
| `/cong-no` | `GET /debts` + entries |
| `/goi-dich-vu` | `/billing` — Android xem §14 |
| Mới: bản đồ | nearby/in-bounds |
| Mới: tin/báo giá/đơn | listings, quotations, orders |
| Mới: lịch | appointments |

Không viết lại UI toàn bộ.

## 10.3 Sáu ví dụ JSON

Decimal là **string**. Mẫu **chưa chạy**.

### A. Nearby — thành công

`GET /api/v1/locations/nearby?lat=10.762622&lng=106.660172&radiusM=5000&commodityId=...&limit=20`

```json
{
  "items": [
    {
      "id": "8b1c4f7a-1111-4111-8111-aaaaaaaaaaa1",
      "name": "Vựa mủ Bình Phước",
      "distanceM": 1234,
      "distanceKind": "straight_line",
      "commodity": { "id": "...", "name": "Mủ nước" },
      "currentPrice": { "amount": "32000", "currency": "VND", "unit": "kg", "kind": "reference", "validTo": "2026-09-19T17:00:00.000Z", "lastUpdatedAt": "2026-09-18T10:00:00.000Z" },
      "openNow": true,
      "pickupAvailable": true
    }
  ],
  "nextCursor": null
}
```

`distanceKind: straight_line` — **không** ghi là km đường đi.

### A'. Nearby — lỗi GPS từ chối phía client vẫn gọi được bằng geocode

Client không gửi lat/lng → `400 VALIDATION_FAILED`. Client gửi bbox từ địa chỉ đã chọn:

`GET /locations/in-bounds?...`  
Provider maps down:

```json
{
  "requestId": "01J9ERROR1",
  "code": "VALIDATION_FAILED",
  "message": "Bản đồ tạm gián đoạn. Dùng danh sách theo tên/địa chỉ.",
  "fieldErrors": []
}
```

HTTP 200 với `items` từ text search vẫn ưu tiên hơn 503 nếu search DB sống. 503 chỉ khi DB geo lỗi.

### B. Tạo tin bán

`POST /listings` + `POST /listings/:id/publish`

```json
{
  "farmId": "8b1c4f7a-2222-4222-8222-aaaaaaaaaaa2",
  "harvestLotId": "8b1c4f7a-3333-4333-8333-aaaaaaaaaaa3",
  "commodityId": "8b1c4f7a-4444-4444-8444-aaaaaaaaaaa4",
  "qty": "1200.000",
  "unit": "kg",
  "desiredPrice": "31000",
  "negotiable": true,
  "windowStart": "2026-09-20T00:00:00.000Z",
  "windowEnd": "2026-09-27T00:00:00.000Z",
  "deliveryMode": "either",
  "expectedVersion": 1
}
```

Lỗi oversell:

```json
{ "requestId": "01J9QTY", "code": "INSUFFICIENT_STOCK", "message": "Lô không đủ sản lượng khả dụng." }
```

### C. Chấp nhận báo giá

`POST /quotations/8b1c.../accept`  
Headers: `Idempotency-Key`, `X-Workspace-Id`, `If-Match: "3"`

```json
{ "revisionId": "8b1c4f7a-5555-4555-8555-aaaaaaaaaaa5", "expectedVersion": 3 }
```

Thành công `200`:

```json
{
  "orderId": "8b1c4f7a-6666-4666-8666-aaaaaaaaaaa6",
  "status": "confirmed",
  "version": 1,
  "reservation": { "qty": "1200.000", "expiresAt": "2026-09-20T10:00:00.000Z" }
}
```

Hết hạn: `409 QUOTE_EXPIRED`. Revision cũ: `409 VERSION_CONFLICT`.

### D. Nhận 600 kg / đơn 1000 kg

`POST /fulfillments/:id/accept`

```json
{
  "acceptedQty": "600.000",
  "rejectedQty": "0.000",
  "weighingId": "8b1c4f7a-7777-4777-8777-aaaaaaaaaaa7",
  "qualityCheckId": "8b1c4f7a-8888-4888-8888-aaaaaaaaaaa8",
  "expectedVersion": 2
}
```

Kho chỉ +600 physical theo QC; đơn `in_fulfillment`, remaining 400 mở.  
Lỗi chưa weigh: `INVALID_STATE_TRANSITION`.

### E. Ghi tiền 8 triệu rồi 7 triệu trên 20 triệu; phân bổ

`POST /settlements`

```json
{
  "operationId": "8b1c4f7a-9999-4999-8999-aaaaaaaaaaa9",
  "amount": "8000000",
  "direction": "out",
  "orderId": "8b1c4f7a-6666-4666-8666-aaaaaaaaaaa6",
  "kind": "declared"
}
```

Sau confirm + allocate, remaining 12tr rồi 5tr. Reverse 7tr → remaining 12tr, lịch sử reversal.  
Hai allocate vượt: một `200`, một `409 INSUFFICIENT_STOCK` **không** — dùng `VALIDATION_FAILED` field `amount` hoặc code riêng: chốt `VALIDATION_FAILED` + message “Vượt số tiền khả dụng.” (tránh nhầm kho). Optional future `INSUFFICIENT_FUNDS` — **không thêm code ngoài danh sách prompt**; dùng `VALIDATION_FAILED`.

Khai chuyển chưa confirm:

```json
{
  "id": "...",
  "status": "declared",
  "confirmations": [],
  "display": "buyer_declared_not_reconciled"
}
```

### F. Sync batch — một lệnh conflict

`POST /sync/commands`

```json
{
  "deviceId": "dev-android-1",
  "workspaceId": "8b1c4f7a-aaaa-4aaa-8aaa-aaaaaaaaaa10",
  "commands": [
    {
      "operationId": "op-1",
      "type": "listing.createDraft",
      "aggregateId": "lst-1",
      "expectedVersion": 0,
      "clientCreatedAt": "2026-09-18T11:00:00.000Z",
      "payload": { "qty": "100.000", "commodityId": "..." }
    },
    {
      "operationId": "op-2",
      "dependsOn": ["op-1"],
      "type": "order.confirm",
      "aggregateId": "8b1c4f7a-6666-4666-8666-aaaaaaaaaaa6",
      "expectedVersion": 1,
      "payload": {}
    }
  ]
}
```

Response:

```json
{
  "results": [
    { "operationId": "op-1", "status": "accepted", "version": 1 },
    {
      "operationId": "op-2",
      "status": "conflict",
      "code": "VERSION_CONFLICT",
      "server": { "version": 4, "status": "cancelled" }
    }
  ]
}
```

`op-2` không LWW. Dependency fail → `blocked` (nếu op-1 reject). Replay cùng `operationId` + payload: `accepted` cũ. Payload khác: `IDEMPOTENCY_KEY_REUSED`.

Batch: **atomic theo command**, không all-or-nothing batch (tránh kẹt cả nháp vì 1 conflict). Client không đoán.

## 10.4 Mẫu OpenAPI một luồng

Xem [samples/openapi-accept-quote.yaml](samples/openapi-accept-quote.yaml) — **chưa chạy**.
