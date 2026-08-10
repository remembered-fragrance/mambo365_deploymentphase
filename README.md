# THUMUA365 v1.0

Sổ thu mua nông sản cho chủ vựa / thương lái. Chạy được khi không có mạng.

| Đọc gì | Khi nào |
|---|---|
| [`deploy_plan/README.md`](deploy_plan/README.md) | **Trước tiên.** Kế hoạch thi công; §3 (ràng buộc chung) áp cho mọi giai đoạn |
| [`MEMORY.md`](MEMORY.md) | Nhật ký: đã làm gì, quyết gì, vì sao, còn treo gì |
| [`deploy_plan/NOTES.md`](deploy_plan/NOTES.md) | Việc thấy nhưng chưa tới lượt |
| [`supabase/VAN_HANH.md`](supabase/VAN_HANH.md) | Mọi việc cần tài khoản Supabase |

## Chạy

```bash
npm install
npm run dev
```

## Kiểm trước khi merge

```bash
npm run verify
```

Gồm năm bước, đúng thứ tự CI chạy:

| Lệnh | Kiểm gì |
|---|---|
| `npm run lint` | oxlint — cấm `alert`, `any`, `console.log`… |
| `npm run typecheck` | `strict` + `noUncheckedIndexedAccess` |
| `npm run rules` | Luật dự án ở README §3: chuỗi tiếng Việt trong JSX, màu viết cứng, `parseFloat` cho tiền, file > 300 dòng |
| `npm run boundaries` | Ranh giới bốn tầng (dependency-cruiser) |
| `npm run test` | Test `core/`, ngưỡng phủ 80% dòng |

## Cấu trúc

```
src/
├── core/        nghiệp vụ thuần — 0 import ra ngoài, 0 React, 0 DOM
├── data/        Supabase + cache + hàng đợi (giai đoạn C)
├── components/  UI thuần — chỉ nhận props, không biết nghiệp vụ
├── features/    màn hình & luồng (giai đoạn D)
├── export/      xuất Excel/PDF/PNG — thư viện nặng, chỉ nạp động
├── i18n/        toàn bộ chuỗi hiển thị
└── config.ts    mọi hằng số nghiệp vụ
site/            trang giới thiệu (giai đoạn G)
supabase/        migration SQL (giai đoạn B)
tests/core/      test nghiệp vụ
```

Ai được import ai: xem bảng ở [deploy_plan/README.md §3.1](deploy_plan/README.md).
Luật được ép bằng máy trong [`.dependency-cruiser.cjs`](.dependency-cruiser.cjs) — CI đỏ nếu vi phạm.

## Bốn số phải giữ trong tầm

| Chỉ số | Ngưỡng | Hiện tại (hết giai đoạn D) |
|---|---|---|
| JS khởi tạo | ≤ 250KB gzip | 88KB |
| File dài nhất trong `src/` | ≤ 300 dòng | 276 |
| Phủ test `core/` | ≥ 80% dòng | 97% |
| Lighthouse mobile | Perf ≥85 · A11y ≥95 | đo cuối mỗi giai đoạn |

## Chạy tới đâu rồi

| Giai đoạn | Trạng thái |
|---|---|
| A — Nền móng | ✅ |
| B — Backend | ✅ trong repo; phần cần tài khoản Supabase xem [supabase/VAN_HANH.md](supabase/VAN_HANH.md) |
| C — Tầng dữ liệu | ✅ trong repo; bảy kịch bản đồng bộ cần thiết bị thật |
| D — App lõi | ✅ Tổng quan · Phiếu · Tạo phiếu · Chi tiết phiếu |
| E → H | chưa làm |

Chưa cấu hình `VITE_SUPABASE_*` thì app chạy hoàn toàn cục bộ bằng "tài khoản
của máy này": sổ vẫn ghi được và vẫn còn sau khi tắt app, chỉ chưa đồng bộ.
