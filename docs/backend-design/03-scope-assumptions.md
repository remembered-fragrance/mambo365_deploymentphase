# 3. Scope và assumptions

## 3.1 Đã chốt (không hỏi lại)

1. NestJS + TypeScript, API chung web/Android.
2. PostgreSQL + PostGIS.
3. Tận dụng Supabase: Auth, Storage, **một** Postgres. Không nhân bản giao dịch sang DB thứ hai.
4. Ba nhóm: nông dân, thương lái/chủ vựa/đại lý, doanh nghiệp mua và bán — **đều đăng nhập**.
5. Một danh tính ∈ nhiều workspace.
6. Bản đồ điểm thu mua; “theo dõi” P0 = favorite + nhu cầu/giá + trạng thái đơn, **không** GPS người.
7. MVP: tin, tìm, báo giá, đơn, lịch, cân/kiểm phẩm, thanh toán thủ công, công nợ.
8. Không bắt buộc P0: cổng thanh toán nông sản, ví, escrow, 3PL, GPS nền.
9. Phát hành: web/PWA + Android Play — backend không thay thế quy trình Play.

## 3.2 P0 / P1 / P2

**P0 — giao dịch đầu:** identity, workspace, 3 hồ sơ, locations/map, listings, quotations, trade orders, appointments, receiving/weigh/QC, inventory lot tối thiểu, settlements, notifications, admin, audit, migration, web + Android thử.

P0 **có:** từ chối nhận, nhận một phần, đảo/điều chỉnh chứng từ sai **an toàn**, danh sách công nợ đến hạn/quá hạn **cơ bản**.

**P1:** duyệt nhiều bước, nhiều kho/chi nhánh nâng cao, điều chuyển, trả hàng sau nhận đầy đủ, tuổi nợ nâng cao, báo cáo quản trị, chat kiểm duyệt, đánh giá, kế toán, khiếu nại đầy đủ.

**P2:** payment gateway nông sản, logistics, traceability nâng cao, IoT cân, forecast, BOM sơ chế.

ERD có thể vẽ entity P1; **không** tự nâng thành phạm vi triển khai P0.

## 3.3 Giả định (nhãn, không phải cam kết)

| ID | Giả định | Nếu sai thì |
|---|---|---|
| A-TEAM | Đội chưa biết; ước lượng 1 dev và đội 3–4 người | Đổi lịch backlog §18, không đổi kiến trúc monolith |
| A-BUDGET | Pilot ~ vài trăm user trước khi 10k | Chọn gói Supabase/compute theo pilot; không khóa Enterprise |
| A-GEO | Triển khai Việt Nam, timezone `Asia/Ho_Chi_Minh` | Giờ mở cửa theo timezone địa điểm vẫn đúng |
| A-LOAD | Sizing: 10k account, 1k DAU, 100 concurrent, 10k locations, 100k orders | Benchmark trước khi tuyên bố SLO |
| A-NAME | Giữ brand THUMUA365 cho tới khi chủ sản phẩm chốt | Package Android không commit `com.mambo365` tự ý |
| A-MAP | VietMap là provider mặc định (hợp đồng chưa có) | Adapter đổi Goong/Mapbox không đổi schema `locations` |
| A-SUPA | Project staging/prod trong `VAN_HANH.md` vẫn dùng được | Nếu không: tạo project mới, **vẫn** một Postgres |
| A-JWT | Project sẽ bật JWT bất đối xứng (JWKS); HS256 là fallback | Guard phải nhận diện `alg` từ header, không hardcode một nhánh |
| A-PLAY | Loại tài khoản Play Console chưa biết | Closed testing 12 testers / 14 ngày chỉ áp nếu đúng loại TK cá nhân sau 13/11/2023 |
| A-LEGAL | Chưa kết luận pháp lý lưu trữ chứng từ VN | Retention tách “cần luật sư xác nhận” |

## 3.4 Câu hỏi còn mở (chỉ những câu chặn quyết định)

Không chặn thiết kế: ngân sách, số dev, tỉnh, Play account.

Chặn **trước spike Android/billing** (không chặn viết API P0 identity):

1. Package ID Android và tên hiển thị trên Play.
2. Có pháp nhân / tài khoản ngân hàng doanh nghiệp trước khi bán gói trên store không.
3. Có dùng SMS OTP (chi phí/abuse) trong P0 hay chỉ email + phone-as-identifier như hiện tại, thêm cờ `unverified`.

Mặc định hồ sơ này nếu chưa trả lời: **P0 không SMS OTP bắt buộc**; trạng thái `unverified`; hành động tin cậy (rút quyền, xóa TK, đảo tiền) yêu cầu re-auth mật khẩu; OTP là P0.1 khi có ngân sách SMS.

## 3.5 Kịch bản tải

| Kịch bản | Account | DAU | Concurrent | Locations | Orders/phiếu |
|---|---|---|---|---|---|
| Pilot | 200 | 50 | 10 | 200 | 5k |
| Cơ sở (tham chiếu prompt) | 10_000 | 1_000 | 100 | 10_000 | 100_000 |
| Tăng trưởng | 50_000 | 5_000 | 400 | 40_000 | 1_000_000 |

SLO §16 gắn **cơ sở**; chưa benchmark thì nhãn **kế hoạch**.
