# MEMORY — nhật ký thi công THUMUA365 v1.0

Sổ ghi **đã làm gì, quyết gì, vì sao**. Đọc file này trước khi tiếp tục một
giai đoạn mới hoặc khi quay lại dự án sau một thời gian nghỉ.

- Kế hoạch (sẽ làm gì) → [`deploy_plan/`](deploy_plan/README.md)
- Việc thấy nhưng chưa tới lượt → [`deploy_plan/NOTES.md`](deploy_plan/NOTES.md)
- Nhật ký (đã làm gì) → **file này**

Ghi thêm một mục mỗi khi kết thúc một giai đoạn. Không xoá mục cũ.

---

## Bối cảnh

| | |
|---|---|
| Bắt đầu | 09/08/2026 |
| Repo | `C:\Users\nino\Desktop\mambo365deployment` — nhánh `main`, chưa có remote |
| Bản demo cũ | `C:\Users\nino\Desktop\mambo365-main` — **giữ nguyên**, vẫn deploy tới khi bản mới qua criteria |
| Người làm | Tài (một mình, ghép cặp với AI) |

Bản demo cũ không sửa tại chỗ mà dựng repo mới, theo `A-nen-mong.md` §3.1: việc
bê `core/` sang và viết lại toàn bộ tầng đọc/ghi không được phá bản đang chạy.

---

## Giai đoạn A — Nền móng · `5c1dcec` · 09/08/2026

**Kết quả:** repo sạch + bằng chứng phần tính tiền đúng.

### Làm gì

- Dựng khung: Vite 8 · React 19 · TS 6 (`strict` + `noUncheckedIndexedAccess`) ·
  Tailwind 4 qua `@theme` · vitest 4 · dependency-cruiser · oxlint · CI GitHub Actions.
- Bê **10 file thuần** từ `domain/` sang `core/`, chỉ sửa đường dẫn import.
- Tách **4 file không thuần** sang `export/`: `downloadFile` · `receiptCapture` ·
  `receiptFile` · `transactionsFile` · `taxReportXlsx`. `xlsx`/`jspdf`/`html2canvas`
  chuyển sang **chỉ nạp động**.
- Tách hai file lẫn cả hai loại: `core/taxReport.ts` (phần thuần) và
  `core/receiptText.ts` (nội dung phiếu dạng chữ).
- Nền giao diện: token "Sổ Vựa" + ba chế độ xem, `i18n/labels.ts`, `config.ts`,
  16 component trong `components/ui/`.

### Bốn lỗi chặn

| Mã | Đã sửa thế nào |
|---|---|
| **L1** | `core/normalize.ts` không còn gieo dữ liệu mẫu. Sổ mới = sổ rỗng. Seed chuyển thành chế độ trình diễn của giai đoạn E. |
| **L2** | Một quy ước số duy nhất ở `core/parseNumber.ts` — phẩy là dấu thập phân, chấm là ngăn nghìn. Kèm `core/numberToWords.ts` đọc tiền bằng chữ. |
| **L3** | `<Toast>` có nút Hoàn tác 8 giây + `<ConfirmDialog>` nêu hậu quả bằng số. |
| **L4** | `core/identifier.ts` đưa tên tài khoản / SĐT / email về **một khoá tra cứu**. `UserProfile.email` thành tuỳ chọn, thêm `identifier` và `username`. |

### Quyết định

- **`i18n/` và `config.ts` là lá dùng chung**, mọi tầng trừ `core/` được import.
  Lý do: `core/` phải giữ 0 import ra ngoài để kiểm được bằng một dòng grep.
- **`components/` không biết parse số.** `<NumInput>` và `<Numpad>` nhận chuỗi
  đã định dạng qua props; việc parse do `features/` làm. Đây là hệ quả trực tiếp
  của luật components → core là ❌, và nó đúng: component dumb thì test dễ hơn.
- Bỏ field `badge` khỏi `CropMeta` — class Tailwind không được nằm trong `core/`.
- `roundToThousand(-1500) = -1000` (số âm làm tròn về phía số lớn hơn): **giữ
  nguyên hành vi của bản demo**, khoá lại bằng test. Đây là quyết định nghiệp vụ,
  phải hỏi nhóm, không tự đổi. Đã ghi vào nợ kỹ thuật.

