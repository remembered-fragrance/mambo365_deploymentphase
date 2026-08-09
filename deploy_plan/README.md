# 🗂️ DEPLOY PLAN — THUMUA365 v1.0

Thư mục này là **tài liệu thi công**: mỗi giai đoạn một file, đọc xong là làm được ngay.
Ngày lập: **09/08/2026** · Bám theo proposal đã duyệt `CP4.docx`.

## Cách dùng

1. Đọc **file này trước** — mục §3 (ràng buộc chung) áp cho mọi giai đoạn, không lặp lại trong từng file.
2. Mở file của giai đoạn đang làm. Không đọc trước file của giai đoạn sau — dễ làm sớm thứ chưa tới lượt.
3. Không đánh dấu xong một giai đoạn khi **Yêu cầu đầu ra** của nó chưa đủ.

| File | Giai đoạn | Buổi | Kết quả |
|---|---|---|---|
| [A-nen-mong.md](A-nen-mong.md) | Nền móng | 4–5 | Repo sạch + bằng chứng phần tính tiền đúng |
| [B-backend.md](B-backend.md) | Backend | 3 | Schema đúng ngay từ đầu |
| [C-tang-du-lieu.md](C-tang-du-lieu.md) | Tầng dữ liệu | 4 | Đồng bộ offline chạy thật |
| [D-app-loi.md](D-app-loi.md) | App lõi | 7 | **Bản dùng được** |
| [E-phan-con-lai.md](E-phan-con-lai.md) | Phần còn lại | 4–5 | Đủ tính năng |
| [F-kinh-doanh.md](F-kinh-doanh.md) | Kinh doanh | 4 | **Thu được tiền** |
| [G-site-phap-ly.md](G-site-phap-ly.md) | Site & pháp lý | 2 | Đủ điều kiện phát hành |
| [H-kiem-va-mo.md](H-kiem-va-mo.md) | Kiểm & mở | 3 | **Phát hành** |

**Tổng: 31–36 buổi.**

---

## 1. BA CỔNG CHẶN

| Cổng | Vị trí | Điều kiện vượt |
|---|---|---|
| **1** | Sau A, trước C | Test `core/` đã phủ `calc · inventory · pricing · taxReport` và CI xanh. **Chưa có test thì không đụng tầng dữ liệu** — bạn sắp viết lại toàn bộ đọc/ghi, test là thứ duy nhất chứng minh tiền vẫn đúng |
| **2** | Trước F | Đưa bảng giá 149.000đ cho **10 người dùng thật**, đếm số người nói "sẽ trả". **Dưới 3 thì dừng, xem lại mô hình** — không xây tiếp phần thanh toán |
| **3** | Trong H, trước khi mở rộng | Đủ 15 ô ở [KH sản phẩm thật §12.1](../KE_HOACH_XAY_DUNG_SAN_PHAM_THAT.md) |

---

## 2. CÔNG NGHỆ TOÀN DỰ ÁN

Giữ nguyên từ bản demo trừ khi có ghi chú. **Không thêm thư viện nào ngoài bảng này mà không qua §3.5.**

| Nhóm | Công nghệ | Phiên bản | Dùng để |
|---|---|---|---|
| Ngôn ngữ | TypeScript | ~6.0 | Toàn bộ, `strict` bật |
| UI | React + React DOM | ^19.2 | — |
| Build | Vite | ^8.1 | Dev server + build |
| Định tuyến | react-router-dom | ^7.18 | `BrowserRouter`, SPA |
| CSS | Tailwind CSS + `@tailwindcss/vite` | ^4.3 | Token khai báo bằng `@theme` |
| PWA | vite-plugin-pwa | ^1.3 | Service worker, manifest |
| Lưu cục bộ | idb | ^8.0 | IndexedDB: ảnh + hàng đợi đồng bộ |
| Xuất file | xlsx · jspdf · html2canvas | ^0.18 · ^4.2 · ^1.4 | **Chỉ nạp động** (`import()`) |
| Lint | oxlint | ^1.69 | + luật ranh giới tầng |
| **Mới** — Test | vitest + @vitest/coverage-v8 | mới nhất | Test `core/` và `data/` |
| **Mới** — E2E | @playwright/test | mới nhất | 1 luồng chính |
| **Mới** — Backend | @supabase/supabase-js | mới nhất | Postgres · Auth · Storage |
| **Mới** — Font | @fontsource/be-vietnam-pro | mới nhất | Self-host, subset `vietnamese`+`latin` |
| **Mới** — Ranh giới | eslint-plugin-boundaries *hoặc* dependency-cruiser | mới nhất | Ép luật §3.1 trong CI |
| Hạ tầng | Supabase (prod + staging) · Vercel (app + site) | — | §B |

