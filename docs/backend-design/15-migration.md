# 15. Migration plan

Ưu tiên tương thích rồi cắt từng luồng. **Không dọn/ẩn danh dữ liệu vận hành trong lượt thiết kế này.** Dry-run ẩn danh là việc **khi triển khai** (hàng 14), không chặn hồ sơ.

## 15.1 Bảng hiện trạng → đích

| Hiện trạng | Đích | Migration | Kiểm tra | Rollback |
|---|---|---|---|---|
| `profiles` 1 user = 1 vựa | profile + trader workspace + membership owner | backfill SQL: 1 WS/user, `legacy_user_id` | count users = count trader WS | drop WS mới, giữ profiles |
| `suppliers`/`buyers` | `contacts` | copy row, `legacy_id` | count + spot phone | giữ bảng cũ đọc |
| `transactions`/`payments` | **giữ** ledger riêng; không thành `trade_orders` confirmed | view `legacy_receipts`; optional `receivable_payable_entries` từ debt | sum(payments), count phiếu | tắt backfill entries |
| `products` | `workspace_products` | map id, giữ `formula_type` | inventory by name vs id lệch **báo cáo**, không bịa lot | dual-read |
| `drafts` | local + `listings` draft chỉ khi user publish marketplace | không auto | — | — |
| `pricing_rules` | giữ WS; snapshot trên phiếu đã chốt | copy | calc test | — |
| Storage `{userId}/` | `files/{fileId}` | copy object, `file_links` | A21 | giữ bucket cũ đọc |
| `subscriptions` per user | per trader workspace | add `workspace_id` | entitlement | — |
| `delete_own_account` | deletion_requests worker | deploy hàm mới **trước** FK org | A20 | restore hàm cũ chỉ staging |
| Webhook billing | NestJS billing apply 1 TX | dual-run ngắn | bank_tx unique | feature flag |
| Queue v0 table upsert | command envelope | adapter cutoff | A15–A16 | giữ PostgREST write legacy |

## 15.2 Thứ tự

1. Kiểm kê schema đã apply (staging `supabase db diff`) — **không** in secret. Env mẫu `.env.example` chỉ anon.
2. ADR-001 giữ Postgres.
3. Backfill workspace trader; giữ UUID user/phiếu.
4. Map contacts; **không** tạo TK nông dân/DN; **không** auto-invite; **không** đưa danh bạ lên map.
5. Phiếu cũ ≠ giao dịch hai bên.
6. JSONB lines: giữ snapshot; nếu normalize bảng dòng — so tiền/kg trước sau; **không** hồi tố công thức mới.
7. Tồn tên → product_id + **số dư đầu kỳ lot di sản** `origin=legacy_opening`. Không bịa provenance.
8. Feature flags: read API mới → command API; một đường ghi chính. Dual-write: owner, hạn 30 ngày, dedup, job reconcile — không lâu dài.
9. Client cũ: `X-Protocol: 0`; pending ops export. Không cắt write Supabase khi còn hàng đợi.
10. Storage path mới; không public bucket để “sửa quyền”.
11. Thay 0010 cascade.
12. Entitlement: farmer đối tác không dính chặn sync trader. Hết gói: đọc+export được; pending không mất.
13. Webhook: một TX ledger+entitlement+`payment_intents.paid`; assert error trên cả 3 bước (sửa lỗi hiện tại: subscription OK nhưng intent vẫn `pending`); không dùng cho nông sản.
14. Dry-run DB mẫu ẩn danh **khi có bản dump** (ngoài scope dọn data hiện tại) → checkpoint → đối chiếu count phiếu/tiền/nợ/file → pilot. Backup **thử restore**, không chỉ file tồn tại.

## 15.3 Frontend bị ảnh hưởng

`src/data/sync.ts`, `store.tsx`, `queue.ts`, `pullChanges.ts`, `auth.ts`, `billing.ts`, `inventory.ts`, types, routes mới map/listings. Tái sử dụng `core/calc`, `core/pricing`, export Excel/PDF. Không rewrite UI sổ.

## 15.4 Cutover / rollback

Cờ `NEST_ORDERS=on` per workspace. Rollback: tắt cờ, client về PostgREST legacy; feed ngừng; **không** down-migration phá dữ liệu mới (expand/contract).
