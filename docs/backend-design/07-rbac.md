# 7. RBAC / ABAC matrix

Quyền **luôn** kiểm trên server tại thời điểm thực thi. Ẩn nút UI không đủ. Membership đọc từ DB, không từ header/body.

Ký hiệu: P = public đã duyệt; M = membership workspace; S = scope chi nhánh/kho; T = participant đơn; F = field allowlist; A = platform role.

## 7.1 Vai trò workspace

| Role | Ý |
|---|---|
| owner | toàn quyền WS, không tự hạ mình nếu là owner cuối |
| manager | vận hành, không xóa WS, không đổi billing legal |
| procurement | mua, báo giá mua, nhận hàng theo scope |
| sales | bán, tin, báo giá bán |
| warehouse | cân, QC, movement, reservation tại kho được gán |
| accountant | settlements, export tài chính, không đổi giá đơn |
| viewer | đọc non-sensitive |

Platform: `platform_admin`, `support` (break-glass có `reason` + `admin_access_log`/`audit_events`), `moderator` (UGC/điểm).

## 7.2 Ma trận P0

| Tài nguyên / hành động | Điều kiện | Field được xem | Cho phép | Chặn |
|---|---|---|---|---|
| Xem điểm published | P; status=published; không suspended | public projection: tên, địa chỉ KD, geog, giờ, giá còn hạn, hàng nhận, liên hệ KD | khách, mọi role | `internal_notes`, cost, owner PII nhà riêng |
| Tạo/sửa điểm draft | M owner/manager/sales + S | full nội bộ | staff điểm | viewer; WS khác |
| Submit publish | M + điểm thuộc WS | — | owner/manager | sales nếu policy WS tắt |
| Duyệt điểm | A moderator/admin | hồ sơ + báo cáo | moderator | tự duyệt điểm mình (cùng actor) — moderator khác hoặc admin |
| Quản lý farm/listing | M farm WS owner/sales | geo farm **private** mặc định | chủ hộ | trader lạ; public map |
| Xem đơn | T | shared: lines chốt, qty, appointments, fulfillments accepted | hai bên | cost, margin, `internal_notes`, đơn khác của đối tác, giá nhập trước |
| Sửa giá/qty đơn confirmed | T + revision + chấp nhận bên kia | — | đúng quyền procurement/sales | “có tham gia” ≠ sửa hết; mass assign `unit_price` |
| Accept quotation | đúng party, đúng `revision_id`, status=sent/countered, chưa hết hạn | — | procurement (mua) / sales hoặc farmer owner (bán) | revision cũ; expired |
| Nhận hàng/cân/QC | M warehouse + S location/warehouse của fulfillment | cân, QC | warehouse | accountant-only; location khác |
| Ghi/đảo tiền | M accountant\|owner | ledger | accountant | sales tự `paid=true`; client set status |
| Duyệt vượt hạn mức | approver ≠ creator trừ owner-under-own-limit | — | manager/owner theo `approval_requests` | tự nâng `limit`; đổi approver |
| Export | M + permission export + S | theo field ACL | accountant/owner/manager | viewer export giá vốn |
| Support đọc hồ sơ | A support + ticket + TTL + audit | theo grant tạm | support | mặc định thấy all; impersonation vô hạn |
| Đổi workspace / deep link | mỗi request: membership còn hiệu lực | — | member | header `workspace_id` giả; JWT cũ sau revoke |
| Follow điểm | user login | — | bất kỳ user | follow ≠ quyền xem internal |
| Đọc giá vốn tồn | M accountant\|owner\|manager | avg cost | nội bộ | participant đơn |
| File chứng từ đơn | T hoặc M nội bộ tùy link | bytes qua signed URL | đúng ACL | đoán path Storage; URL hết hạn tái cấp trái quyền |
| Sync command | M tại **thời điểm xử lý** | — | member | replay command user A bằng session B |

## 7.3 Chống lỗ điển hình

| Tấn công | Kiểm soát |
|---|---|
| BOLA/IDOR | UUID không chứng minh sở hữu; query theo membership/participant |
| Đổi `workspace_id` | lấy từ header `X-Workspace-Id` **đã** check membership; child FK composite |
| Gắn child parent WS khác | `UNIQUE (id, workspace_id)` + FK `(parent_id, workspace_id)` |
| Mass assignment | DTO allowlist; cấm `status`, `paid`, `role`, `price_approved` từ client |
| Self-elevation | không có API `PUT /me/role`; invite chỉ role < caller (owner mới gán owner khi transfer) |
| File URL đoán | bucket private; path `files/{fileId}` không = userId; NestJS ký |
| JWT còn hạn sau revoke | `memberships.revoked_at` check mỗi command; cache max 30s |

## 7.4 Field ACL trên `trade_orders`

| Field | Seller WS | Buyer WS | Public |
|---|---|---|---|
| `agreed_unit_price`, qty, commodity, grade, incoterm-like terms | có | có | không |
| `seller_cost`, margin | seller accountant+ | không | không |
| `internal_notes` từng WS | chỉ WS đó | chỉ WS đó | không |
| Contact phone giao nhận | sau confirmed | sau confirmed | không |
| Farm exact geog | không mặc định | chỉ khi seller share fulfillment | không |

## 7.5 Entitlement gói phần mềm ≠ membership

Trader hết gói: **không** mất dữ liệu; chặn **publish** điểm/tin và **sync command ghi sổ** theo policy (tương đương `has_active_sync` nhưng mã lỗi `PLAN_LIMIT_REACHED`). Farmer/enterprise đối tác **vẫn đọc đơn** mình tham gia. A27.
