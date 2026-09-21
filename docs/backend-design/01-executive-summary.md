# 1. Executive summary

THUMUA365 hiện là sổ thu mua/bán **một phía** cho thương lái: React/Vite/PWA, IndexedDB, hàng đợi, Supabase Auth + PostgreSQL + RLS theo `user_id`, gói phần mềm qua QR/webhook. Frontend đã có mua **và** bán, nhưng đối tác (`suppliers`/`buyers`) **không phải tài khoản đăng nhập**. Không có NestJS, không có workspace, không có nông dân/doanh nghiệp như chủ thể hệ thống, không có bản đồ/PostGIS, không có đơn thương mại hai bên, không có Capacitor.

Phiên bản backend P0 biến sản phẩm thành **sàn kết nối giao dịch nông sản** dùng chung cho web và Android, trong khi **giữ sổ riêng** của thương lái đang chạy.

## Phạm vi P0 (đã chốt)

Ba nhóm đăng nhập: nông dân, thương lái/chủ vựa/đại lý, doanh nghiệp (mua **và** bán). Mỗi người có hồ sơ + workspace + membership. MVP: đăng tin / nhu cầu, báo giá, xác nhận đơn, đặt lịch, cân/kiểm phẩm, nhận từng phần, kho theo lô tối thiểu, ghi nhận thanh toán thủ công, công nợ, thông báo, quản trị, nhật ký, chuyển đổi dữ liệu cũ, web + Android thử nghiệm.

**Không** thuộc P0: cổng thanh toán nông sản, ví, escrow, GPS nền, logistics bên thứ ba, trả hàng đầy đủ sau nhận, tuổi nợ nâng cao, chat, ERP/hóa đơn điện tử.

## Hướng kiến trúc đã chọn

```
Web/PWA + Android (Capacitor)
        │ HTTPS /api/v1
        ▼
NestJS modular monolith  ──verify JWT──► Supabase Auth
        │ SET LOCAL actor/workspace
        ▼
PostgreSQL + PostGIS (cùng project Supabase hiện có)
        │
        ├── Storage (ảnh/chứng từ private, signed URL)
        ├── Outbox + worker (thông báo, export, cleanup)
        └── Adapter: bản đồ / SMS / email / push
```

Lý do: một nguồn sự thật cho tiền và kho; tận dụng Auth/Storage/Postgres đã có; tránh hai database song song; đủ chỗ cho PostGIS; không Kafka/K8s/microservices cho đội chưa xác định.

## Lợi ích

- Thương lái tiếp tục ghi sổ offline; phiếu cũ không bị “nâng” thành giao dịch đã được đối tác xác nhận.
- Nông dân/doanh nghiệp vào cùng mô hình đơn, không fork schema theo role.
- NestJS chặn IDOR, mass assignment, ghi tiền/kho trái state machine — thứ RLS `user_id` hiện tại không giải quyết khi có nhiều bên.
- Android có kế hoạch đóng gói riêng; backend không giả vờ “biến website thành app được duyệt”.

## Rủi ro chính (xử lý trong hồ sơ, không để mở)

| Rủi ro | Cách xử lý |
|---|---|
| Client cũ ghi thẳng PostgREST bỏ qua NestJS | Ma trận đường truy cập; revoke grant bảng mới; A25 |
| `42501` bị app hiểu là hết gói | Protocol command mới; lỗi máy đọc được `PLAN_LIMIT_REACHED` ≠ `PERMISSION_DENIED` |
| `clearQueue()` khi đổi tài khoản | Outbox phân vùng user+workspace; không xóa im lặng |
| `delete_own_account()` cascade xóa chứng từ tổ chức | Thay lifecycle trước khi dữ liệu chung phụ thuộc cascade |
| Webhook billing nhiều bước không atomic | Module billing riêng; không dùng làm bằng chứng tiền nông sản |
| Play Billing vs QR gói phần mềm | Tách namespace; Android không copy màn QR web |
| Dual-write tạm | Có owner, hạn, reconciliation; không phải trạng thái lâu dài |

## Việc cố ý không làm trong lượt này

Không dọn dữ liệu vận hành, không chạy `db push`, không skeleton NestJS hàng trăm file, không đổi tên package thành Mambo365.