### Test bắt được lỗi thật

`debtsBySupplier` gom theo `supplierId` trong khi `filters.ts` lọc theo
`counterpartyId` — hai khoá cho cùng một khái niệm đối tác. Đã đổi cả
`debtsBySupplier` lẫn `supplierSummaries` về `counterpartyId`.

### Cổng chặn 1 — đã vượt

`core/` đã phủ `calc · inventory · pricing · taxReport`; toàn bộ lệnh kiểm ở
`A-nen-mong.md` §5 chạy xanh tại chỗ.

---

## Giai đoạn B — Backend · `3cf45fc` · 09/08/2026

**Kết quả:** schema đúng ngay từ đầu, nằm trong git.

7 migration: `0001_nen_tang` · `0002_ho_so` · `0003_bang_nghiep_vu` ·
`0004_goi_dich_vu` · `0005_rls` · `0006_dinh_danh` · `0007_storage`.
Mỗi file ghi đường lùi ở comment đầu.

### Ba quyết định không nên đổi về sau

1. **`payments` là bảng riêng, chỉ ghi thêm.** `transactions` **không có** cột
   `amount_paid` — luôn tính `sum(payments)`. Lý do duy nhất và đủ: hai máy cùng
   ghi trả nợ mà mảng payments nằm trong hàng transactions thì "ghi sau thắng"
   đè cả hàng và **mất tiền âm thầm**.
2. **`deleted_at` ở mọi bảng.** Không có thì phiếu đã xoá sống dậy khi máy
   offline đồng bộ lại.
3. **Id do client sinh**, không `default gen_random_uuid()` — điều kiện cần của
   ghi lạc quan khi mất mạng.

### Quyết dứt điểm mục treo từ A

`Transaction.supplierId` **giữ bắt buộc** trong `core/types.ts`, thêm cột
`transactions.supplier_id text` nullable. `counterparty_id uuid` là nguồn sự
thật; `counterparty_id` NULL nghĩa là **Khách lẻ**.

### Khác

- RLS bật cho cả 11 bảng bằng vòng lặp trên danh sách, không viết tay từng cái.
  Cố tình **không có policy DELETE**: xoá là xoá mềm.
- `resolve_identifier()` — `security definer`, chỉ trả về email nội bộ, chỉ
  `grant execute` cho `anon` và `authenticated`.
- `has_active_sync()` **viết sẵn, CHƯA gắn** vào policy ghi — gắn ở giai đoạn F.
  Gắn sớm thì giai đoạn C không ghi được gì vì chưa ai có gói.
- `scripts/admin-reset-password.ts` kèm quy tắc xác minh danh tính ghi ngay
  trong file.

### 🔴 Chưa chạy được

Máy làm việc **không có Supabase CLI, không có Docker, không có psql** ⇒ SQL
**chưa từng chạy qua Postgres**. Phải `supabase db push` lên staging trước khi
tin. Bảng kiểm 9 mục ở [`supabase/VAN_HANH.md`](supabase/VAN_HANH.md) §5.

---

## Giai đoạn C — Tầng dữ liệu · `96c164f` · 09/08/2026

**Kết quả:** đồng bộ offline-first, 17 file trong `src/data/`.

### Nguyên tắc đã hiện thực

> Ghi cục bộ trước, đẩy lên sau. Hàng đợi sống sót qua việc tắt app.
> Không thao tác nào thực hiện hai lần.

- 22 action trong `StoreValue` **giữ nguyên chữ ký** của bản demo, **không cái
  nào trả Promise**.
- Hàng đợi nằm trong IndexedDB, xả **tuần tự**, thử lại giãn cách
  1s · 5s · 30s · 5 phút, hết 5 lần thì đánh dấu kẹt và đẩy lên `status`.
- Insert dùng `upsert(..., { ignoreDuplicates: true })` — bấm hai lần vì mạng
  chậm không thành hai phiếu.

### Trả hai món nợ ghi từ giai đoạn B

