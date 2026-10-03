# GIAI ĐOẠN A — NỀN MÓNG

**Buổi:** 4–5 · **Phụ thuộc:** không · **Người làm:** Tài · **Cần từ người khác:** không

---

## 1. TỔNG QUAN

Giai đoạn này **không tạo ra màn hình mới nào** mà người dùng nhìn thấy. Nó tạo ra ba thứ mà mọi giai đoạn sau đều dựa vào:

1. **Bằng chứng phần tính tiền đúng** — test cho `core/`. Bạn sắp viết lại toàn bộ tầng đọc/ghi ở giai đoạn C; nếu không có test thì không có cách nào biết mình đã làm sai tiền.
2. **Ranh giới tầng được ép bằng máy** — không phải bằng kỷ luật cá nhân. Kỷ luật hỏng sau buổi thứ mười.
3. **Bốn lỗi chặn L1–L4** — chúng làm sai dữ liệu, không phải chuyện giao diện. Sửa ở đây, không mang sang.

> **Nguyên tắc chi phối cả giai đoạn:** bê `core/` sang **nguyên trạng**, không sửa một dòng logic nào trong lúc di chuyển. Chuyển → viết test → mới sửa. Trộn ba việc là cách chắc chắn nhất để làm sai tiền mà không biết.

---

## 2. CÔNG NGHỆ

| Công nghệ | Dùng để | Ghi chú |
|---|---|---|
| Vite ^8.1 + React ^19.2 + TS ~6.0 | Khung dự án | `strict: true`, giữ như bản demo |
| **vitest** + `@vitest/coverage-v8` | Test `core/` | Chọn vì dùng chung cấu hình Vite, không cần thiết lập riêng |
| **eslint-plugin-boundaries** *hoặc* **dependency-cruiser** | Ép bảng import ở README §3.1 | Chọn một, chạy trong CI |
| oxlint ^1.69 | Lint nhanh + luật cấm | Giữ, bổ sung luật |
| **@fontsource/be-vietnam-pro** | Self-host font | Subset `vietnamese` + `latin`, weight 400/600/800 |
| Tailwind CSS ^4.3 | Token qua `@theme` | Không dùng file config JS |
| GitHub Actions | CI | `lint · typecheck · test · build` |
| `crypto.randomUUID()` | Sinh id | Có sẵn trình duyệt, không cần thư viện |

---

## 3. VIỆC CẦN LÀM

### 3.1 Dựng repo

- [ ] Tạo repo/nhánh mới. **Bản demo cũ vẫn deploy và vẫn chạy** cho tới khi bản mới qua criteria — không xoá.
- [ ] Cấu trúc thư mục:

```
src/
├── core/          ← nghiệp vụ thuần (bê từ domain/)
├── data/          ← rỗng ở giai đoạn này, chỉ tạo thư mục
├── components/    ← ui/ layout/ data/ feedback/
├── features/      ← rỗng
├── export/        ← 3 file chạm DOM tách khỏi domain/
├── i18n/labels.ts
├── config.ts      ← mọi hằng số nghiệp vụ
└── index.css      ← token
site/              ← rỗng, dùng ở giai đoạn G
supabase/          ← rỗng, dùng ở giai đoạn B
tests/
├── core/
└── e2e/
.github/workflows/ci.yml
```

- [ ] `tsconfig` bật `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`.
- [ ] Alias `@/` → `src/`.

### 3.2 Bê `core/` sang — ba commit riêng biệt

**Commit 1 — chuyển nguyên trạng.** **10 file thuần hoàn toàn** từ `src/domain/` sang `src/core/`, chỉ sửa đường dẫn import:

`calc.ts` · `types.ts` · `selectors.ts` · `filters.ts` · `format.ts` · `inventory.ts` · `pricing.ts` · `weight.ts` · `buyerSelectors.ts` · `supplierSelectors.ts`

Cộng thêm hai file sinh ra từ việc tách ở §3.3: `core/taxReport.ts` (phần `buildTaxReport`) và `core/receiptText.ts` (hàm `receiptShareText`). ⇒ `core/` có **12 file**.