**Không dùng:** thư viện UI ngoài (shadcn/MUI/Ant), state manager ngoài (Redux/Zustand/Jotai), CSS-in-JS, ORM phía client, monorepo tooling.

---

## 3. RÀNG BUỘC CHUNG — ÁP CHO MỌI GIAI ĐOẠN

> Mục này tồn tại để trả lời đúng một câu hỏi: **làm sao code không rối, không thừa, và dự án không trôi khỏi hướng.** Mỗi luật đều có cách kiểm tự động hoặc cách kiểm bằng mắt trong 10 giây.

### 3.1 Ranh giới bốn tầng — luật quan trọng nhất

```
src/core/     Nghiệp vụ thuần. KHÔNG import: React, data/, DOM, thư viện ngoài.
                 ↑ ai cũng import được
src/data/     Supabase + cache + hàng đợi. Chỉ import core/.
                 ↑ chỉ qua useStore()
src/features/ Màn hình & luồng. Import core/ + components/. KHÔNG import data/* trực tiếp.
src/components/ UI thuần. KHÔNG import core/, KHÔNG import data/. Chỉ nhận props.
src/export/   Xuất Excel/PDF/PNG. Chạm DOM và thư viện nặng. Chỉ nạp động.
```

**Bảng ai được import ai** — cấu hình vào lint, CI đỏ nếu vi phạm:

| Từ ↓ / Tới → | core | data | components | features | export |
|---|---|---|---|---|---|
| **core** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **data** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **components** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **features** | ✅ | ⚠️ chỉ `useStore` | ✅ | ✅ | ⚠️ chỉ `import()` |
| **export** | ✅ | ❌ | ❌ | ❌ | ✅ |

> ⚠️ **Phát hiện khi kiểm tra code hiện tại:** `src/domain/` **không thuần như tưởng**. Trong 14 file: **10 file thuần hoàn toàn**, **3 file không thuần** (`export.ts`, `receiptExport.ts`, `receiptExportDom.ts` — import `xlsx`/`jspdf`/`html2canvas`, chạm `document`/`navigator`), và **1 file lẫn cả hai** (`taxReport.ts`: `buildTaxReport` thuần, `exportTaxReportXlsx` không thuần). Giai đoạn A phải tách — xem [A-nen-mong.md](A-nen-mong.md) §3.3.

### 3.2 Một khái niệm — một tên — một chỗ

| Luật | Kiểm bằng |
|---|---|
| **Không viết chuỗi tiếng Việt thẳng vào JSX.** Tất cả qua `src/i18n/labels.ts` | `grep -rP '>[^<>{}]*[àáâèéêìíòóôùúýăđ]' src/features src/components` → rỗng |
| **Không hardcode màu.** Chỉ dùng token trong `index.css` | `grep -rE '#[0-9a-fA-F]{3,6}\|slate-\|green-[0-9]' src/features src/components` → rỗng |
| **Không magic number.** Ngưỡng, hạn mức, thời gian → hằng số có tên trong `src/config.ts` | Xem mắt khi review |
| **Một hàm chỉ định nghĩa ở một chỗ.** Trước khi viết hàm mới, `grep` tên nó | — |

### 3.3 Kích thước và hình dạng file

- File **> 300 dòng** phải tách. File **> 500 dòng** là lỗi, không phải phong cách.
- Một file React = **một component xuất khẩu chính**. Component phụ dùng chung → chuyển sang `components/`.
- Hàm > 50 dòng hoặc lồng > 3 tầng → tách.
- Không có file tên `utils.ts`, `helpers.ts`, `common.ts`, `misc.ts` — tên phải nói file đó làm gì.

### 3.4 Không viết code chưa dùng tới

