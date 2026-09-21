# 13. Bảo mật, quyền riêng tư, vòng đời dữ liệu

## 13.1 Threat model (luồng thật)

| Đe dọa | Kịch bản | Biện pháp |
|---|---|---|
| Đánh cắp phiên | XSS đọc localStorage JWT | CSP, không token trên URL, Android keystore; P0.1 cookie httpOnly nếu web |
| Cross-tenant | đổi workspace_id / IDOR | guard + RLS SET LOCAL + composite FK |
| Mạo danh điểm | publish tọa độ giả | pending_review, report, verified badge tách |
| Spam OTP | nếu bật SMS | rate limit IP+phone, cooldown, không log OTP |
| Sửa tiền/đơn | mass assign status | command + state machine + decimal server |
| Replay command | retry offline | operation_id unique |
| Upload độc hại | SVG/script, zip bomb | mime allowlist jpeg/png/webp (+pdf P0 chứng từ), size, sniff magic bytes, strip EXIF, không serve SVG |
| Lộ Storage | path `{userId}` đoán | key random; signed URL NestJS TTL 60s; A21 |
| Rò export/log/push | PII | scrub; push body không tiền/SĐT/địa chỉ nhà |
| Nhân viên bị thu hồi | JWT còn hạn | membership check mỗi command, cache ≤30s |
| SECURITY DEFINER | `resolve_identifier`, `has_active_sync`, `delete_own_account` | review search_path=public, grant execute, test; `delete_own_account` **thay** trước data chung |

RLS test: `supabase/checks/rls-coverage.sql` mở rộng bảng mới, views `security_invoker`, Storage, Realtime **nếu** bật (P0 mặc định **tắt Realtime** cho bảng tiền). Tham chiếu [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). `service_role` ≠ request user.

DTO class-validator allowlist. SQL parameterized (Drizzle). CORS origin allowlist. CSRF nếu cookie. SSRF: cấm fetch URL user-supplied không allowlist. Rate limit: login, OTP, nearby, sync. Payload max 512KB JSON, ảnh 5MB.

TLS everywhere. Secrets: GitHub/Fly secrets, không `.env.example` service_role (file hiện comment đúng). Rotate webhook `PAYMENT_WEBHOOK_SECRET`. Audit không GRANT update.

## 13.2 Phân loại dữ liệu

| Nhóm | Class | Ví dụ |
|---|---|---|
| Public | public | điểm published, giá còn hạn |
| Internal | internal | giá vốn, notes, cost |
| Restricted | restricted | SĐT nhà, farm exact geo, giấy tờ xác minh, bank |
| Billing software | restricted | payment_intents, bank_transactions |

Thu thập tối thiểu. CCCD chỉ khi verification_case org có mục đích, người xem moderator, retention 90 ngày sau resolve rồi xóa Storage.

## 13.3 Xóa tài khoản — tách năm việc

| Hành động | Hiệu ứng |
|---|---|
| Rời tổ chức | membership revoked; chứng từ WS giữ |
| Chuyển owner | bắt buộc trước khi owner xóa |
| Đóng workspace | ẩn public; giữ chứng từ đối tác theo retention |
| Xóa danh tính | anonymize profile, revoke sessions/devices, xóa Auth user **sau** job |
| Chứng từ đã chia sẻ | giữ theo nghĩa vụ; đối tác vẫn thấy đơn; PII cá nhân ẩn |

**Thay `delete_own_account()`** trước khi FK tổ chức phụ thuộc cascade. Hiện: `delete from auth.users` kéo phiếu. Mới: `deletion_requests` (re-auth, status pending|processing|done|rejected, deadline 30 ngày), worker: storage cleanup, park outbox, **không** xóa `trade_orders` / `bank_transactions`.

Không trì hoãn vô hạn vì còn nợ: đóng WS + đánh dấu nợ, vẫn xử lý xóa danh tính. Backup: không hứa xóa tức thì; PITR retention N ngày; restore phải replay deletion_requests.

Trang web công khai: form tạo request **sau** xác thực (magic link email/phone), A26. Không cho người lạ xóa. Play: [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

Pháp lý VN: **giả định A-LEGAL** — luật sư xác nhận thời hạn hóa đơn/chứng từ trước khi chốt retention; không kết luận trong hồ sơ này.

## 13.4 File

Upload session NestJS: MIME, size, path server. pending → worker virus/magic → ready. Private bucket. Quyền upload và viewer trên `file_links`. Orphan GC worker retry.

## 13.5 Thông báo

Events: quote mới/sắp hết, lịch, kết quả nhận, nợ đến hạn, tin điểm follow, duyệt điểm. Inbox = source of truth. Push/email adapter. Dedup `dedup_key`. Quiet hours. Unsubscribe theo loại. A23: worker chết sau commit → outbox còn, không double ledger.

## 13.6 Quản trị / UGC

Duyệt hồ sơ/điểm, report, khóa tạm, restore theo quyền, sync stuck, dead letter, export, transfer owner. Mọi thao tác tiền/quyền: `reason` + audit. **Cấm** impersonation toàn quyền.

Report/block/rate-limit tin+ảnh. Verified phone ≠ verified org ≠ uy tín giao dịch — ba huy hiệu tách.