**Commit 2 — viết test** (§3.4). Không sửa gì.

**Commit 3 — sửa nếu test phát hiện sai.** Mỗi sửa đổi kèm test tái hiện lỗi.

### 3.3 🔴 Tách phần không thuần ra khỏi `core/`

Kiểm tra code hiện tại cho thấy **3/14 file trong `domain/` không thuần**:

| File hiện tại | Vấn đề | Đi đâu |
|---|---|---|
| `domain/export.ts` | import `xlsx`, chạm DOM | `exportTransactionsXlsx`, `exportTransactionsPdf` → **`export/`**; `receiptShareText` (thuần) → **`core/receiptText.ts`** |
| `domain/receiptExport.ts` | import `jspdf`, dùng `navigator.share` | Toàn bộ → **`export/`** |
| `domain/receiptExportDom.ts` | import `html2canvas`, dựng DOM | Toàn bộ → **`export/`** |
| `domain/taxReport.ts` | lẫn hai loại | `buildTaxReport` + kiểu → **`core/taxReport.ts`**; `exportTaxReportXlsx` → **`export/taxReportXlsx.ts`** |

- [ ] Tách xong, `core/` không còn `import` nào ngoài chính nó — kiểm bằng:
```bash
grep -rn "^import" src/core | grep -v "from '\./" | grep -v "from '@/core"
```
Kết quả phải **rỗng**.

### 3.4 Test `core/` — hạng mục bắt buộc

- [ ] **`calc.ts`** — 4 công thức × biên: `standard` · `netAfterTare` (bì > cân) · `rubberLatex` (hàm lượng 0 và 100) · `lossPercent`. Thêm: `roundToThousand` với số âm và số lẻ; `freezeLineTotals` giữ nguyên giá trị sau khi đóng băng; `totalAdjustments` với mảng rỗng/undefined; **bất biến `transactionTotals().debt = total − amountPaid` không bao giờ âm**.
- [ ] **`inventory.ts`** — khẳng định `inventoryByProduct` dùng **khối lượng vật lý** (`linePhysicalWeight`), không dùng `lineNetWeight`. Đây là bất biến dễ vỡ nhất; test phải nêu rõ bằng một ca cao su hàm lượng 30%.
- [ ] **`pricing.ts`** — `suggestAdjustments` với rule tắt/bật, `minWeightKg` ở đúng ngưỡng, `appliesOnPickup` cả ba giá trị (`true`/`false`/`null`), `percentOfTotal` số lẻ.
- [ ] **`taxReport.ts`** — `buildTaxReport` với kỳ rỗng, kỳ có cả mua và bán, mốc đầu/cuối kỳ.
- [ ] **`selectors.ts`** — `purchases`/`sales` tách đúng theo `kind`; `debtsBySupplier`/`debtsByBuyer` gom đúng theo `counterpartyId`.
- [ ] **Round-trip migration** — dữ liệu v1/v2/v3 qua `normalize()` không mất field. Ca bắt buộc: phiếu cũ không có `payments[]` → sinh đúng một payment bằng `amountPaid`.

**Ngưỡng:** phủ ≥80% dòng của `core/`.

### 3.5 Ép ranh giới bằng máy

- [ ] Cấu hình `dependency-cruiser` (hoặc `eslint-plugin-boundaries`) theo đúng bảng ở [README §3.1](README.md).
- [ ] Luật lint bổ sung:

| Luật | Phạm vi |
|---|---|
| `no-alert` | toàn `src/` |
| Cấm `parseFloat`/`Number(` cho tiền | ngoài `core/` và `utils/parseNumber.ts` |
| Cấm `localStorage`/`sessionStorage` | `features/`, `components/` |
| Cấm `#hex`, `slate-*`, `green-[0-9]` | `features/`, `components/` |
| Cấm `any` | toàn `src/` |
| Cấm chuỗi tiếng Việt trong JSX | `features/`, `components/` |