- **Không viết hàm/component/cột database "để sau này dùng".** Nếu chưa có chỗ gọi, không viết.
- **Không tạo abstraction trước lần dùng thứ hai.** Trùng lặp hai lần thì để yên; ba lần mới gom.
- **Không thêm tuỳ chọn cấu hình khi chỉ có một cách dùng.**
- Code chết, import thừa, biến không dùng → CI đỏ.

### 3.5 Thêm thư viện mới

Trả lời được cả bốn thì mới thêm: ① có ≥2 chỗ dùng thật ② tự viết tốn >1 buổi ③ dưới 30KB gzip hoặc nạp động được ④ còn được bảo trì. Ghi lý do vào PR. Không đạt → tự viết.

### 3.6 Phạm vi — chống trôi dự án

- **Mỗi PR làm đúng một việc** và ghi rõ thuộc giai đoạn nào.
- **Không làm việc của giai đoạn sau.** Thấy thứ đáng làm mà chưa tới lượt → ghi vào `deploy_plan/NOTES.md`, không code.
- **Không thêm tính năng lớn nào ngoài 7 module của CP4 §5.2** trước khi phát hành v1.0. Điểm khác biệt của sản phẩm là *ít tính năng nhưng đúng nghề* — thêm tính năng là phá chính lợi thế đó.
- Mọi thứ hoãn phải nằm trong [danh mục hoãn có điều kiện §14b](../KE_HOACH_XAY_DUNG_SAN_PHAM_THAT.md) kèm ngưỡng bật lại.

### 3.7 Luật cấm tuyệt đối (đưa vào lint)

| Cấm | Thay bằng |
|---|---|
| `alert()` · `confirm()` · `prompt()` | `<Dialog>` · `<ConfirmDialog>` · `<Toast>` |
| `parseFloat` / `Number()` cho tiền ngoài `core/` | `parseNumber()` |
| `localStorage` trong `features/` `components/` | qua `useStore()` |
| `any` | kiểu thật hoặc `unknown` + thu hẹp |
| `console.log` trong bản build | `console.error` cho lỗi thật, hoặc bỏ |
| Màu là tín hiệu duy nhất | luôn kèm chữ hoặc biểu tượng |

### 3.8 Git

- Nhánh: `a/ten-viec`, `b/ten-viec`… theo chữ cái giai đoạn.
- Commit: `A: bê core sang, chưa sửa logic`.
- **Việc dọn dẹp và việc đổi hành vi không đi chung một commit.** Đặc biệt khi bê `core/` sang: chuyển → test → mới sửa, ba commit riêng.
- Không merge khi CI đỏ. Không `--no-verify`.

### 3.9 Bốn số phải giữ trong tầm

| Chỉ số | Ngưỡng | Đo bằng |
|---|---|---|
| JS khởi tạo | ≤ 250KB gzip | `vite build` |
| File dài nhất trong `src/` | ≤ 300 dòng | `find src -name '*.ts*' \| xargs wc -l \| sort -n \| tail` |
| Phủ test `core/` | ≥ 80% dòng | `vitest --coverage` |
| Lighthouse mobile | Perf ≥85 · A11y ≥95 | thủ công mỗi cuối giai đoạn |

---

## 4. TÀI LIỆU GỐC

| Nội dung | File |
|---|---|
| Kế hoạch chủ, mô hình kinh doanh, pháp lý, criteria | [KE_HOACH_XAY_DUNG_SAN_PHAM_THAT.md](../KE_HOACH_XAY_DUNG_SAN_PHAM_THAT.md) |
| Thiết kế giao diện, từ vựng, thẩm mỹ "Sổ Vựa" | [KE_HOACH_THIET_KE_LAI_FRONTEND.md](../KE_HOACH_THIET_KE_LAI_FRONTEND.md) |
| Hạ tầng, schema, xác thực | [KE_HOACH_TRIEN_KHAI_DEPLOY.md](../KE_HOACH_TRIEN_KHAI_DEPLOY.md) |
| Định vị, mô hình kinh doanh (đã duyệt) | `CP4.docx` |

**Thứ tự ưu tiên khi mâu thuẫn:** CP4 (kinh doanh) → KH sản phẩm thật → file giai đoạn này → hai KH còn lại.
