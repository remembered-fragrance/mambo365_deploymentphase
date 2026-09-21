# 17. Test plan và acceptance A01–A28

Nhãn toàn bộ: **kế hoạch kiểm thử / chưa chạy** (session 18/09/2026 không chạy được vitest vì thiếu `node_modules`). Coverage % **không** kết luận an toàn.

## 17.1 Lớp test

| Lớp | Công cụ | Dữ liệu |
|---|---|---|
| Unit công thức / SM | vitest (port `tests/core/calc.test.ts` sang decimal) | fixtures cao su/trừ bì |
| Integration PG/PostGIS | Testcontainers hoặc supabase local | seed 10k điểm nhỏ cho geo |
| Authz / RLS | SQL + Nest supertest 2 user 2 WS | — |
| OpenAPI contract | schemathesis hoặc dredd nhẹ / tsoa diff | — |
| E2E 3 role | Playwright web | staging |
| Concurrency / idempotency | k6 hoặc jest parallel TX | — |
| Sync 2 device | fake-indexeddb + API | — |
| Migration | dump ẩn danh khi có | count tiền |
| Android | emulator + 1 máy thật | A24 |

SQL constraint tests: child sai WS, revoke, buyer=seller, giá hết hạn, qty âm, sửa revision sau accept, audit immut.

## 17.2 Ma trận nghiệm thu

| Mã | Kịch bản | Kết quả phải chứng minh | Module | Bằng chứng |
|---|---|---|---|---|
| A01 | 3 nhóm đăng ký/đăng nhập | onboarding đúng; client không set platform_admin | identity, workspaces | E2E |
| A02 | 1 người 2 WS | header giả không đọc/ghi chéo | access | integration |
| A03 | DN A xem đơn với B | thấy terms chung; không cost/notes/đơn khác B | orders | e2e+authz |
| A04 | Nearby | hàng, bán kính, published, giờ, giá còn hạn | locations | geo integration |
| A05 | Từ chối GPS / map lỗi | nhập địa điểm + list | locations | e2e |
| A06 | Hai accept phần cuối | một thành công; không âm tồn/oversell | farms, inventory | concurrency |
| A07 | Replay tạo đơn/tiền/nhận sau hết TTL cache | một tác động; unique operation_id | orders, settlements | integration |
| A08 | Cùng key khác payload | 409 IDEMPOTENCY_KEY_REUSED | common | unit |
| A09 | Nhận 600/1000 | kho +600; 400 mở | receiving | integration |
| A10 | Cao su/trừ bì/hao hụt | tiền dùng net; kho dùng physical; round nghìn | receiving, inventory | unit+int |
| A11 | 20tr, trả 8 rồi 7; đảo 7 | còn 5 rồi 12; lịch sử | settlements | integration |
| A12 | Buyer declared chưa confirm | UI/API `buyer_declared_not_reconciled` | settlements | e2e |
| A13 | Hai allocate | không vượt | settlements | concurrency |
| A14 | Hai device cùng revision đơn | một VERSION_CONFLICT | orders, sync | sync test |
| A15 | Mất điện giữa IDB và send | outbox phục hồi; retry không nhân | sync | e2e device |
| A16 | Đổi TK còn pending | không mất im lặng; không gửi user B | sync | e2e |
| A17 | Revoke khi offline | reconnect 403/WORKSPACE_ACCESS_REVOKED | access, sync | integration |
| A18 | Reversal/tombstone | device 2 nhận; không hồi sinh | sync | integration |
| A19 | JWT còn hạn, membership revoked | không chốt tiền/kho | access | integration |
| A20 | Xóa NV/owner | bàn giao; không xóa chứng từ đối tác | identity | e2e |
| A21 | File WS khác | 404; URL hết hạn không cấp lại | files | authz |
| A22 | Migration cũ | count phiếu, tổng, payments, nợ, snapshot | migration | dry-run |
| A23 | Worker chết sau commit trước push | nghiệp vụ nguyên; outbox retry | notifications | chaos |
| A24 | Kill Android, update, deep link | phiên/pending; ACL link | android | device |
| A25 | Gọi REST/RPC cũ | không ghi bảng mới / command trái quyền | grants | SQL |
| A26 | Xóa từ web công khai | auth đúng; status request | identity | e2e |
| A27 | Hết gói | PLAN_LIMIT_REACHED ≠ revoke; không mất data | billing | e2e |
| A28 | Restore backup | runbook; replay deletion | ops | drill |
| — | Webhook billing | ledger + subscription active ⇒ intent `paid`; intent update fail ⇒ 500/reconcile | billing | integration (bổ sung từ audit webhook) |

## 17.3 Định nghĩa “đạt”

Chỉ khi có log/test output. Trước đó: chưa chạy.