- [ ] `.github/workflows/ci.yml`: `lint → typecheck → test → build → kiểm ranh giới`. Chặn merge khi đỏ.

### 3.6 🔴 Bốn lỗi chặn

| Mã | Việc | Chi tiết |
|---|---|---|
| **L1** | Không gieo dữ liệu mẫu cho tài khoản thật | `loadData` chỉ seed khi `id === 'user-demo'`. Người dùng thật vào app **rỗng**. Giữ `seed.ts` cho chế độ trình diễn (giai đoạn E) |
| **L2** | Một quy ước số duy nhất | Mọi nơi dùng `parseNumber()`. Bỏ `type="number"` → `type="text" inputMode="decimal"`. `DebtPage` hiện dùng `parseFloat(s.replace(/,/g,''))` — quy ước **ngược** với phần còn lại, phải bỏ |
| **L3** | Xác nhận & hoàn tác | Dựng `<Toast>` có nút "Hoàn tác" 8 giây + `<ConfirmDialog>`. Áp cho: ghi tiền, xoá nháp, xoá ghi chú, xoá quy tắc giá |
| **L4** | Đăng nhập linh hoạt | `auth.ts` đổi khoá tra cứu từ `email` sang `identifier` chuẩn hoá; thêm `username?`, `email?` thành tuỳ chọn. Chuẩn hoá SĐT về `+84…`. Bỏ mật khẩu demo khi không phải `import.meta.env.DEV` |

### 3.7 Nền giao diện

- [ ] `index.css` — token "Sổ Vựa" **đã được Tuyến duyệt**:

```css
@theme {
  --color-paper:  #EDEAE3;   /* nền */
  --color-card:   #FBF9F5;
  --color-ink:    #1A1714;   /* chữ chính */
  --color-ink-2:  #554E44;
  --color-ink-3:  #8B8175;   /* chữ phụ — đạt 4.5:1 trên nền giấy */
  --color-rule:   #D6D0C4;
  --color-brand:  #14663C;   /* xanh rừng — thương hiệu + nút chính */
  --color-in:     #14663C;   /* mua */
  --color-out:    #7C3AED;   /* bán */
  --color-receivable: #0E6E7A;
  --color-payable:    #9A3412;
  --color-alert:  #A81E2E;
  --density-row-h: 3.25rem;
  --density-gap:   1rem;
}
```
Ba theme qua `:root[data-theme="day|sun|night"]`. Không rải giá trị màu trong component.

- [ ] Utility dùng chung: `input-base`, `card`, `num` (`font-variant-numeric: tabular-nums`).
- [ ] `i18n/labels.ts` — nạp sẵn bảng từ vựng ở [KH Frontend §16.3](../KE_HOACH_THIET_KE_LAI_FRONTEND.md). Từ file đầu tiên đã dùng, không "để sau gom".
- [ ] `config.ts` — hằng số: `FREE_RECEIPTS_PER_MONTH = 30`, `PRICE_MONTHLY = 149000`, `TRIAL_DAYS = 30`, `AUTOSAVE_MS = 700`, `MAX_ATTACHMENTS = 5`, `UNDO_MS = 8000`.
- [ ] Thư viện `components/ui/`: `Button` · `Input` · `NumInput` · `Select` · `Chip` · `Badge` · `Card` · `Dialog` · `ConfirmDialog` · `Toast` + provider · `Skeleton` · `EmptyState` · `ErrorState` · `Segmented` · `BottomSheet` (bê) · `Numpad` (bê, style lại).
- [ ] Bê `Numpad` và bổ sung: nút **"Xoá hết"**, hiển thị số có ngăn nghìn + **đọc bằng chữ**.

### 3.8 Dọn hạ tầng frontend

