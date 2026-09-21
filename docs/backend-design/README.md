# Hồ sơ thiết kế backend Mambo365 / THUMUA365

**Ngày soạn:** 18/09/2026  
**Nguồn yêu cầu:** [`backend.md`](../../backend.md)  
**Phạm vi lượt này:** hồ sơ thiết kế + kế hoạch triển khai. **Không** viết lại ứng dụng, **không** chạy migration lên môi trường thật, **không** dọn/ẩn danh dữ liệu vận hành.

Tên trong code và nhận diện hiện hữu: **THUMUA365** / `thumua365`. Thư mục repo có `mambo365`. Việc thống nhất tên sản phẩm / Android package ID là quyết định chủ sản phẩm, không đổi tên âm thầm trong hồ sơ này.

## Mục lục

| # | Đầu ra bắt buộc | Tệp |
|---|---|---|
| 1 | Executive summary | [01-executive-summary.md](01-executive-summary.md) |
| 2 | Repository audit | [02-repository-audit.md](02-repository-audit.md) |
| 3 | Scope và assumptions | [03-scope-assumptions.md](03-scope-assumptions.md) |
| 4 | Domain model và user journeys | [04-domain-journeys.md](04-domain-journeys.md) |
| 5 | Kiến trúc / deployment | [05-architecture.md](05-architecture.md) |
| 6 | Module map và ADR | [06-modules-adr.md](06-modules-adr.md) |
| 7 | RBAC/ABAC matrix | [07-rbac.md](07-rbac.md) |
| 8 | ERD / data dictionary P0 | [08-erd-data-dictionary.md](08-erd-data-dictionary.md) |
| 9 | State machines và sequence | [09-state-machines.md](09-state-machines.md) |
| 10 | API catalog và OpenAPI mẫu | [10-api-catalog.md](10-api-catalog.md) |
| 11 | Bản đồ / PostGIS | [11-maps.md](11-maps.md) |
| 12 | Offline protocol | [12-offline-protocol.md](12-offline-protocol.md) |
| 13 | Bảo mật và dữ liệu | [13-security-data.md](13-security-data.md) |
| 14 | Web / Android / Play | [14-web-android.md](14-web-android.md) |
| 15 | Migration plan | [15-migration.md](15-migration.md) |
| 16 | Ops / SLO / cost | [16-ops-slo-cost.md](16-ops-slo-cost.md) |
| 17 | Test plan A01–A28 | [17-test-plan.md](17-test-plan.md) |
| 18 | Backlog theo mốc | [18-backlog.md](18-backlog.md) |
| — | Truy vết yêu cầu → API → test | [19-traceability.md](19-traceability.md) |
| — | Mẫu triển khai (chưa chạy) | [samples/](samples/) |

## Cách dùng

1. Đọc `01` rồi `06` trước khi viết code. ADR đã chọn phương án, không để “có thể A hoặc B”.
2. Mọi tính năng P0 phải có hàng trong `19-traceability.md`. Thiếu hàng = chưa đủ thiết kế.
3. Mẫu trong `samples/` khớp ADR; nhãn **chưa chạy** nếu chưa có test thực thi.
4. Tài liệu cũ (`MEMORY.md`, `KE_HOACH_*`, `deploy_plan/` nếu còn) chỉ là lịch sử. Khi mâu thuẫn, hồ sơ này thắng.

**Code P0 (nhánh triển khai):** `apps/api/` — NestJS `/api/v1`. Schema SQL `supabase/migrations/0011`–`0018`. Runtime **bắt buộc** `PERSISTENCE=postgres` (`mambo_app` / `mambo_worker`). `MemoryPlatform` chỉ còn trong unit-test. Frontend cutover: `VITE_API_URL` → `/api/v1` (+ Vite proxy). Bằng chứng local: [`PRODUCTION_WORKLOG.md`](./PRODUCTION_WORKLOG.md). Capacitor: `capacitor.config.json` (chưa có `android/`).

## Quyết định kiến trúc đã chốt trong hồ sơ

| Chủ đề | Chọn |
|---|---|
| Hình dạng hệ thống | Modular monolith NestJS + worker dùng chung PostgreSQL |
| Database | Giữ PostgreSQL trên Supabase, bật PostGIS |
| Auth / file | Supabase Auth + Storage private; NestJS xác minh JWT và thi hành quyền |
| ORM / migration | Drizzle + SQL đã review; **một** pipeline `supabase/migrations/` |
| Giao dịch hai bên | Một `trade_orders` + participants; sổ cũ `transactions` là ledger riêng |
| Bản đồ | MapLibre + VietMap (adapter); không dùng tile OSM công cộng cho production |
| Android | Capacitor; target SDK API 36 tại thời điểm nộp |
| Queue | Transactional outbox trên PostgreSQL; Redis không phải nguồn sự thật tiền/kho |
