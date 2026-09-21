# 19. Truy vết P0: yêu cầu → module → bảng → API → quyền → test

Mọi hàng P0 phải đủ 6 cột. Mâu thuẫn ERD/API/SM đã xử lý: một đơn chung; tiền không `PATCH status`; nearby không dump quốc gia; listing status tách order.

| Yêu cầu P0 | Module | Bảng | API | Quyền | Test |
|---|---|---|---|---|---|
| Đăng ký/đăng nhập 3 nhóm | identity | profiles, identity_verifications | Auth + `POST /me/onboarding` | bản thân; cấm platform role | A01 |
| Verified/unverified | identity | identity_verifications | `/me` flags | — | A01 |
| Workspace + invite | workspaces, access | workspaces, memberships, invitations, roles, permissions, membership_scopes | `/workspaces`, invitations | owner/manager invite | A02 A17 A19 |
| Hồ sơ farmer | farms, identity | farmer_profiles, farms | `/farms` | farm WS | A01 |
| Hồ sơ trader | workspaces | trader_profiles | `/me/onboarding` | owner | A01 A22 |
| Hồ sơ enterprise + chi nhánh | workspaces | enterprise_profiles, branches | `/workspaces` | owner | A01 A02 |
| Điểm thu mua + publish | locations, moderation | locations, location_hours, procurement_capabilities, price_quotes | `/locations*` | staff vs moderator | A04 |
| Nearby / bbox / no GPS | locations | locations | nearby, in-bounds, search | public published | A04 A05 |
| Follow điểm | marketplace | follows | follow | login | — (unit) |
| Tin bán | marketplace, farms | sell_listings, harvest_lots | `/listings` | owner farm | A06 |
| Nhu cầu mua | marketplace | buy_requests | `/buy-requests` | procurement/sales | A03 |
| Báo giá revision | quotations | quotations, quotation_revisions, quotation_lines | send/counter/accept | đúng bên + revision | A06 A08 |
| Đơn chung 2 bên | orders | trade_orders, order_lines, order_participants, order_events, workspace_order_views, internal_notes | `/orders` | T + field ACL | A03 A14 |
| Duyệt 1 bước | orders | approval_requests, approval_actions | `/approvals` | approver ≠ creator trừ owner-limit | A03 |
| Lịch hẹn | appointments | appointments | `/appointments*` | participant | — e2e mốc 3 |
| Nhận/cân/QC/nhận 1 phần | receiving | fulfillments, weighing_records, quality_checks, acceptance_records | `/fulfillments*` | warehouse + scope | A09 A10 |
| Kho lô + giữ | inventory | warehouses, inventory_lots, stock_movements, stock_reservations | `/inventory*` | warehouse | A06 A09 |
| Tiền/công nợ | settlements | settlements, allocations, RP entries, confirmations, reversals | `/settlements*`, `/debts` | accountant/owner | A11 A12 A13 |
| Thông báo | notifications | inbox, preferences, push_registrations | `/notifications*` | chủ | A23 |
| File | files | files, file_links | upload-sessions, url | resource ACL | A21 |
| Sync offline | sync | change_feed, idempotency_records, idempotent_operations, sync_operations | `/sync/*` | membership now | A07 A08 A14–A18 |
| Audit | audit | audit_events, outbox_events | admin audit | platform | A23 |
| Admin duyệt/report/dispute | moderation | verification_cases, reports, disputes, moderation_actions | `/admin/*` | platform_* | — |
| Billing phần mềm | billing | plans, subscriptions, entitlements, billing_events | `/billing` | trader owner | A27 |
| Xóa TK / Play | identity | deletion_requests, devices | `/account/deletion-requests` | re-auth | A20 A26 |
| Sổ riêng legacy | (adapter) | transactions, payments, contacts | legacy receipts + contacts | WS owner | A22 A16 |
| Catalog/công thức | catalog | commodities, grades, units, workspace_products | `/catalog` | viewer+ | A10 |
| Reports/export | reports | (read models) | `/reports` | export ACL | A03 field |
| Health | — | — | `/health/*` | public live; ready internal | smoke |
| Android/deep link | files, orders | — | App Links → GET resource | A24 | A24 |
| A25 chặn PostgREST | access | GRANT/RLS | n/a | mambo_app vs authenticated | A25 |
| Restore | ops | backups | runbook | platform | A28 |

## Mâu thuẫn đã đóng

- ERD không có hai bảng order đối xứng; API `GET /orders?role=` chỉ **lọc chiếu**, cùng `trade_orders`.
- SM money tách khỏi order.status; API không `PATCH {paid}`.
- `has_active_sync` không áp farmer đọc đơn (A27).
- `delete_own_account` cascade mâu thuẫn A20 → thay trước cutover.
- Inventory JSON name vs lots: P0 lots + view legacy tên.

P0 khép: không còn yêu cầu P0 thiếu hàng.