- [ ] `crypto.randomUUID()` cho mọi id mới (có fallback).
- [ ] `index.html`: bỏ `maximum-scale=1.0, user-scalable=no`, thêm `viewport-fit=cover`, bỏ 3 thẻ Google Fonts.
- [ ] `xlsx` · `jspdf` · `html2canvas` chỉ nạp bằng `import()` trong `export/`.
- [ ] `ErrorBoundary` (kèm nút "Xuất backup") + route `path="*"`.
- [ ] `StoreValue` thêm `status: { loading, error, lastSyncedAt, pendingCount }` — giai đoạn này giá trị tĩnh, nhưng UI sau đó vẽ dựa vào nó.
- [ ] `Transaction` thêm `syncState?: 'synced' | 'pending' | 'conflict'` (tuỳ chọn, chưa dùng).

---

## 4. RÀNG BUỘC RIÊNG

1. **Không viết màn hình nào ở giai đoạn này.** Thấy trống trải là bình thường — giai đoạn D mới dựng màn hình.
2. **Không "tiện tay cải tiến" logic trong lúc bê `core/`.** Nếu thấy chỗ sai, ghi vào `NOTES.md` và sửa ở commit 3, kèm test.
3. **Không dựng component chưa có chỗ dùng.** Danh sách §3.7 đã lọc theo tiêu chí "sẽ dùng ở ≥2 màn". Không thêm.
4. **Không viết code Supabase.** Chưa tới lượt.
5. Không đổi công thức tính tiền dù thấy "có vẻ nên tính khác". Đó là quyết định nghiệp vụ, phải hỏi nhóm.

---

## 5. YÊU CẦU ĐẦU RA

Kiểm được bằng lệnh:

- [ ] `npm run test` — xanh, phủ `core/` ≥80%
- [ ] `npm run build` — JS khởi tạo **≤250KB gzip**
- [ ] `grep -rn "^import" src/core | grep -v "from '\./"` → **rỗng**
- [ ] `npx depcruise src --validate` → **0 vi phạm**
- [ ] `grep -rn "alert(\|confirm(\|prompt(" src/` → **rỗng**
- [ ] `grep -rnE "#[0-9a-fA-F]{6}|slate-" src/features src/components` → **rỗng**
- [ ] `find src -name "*.ts*" | xargs wc -l | sort -n | tail -3` → không file nào **>300 dòng**
- [ ] CI xanh trên một PR thử

Kiểm bằng tay:

- [ ] Tài khoản mới → **0 giao dịch, 0 nông hộ**
- [ ] Gõ `1,5` vào bất kỳ ô số nào → **luôn ra 1,5**
- [ ] Gõ `74000000` → hiện `74.000.000` + dòng chữ "bảy mươi bốn triệu"
- [ ] Đăng ký + đăng nhập được **không cần email**
- [ ] `0905112233` và `+84 905 112 233` → **cùng một tài khoản**
- [ ] Xoá một ghi chú → Toast hiện nút "Hoàn tác", bấm vào thì ghi chú trở lại
- [ ] Ném lỗi giả trong một component → thấy màn hình lỗi có nút Tải lại và Xuất backup, không trắng trang

---

## 6. CẠM BẪY

| Bẫy | Hậu quả | Tránh bằng |
|---|---|---|
| Bê `core/` kèm sửa logic | Sai tiền âm thầm, không truy được nguyên nhân | Ba commit riêng, §3.2 |
| Để `export/` nằm lại trong `core/` cho nhanh | `core/` không test được độc lập, bundle phình | Tách ngay ở §3.3 |
| Viết test theo code hiện có thay vì theo nghiệp vụ | Test xanh nhưng vô nghĩa — nó chỉ chép lại lỗi | Viết ca test từ ví dụ số thật (cao su 320kg × 31% × 14.500đ) |
| Hoãn `labels.ts` | Cuối dự án phải lục 20 file để đổi chữ | Dùng từ file đầu tiên |
| Dựng cả bộ component "cho đủ" | Nửa số component không ai dùng | Chỉ dựng khi có ≥2 chỗ dùng dự kiến |
| Bỏ qua cổng chặn 1, nhảy sang C | Không có lưới an toàn cho việc rủi ro nhất dự án | Không merge nhánh `c/*` khi test `core/` chưa đủ |