- `core/id.ts` sinh **UUID thuần** — tiền tố `tx-…` không lọt được vào cột `uuid`.
- Mapper đổi mã Khách lẻ (`guest` / `guest-buyer`) thành **NULL** khi ghi xuống;
  sentinel của `core/` không rơi vào database.

### Lỗi thật test bắt được

Bản đầu của `mergeChanges` **chép lại đúng cái lỗi** mà việc tách bảng
`payments` sinh ra để tránh: kéo phiếu về thay thẳng danh sách payments của
máy chủ, xoá mất khoản trả ghi lúc mất mạng. Test đầu tiên tôi viết cũng khẳng
định hành vi sai đó. Đã sửa thành **hợp nhất theo id**, và test giờ khẳng định
3tr + 5tr = 8tr.

### Quyết định

- Thêm `src/data/localDb.ts` (ngoài danh sách file của `C-tang-du-lieu.md` §3.1)
  để `cache` · `queue` · `attachments` không phải import lẫn nhau chỉ vì dùng
  chung một kết nối IndexedDB.
- Logic nghiệp vụ của các action nằm ở `core/*Actions.ts`, **không** viết lại
  trong `data/` — theo ràng buộc §4.4.
- `data/rows.ts` viết tay theo migration, thay `database.types.ts` cho tới khi
  `npm run db:types` chạy được.

### 🔴 Chưa chạy được

Bảy kịch bản nghiệm thu §5 cần tài khoản Supabase và **hai thiết bị thật**.
Logic của cả bảy đều có test tự động, nhưng test không thay được một lần chạy
thật trên sóng chập chờn. Bảng kiểm ở [`supabase/VAN_HANH.md`](supabase/VAN_HANH.md) §6.

---

## Giai đoạn D — App lõi · `6475e3c` · 09/08/2026

**Kết quả:** bản dùng được thật. Bốn màn: Tổng quan · Phiếu · Tạo phiếu ·
Chi tiết phiếu.

### Ba thứ quyết định chất lượng

- **`DataView`** — khai báo cột một lần, ra bảng ở ≥md và thẻ ở <md. Điện thoại
  không bao giờ cuộn ngang bảng.
- **Thanh chip "Đang cân"** — dùng đúng `DraftReceipt` đã có, chuyển chip chỉ
  đổi `?draft=<id>`. Không thêm bảng nào.
- **Numpad là mặc định** trên `pointer: coarse` — quyết định bằng loại con trỏ,
  **không** bằng bề rộng màn hình.

### 🔴 Ba lỗi mất dữ liệu — chỉ lộ ra khi CHẠY THẬT, không phải khi đọc code

1. **Action thứ hai ghi đè action thứ nhất.** Một lần bấm "Trả đủ & xong" gọi
   `addTransaction` rồi `deleteDraft`; cả hai xuất phát từ ảnh chụp sổ của lần
   vẽ hiện tại, nên lệnh xoá nháp **ghi đè mất phiếu vừa lập**. Sửa: sổ mới nhất
   nằm ở `ref`, cập nhật ngay lúc `commit` chứ không đợi React vẽ lại; mọi action
   đọc qua `book()`.
2. **Hàng đợi sắp sai thứ tự.** Sắp theo `createdAt`, mà bốn thao tác của một lần
   bấm rơi vào **cùng một mili giây** ⇒ thứ tự rớt về khoá chính (uuid ngẫu nhiên)
   ⇒ lần trả tiền có thể lên trước phiếu ⇒ khoá ngoại lỗi. Sửa: thêm trường `seq`
   tăng dần, IndexedDB lên version 2. Có test.
3. **Nháp tự lưu sau khi phiếu đã chốt**, dựng lại đúng cái nháp vừa xoá. Sửa:
   cờ `finished` chặn vòng tự lưu và huỷ timer đang chờ.

Ngoài ra: bấm "Khách mới" không mở phiếu trắng vì URL chưa đổi ⇒ thêm tham số
`?moi=<uuid>` làm khoá phiên.

### Cải tiến kèm theo

Gộp các lần sửa chưa gửi của **cùng một bản ghi**: gõ mười lần vào ô nháp giờ
chỉ đẩy lên một lượt. Người dùng đang dùng 3G, mỗi lượt gửi thừa là một lần chờ.

