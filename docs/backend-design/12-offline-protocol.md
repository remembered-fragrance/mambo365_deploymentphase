# 12. Offline protocol

Giữ lợi ích mạng yếu. **Không** cho offline bỏ qua quyền, tồn, chấp thuận đối tác.

## 12.1 Phân loại

| Loại | Ví dụ | UI |
|---|---|---|
| Đọc cache | listings nearby lần cuối, đơn đã kéo | badge stale nếu `lastSyncedAt` > 15 phút |
| Local draft | nháp phiếu, cân tạm, nháp tin, ảnh chờ, ý định tiền | `local_draft` |
| Cần server | publish, accept giá/đơn, reserve, chốt kho, posted settlement, quyền | `pending_sync` → `accepted` \| `rejected` \| `conflict` |

Pending **không** hiện “đã giao dịch xong”.

## 12.2 Local outbox

IndexedDB partition key: `${userId}:${workspaceId}`. Stores: `books`, `outbox`, `attachments`, `cursors`. **Cấm** queue toàn cục như hiện tại.

Một TX IDB: ghi draft + enqueue command. Envelope:

```ts
type CommandEnvelope = {
  operationId: string; // UUID client, durable
  deviceId: string;
  workspaceId: string;
  userId: string;
  type: string; // allowlist server
  aggregateId: string;
  expectedVersion: number;
  clientCreatedAt: string;
  payload: unknown;
  dependsOn: string[];
};
```

**Cấm** `table` + raw upsert.

## 12.3 Push

`POST /sync/commands` — auth lại, membership **now**, plan entitlement now.

Atomic **từng command**. Dependency fail → `blocked` các lệnh sau trong batch.

Retry: exponential + jitter (1s, 5s, 30s, 5m) như `RETRY_DELAYS_MS` hiện tại; phân biệt retryable (5xx, network) vs không (VALIDATION, PERMISSION, INVALID_STATE).

Idempotent replay: cùng operationId+hash. Cache response 24h; **operation_id unique** vĩnh viễn cho money/stock — hết TTL cache vẫn không ghi sổ 2. Nếu không rebuild response: `200` `{ status: "already_processed" }` không leak field trái quyền hiện tại (re-check ACL trước khi trả body cũ).

## 12.4 Pull / change feed

Cursor = `change_feed.id` bigint (monotonic trong commit TX). **Không** tin `updated_at` client.

An toàn thứ tự: row feed insert **cùng TX** với nghiệp vụ. Client gửi `cursor=N`, server trả `id > N` order by id, `limit`. Replay-overlap: cho phép `id >= N-100` tùy chọn bootstrap. High-water: client lưu max id đã apply.

Tombstone / reversal: `op=delete|reverse` trong feed. Payments không còn kéo `created_at`.

Cursor hết hạn (retention 30 ngày): `SYNC_CURSOR_EXPIRED` → `POST /sync/bootstrap` snapshot theo quyền.

## 12.5 Conflict

| Dữ liệu | Chiến lược |
|---|---|
| Ghi chú không nhạy cảm | merge theo field nếu cả hai dirty, rule “concat + timestamp” |
| Tiền, tồn, status đơn, phê duyệt | **không LWW**; `VERSION_CONFLICT` + projection được phép xem |
| Bản cancelled/deleted | không hồi sinh |

## 12.6 Nhiều user một máy

- Outbox/cache/syncMarks theo `userId`; **attachments** hiện key global `attachmentId` — protocol mới: `attachments/{userId}/{workspaceId}/{id}` hoặc metadata trên blob; **không** `clear('attachments')` toàn store khi xóa một TK (hiện `account.ts` chấp nhận xóa blob user khác trên máy mượn).
- Sign-in: **không** `clearQueue()` im lặng. Hiện tại: `signIn`/`signOut`/`deleteAccount` clear; **`signUp` không clear** — queue rỗng thường OK nhưng cùng máy đăng ký sau khi dùng device book vẫn cần park rõ.
- Nếu pending user A: chặn đăng nhập B hoặc export/queue-park `parked_outboxes` + UI “còn phiếu chưa gửi”.
- Sign-out: park, không xóa mặc định; user chọn xuất file / hủy có confirm.
- Revoke membership: server từ chối ngay khi reconnect. Client khóa book, TTL offline 7 ngày rồi wipe. **Giới hạn:** máy offline hoàn toàn không thu hồi tức thời.

**Local atomicity:** `commit` không gộp book+outbox một IDB transaction — protocol mới bắt buộc khi enqueue command nhạy cảm.

## 12.7 Sửa 6 điểm mã hiện tại

| Hiện trạng | Đích |
|---|---|
| 42501 = hết gói | NestJS trả `PLAN_LIMIT_REACHED` vs `PERMISSION_DENIED` vs `WORKSPACE_ACCESS_REVOKED` |
| `clearQueue` login/logout | partition + park |
| timestamp pull, payment `created_at` | `change_feed.id` gồm reverse |
| nhiều op phiếu+payment | command `legacy.recordReceipt` atomic domain |
| tồn `productName` | lots; legacy view map tên → product_id |
| device account | không gửi command server |

Adapter client cũ: protocol version header; v0 table-upsert chỉ bảng legacy, cutoff date. Không cắt PostgREST write khi còn queue v0 mà không export.
