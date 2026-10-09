# Bản demo UI/UX — THUMUA365 (frontend + backend gộp lại)

Bản demo bấm được, chạy hoàn toàn trong trình duyệt, **không gọi API thật**. Dùng để thống nhất
giao diện và luồng trước khi dựng thật trong `src/` theo hợp đồng `docs/FRONTEND.md` của repo BE.

- Bản xem online: https://claude.ai/artifact/SXjR5PqXxHjqEv3NHAMCsn (riêng tư — chủ link chia sẻ cho nhóm)
- Mở ở máy: mở thẳng `index.html` bằng trình duyệt, hoặc `npx serve prototype/ui-demo`

Mọi số liệu là **dữ liệu mẫu**. Mã QR chỉ để minh hoạ, không quét được. Số tài khoản nhận tiền
để trống vì nhóm chưa chốt.

## Dùng thế nào

Thanh "BẢN DEMO" trên cùng:

| Điều khiển | Làm gì |
|---|---|
| Xem với vai | 7 vai: nông dân · chủ vựa · người cân · chủ DN · quản lý chi nhánh · nhân viên chi nhánh · quản trị |
| Có mạng / Mất mạng | Tắt mạng để thử sổ offline: phiếu vẫn lưu, có nhãn "Chưa gửi", bật lại thì tự gửi |
| Gói của vựa | Dùng thử · Premium · Quá hạn (ân hạn) · Hết gói — xem banner và màn khoá ghi phiếu |
| Ma trận quyền | Bảng `PERMISSIONS_BY` (FRONTEND.md §5.4), tô cột vai đang xem |
| Làm lại dữ liệu | Về dữ liệu mẫu ban đầu |

Các vai dùng chung dữ liệu: nông dân gửi đơn → vựa thấy đơn tới → nhận, hẹn lịch → cân theo đơn →
phiếu đồng bộ xong thì đơn tự sang "Đã cân xong" và nông dân nhận thông báo.

## Màn có trong demo

| Vỏ | Màn |
|---|---|
| Vựa / Doanh nghiệp | Tổng quan · Phiếu (đã xong / nháp) · Chi tiết phiếu khổ 80mm · Tạo phiếu (4 cách tính, cộng/trừ, ảnh, theo đơn) · Công nợ (trả vào phiếu cũ nhất trước) · Đơn hàng · Nông hộ / Nhà cung cấp · Người mua · Kết nối (mã 8 ký tự) · Mặt hàng · Tồn kho · Quy tắc giá · Báo cáo (+ báo cáo tổng theo chi nhánh) · Tiện ích · Nhân viên · Chi nhánh · Gói dịch vụ (QR, chờ tiền) · Nhập dữ liệu Excel · Tài khoản |
| Nông dân | Trang chủ · Tạo đơn bán · Đơn của tôi · Tiền vựa còn nợ · Vựa đã kết nối (nhập mã) · Tài khoản |
| Quản trị | Vận hành (p95, thao tác sổ, phễu) · Kích hoạt gói tay · Nhật ký hỗ trợ |
| Chung | Đăng nhập một ô · Đăng ký · "Bác là ai?" · Thông báo · Tìm nhanh `Ctrl K` · 3 chế độ xem (Trong nhà / Ngoài nắng / Ban đêm) |

Lỗi theo hợp đồng có minh hoạ: `ORDER_STATE_CHANGED` (nhận đơn DH-1048 khi bên kia vừa huỷ),
`ORG_HAS_MEMBERS` (xoá tài khoản khi còn nhân viên), `BRANCH_LIMIT`, mã kết nối sai / hết hạn,
`ACCOUNT_EXISTS` (thêm nhân viên số `0909 000 111`).

## Cấu trúc

Script thường (không build, không module), nạp theo thứ tự trong `index.html`:

| File | Nội dung |
|---|---|
| `core.js` | Tiện ích, biểu tượng, phép tính tiền (mô phỏng `@mambo/core`), đọc tiền bằng chữ, ma trận quyền |
| `data.js` | Dữ liệu mẫu, trạng thái `S`, truy vấn, hàng đợi đồng bộ |
| `ui.js` | Khung app: thanh demo, sidebar, thanh trên/dưới, hộp thoại, thông báo, tìm nhanh, phiếu 80mm |
| `views-book.js` | Tổng quan, phiếu, tạo phiếu, công nợ |
| `views-more.js` | Đơn, kết nối, đối tác, mặt hàng, kho, giá, báo cáo, tiện ích, nhập dữ liệu |
| `views-org.js` | Nhân viên, chi nhánh, gói, tài khoản, vỏ nông dân, quản trị, đăng nhập |
| `app.js` | Nối sự kiện, khởi động |

Token màu "Sổ Vựa" chép từ `src/index.css`. Thư mục này nằm ngoài `src/` nên không chịu luật
§3 (300 dòng, ranh giới tầng) và được loại khỏi `oxlint` (`.oxlintrc.json` → `ignorePatterns`):
các file dùng chung phạm vi toàn cục nên oxlint báo nhầm biến không dùng.

## Khi dựng thật

Đây là bản tham khảo giao diện, **không** bê code sang `src/`. Khi làm màn thật:

- Tính tiền chỉ bằng `@mambo/core`; ẩn/hiện theo `membership.permissions` của `/v1/me`.
- Chuỗi hiển thị vào `src/i18n/labels.ts`; màu chỉ dùng token trong `src/index.css`.
- Gọi API chỉ qua `@mambo/sdk`.