### Quyết định

- **Chưa cấu hình Supabase thì app dùng "tài khoản của máy này"**
  (`data/deviceAccount.ts`): sổ vẫn ghi và vẫn còn sau khi tắt app, chỉ chưa
  đồng bộ. Lý do: màn đăng nhập thuộc giai đoạn E, mà giai đoạn D phải ra được
  **bản dùng được**.
- Hai ô `Công nợ` và `Thêm` trên thanh dưới để **mờ** — giữ đúng 5 slot cố định
  để bố cục không nhảy khi màn hình của giai đoạn E xuất hiện.
- Thay `useMoneyField` (dự kiến ở NOTES) bằng `<NumberField>` **có kiểm soát**:
  nhiều ô số trên một màn thì component có kiểm soát đúng hơn hook.
- `CropIcon` là hình tạm nét đơn, cùng lưới 24px với bộ ký hiệu chính thức của
  Tuyến nên thay được mà không đổi bố cục. **Không dùng emoji làm biểu tượng.**

### Chạy thật đã kiểm

| Việc | Kết quả |
|---|---|
| Cao su 320kg × 31% × 14.500đ | **1.438.000₫** — khớp số tính tay |
| Đọc bằng chữ | "một triệu bốn trăm ba mươi tám nghìn đồng" |
| Cân hai khách xen kẽ, chuyển qua lại | Mỗi phiếu giữ đúng số của mình |
| Chốt phiếu | Chip biến mất, nhảy về đúng khách còn lại |
| Tài khoản mới | 0 giao dịch, 0 nông hộ (L1) |
| 375px · 320px, mọi route | Không route nào cuộn ngang; thanh dưới 5 slot không vỡ chữ |
| Ba chế độ xem | Đổi không cần tải lại; "Ngoài nắng" phóng chữ gốc lên 18px |

---

## Bốn số phải giữ trong tầm

Đo lúc kết thúc giai đoạn D.

| Chỉ số | Ngưỡng | Hiện tại |
|---|---|---|
| JS khởi tạo | ≤ 250KB gzip | **88KB** |
| File dài nhất trong `src/` | ≤ 300 dòng | **276** |
| Phủ test `core/` | ≥ 80% dòng | **97%** (262 test) |
| Lighthouse mobile | Perf ≥85 · A11y ≥95 | **chưa đo** |

`npm run verify` chạy đủ 5 bước: lint → typecheck → luật dự án → ranh giới tầng
→ test. Tất cả xanh.

---

## Việc còn treo vì cần thứ ngoài repo

| Việc | Cần gì | Ghi ở |
|---|---|---|
| Chạy migration, sinh kiểu, test chéo hai tài khoản | Tài khoản Supabase (2 project) | `supabase/VAN_HANH.md` §2–§5 |
| Bảy kịch bản đồng bộ | Hai thiết bị thật + sóng chập chờn | `supabase/VAN_HANH.md` §6 |
| Cấu hình Auth (tắt xác nhận email, mật khẩu 6 ký tự, rate limit) | Dashboard Supabase | `supabase/VAN_HANH.md` §3 |
| Vercel Preview → staging, Production → prod | Tài khoản Vercel | `supabase/VAN_HANH.md` §1 |
| Lighthouse mobile | Chạy trên bản deploy | — |
| Bộ ký hiệu 4 nông sản | Tuyến | `deploy_plan/NOTES.md` mục E |

---

## Ghi chú vận hành

- Dev server bản mới chạy ở **cổng 5174** qua cấu hình `thumua365-v1` trong
  `.claude/launch.json` của repo cũ — harness chỉ đọc launch.json ở thư mục làm
  việc chính. Bản demo cũ vẫn ở 5173.
- `.dependency-cruiser.cjs` ghi cứng tên `data/useStore.ts` và `data/hooks/`.
  Đổi tên hai chỗ đó thì phải sửa cả luật.
- IndexedDB tên `thumua365`, đang ở **version 2**. Lần nâng version 1→2 xoá và
  dựng lại kho `queue` — chấp nhận được vì app chưa phát hành.
