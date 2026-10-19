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
| Repo | `C:\Users\nino\Desktop\mambo365deployment` — nhánh `master`, chưa có remote |
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

## Giai đoạn E — Phần còn lại & onboarding · 10/08/2026

**Kết quả:** đủ tính năng. Mười một màn hình mới, ma trận parity 18/18.

### Làm gì

- **Công nợ** (`/cong-no`): máy tính hai cột song song, điện thoại một cột có
  tab. Lọc "Quá hạn" và thứ tự **quá hạn trước, rồi tiền nhiều trước**.
- **Tồn kho** (`/ton-kho`): `DataView` thay bảng cuộn ngang; thêm giá vốn bình
  quân và giá trị tồn.
- **Đối tác**: một `PartnerListPage` nhận `role`, hai route. Sửa/xoá được từ
  danh sách, số điện thoại là liên kết `tel:`.
- **Mặt hàng** + **Quy tắc giá** (`/quy-tac-gia`): một `PricingRuleEditor` duy
  nhất cho cả hai lối vào, có dòng xem trước trên đơn mẫu 1 tấn × 20.000đ.
- **Báo cáo · Tiện ích · Tài khoản · Thêm · Đăng nhập** và phần **đón người
  dùng mới**: màn hình chào ba thẻ, hướng dẫn bốn bước, nút "?" mọi trang,
  chế độ trình diễn.
- **Tìm nhanh** `Ctrl/⌘ K` — dòng #15 của ma trận, chức năng duy nhất hoàn toàn
  mới. Gõ không dấu vẫn ra tên có dấu.

### Ba quyết định đáng ghi

1. **Thêm đúng ba action vào `StoreValue`**: `updateSupplier` · `deleteSupplier`
   (KH Frontend §7.7 cho phép sẵn) và **`removePayment`**. Cái thứ ba không nằm
   trong kế hoạch nhưng E §3.1 bắt buộc "Trả đủ" phải hoàn tác được trong 8
   giây, mà `payments` là bảng chỉ ghi thêm. Chọn **xoá mềm khoản trả** thay vì
   ghi một khoản âm: sổ nợ của chủ vựa không có khái niệm "trả âm", và một dòng
   −5.000.000₫ trong lịch sử là thứ không giải thích được khi đối chiếu.
2. **Bỏ hẳn lớp phủ mờ khi quy tắc giá tắt.** Kế hoạch bảo thêm
   `pointer-events-none` cho lớp phủ; thay vào đó trạng thái bật/tắt là một cái
   nút thật. Không còn lớp phủ thì không còn lỗi tắt-xong-không-bật-lại-được.
3. **Ô hẹn ngày trả nằm trong hộp thoại "Ghi nợ & xong"**, không nằm trong form
   phiếu. Hẹn ngày chỉ có nghĩa khi phiếu còn nợ, và `DraftReceipt` không có
   trường `creditTerms` — để ở form thì gõ xong chuyển khách là mất.

### Chuyện nhỏ mà phải sửa

- `labels.ts` chạm trần 300 dòng ⇒ tách `screenLabels.ts` +
  `onboardingLabels.ts`, `L` gộp ba mảnh. Nơi dùng vẫn chỉ có một.
- Đổi tên `exportBackup`/`onExportBackup` → `exportToFile`/`onExportFile`.
  Tiêu chí E §5 yêu cầu `grep "Backup" src/` rỗng, mà chữ đó có từ giai đoạn A.
- `DataView` học thêm **sắp xếp theo cột** (`sortValue` + `SortState`) — dùng ở
  Đối tác, Mặt hàng, Quy tắc giá.

### Chạy thật đã kiểm

| Việc | Kết quả |
|---|---|
| Sổ rỗng | Ra **màn hình chào**, không phải trang trắng |
| Bật dữ liệu mẫu | Banner đỏ + cờ `thumua365:demo`; "Xoá hết" → sổ rỗng sạch |
| Công nợ | Quá hạn xếp trước dù nợ ít hơn (3,6tr trước 1,7tr) |
| "Trả đủ" rồi "Hoàn tác" | 4.152.000 → 2.464.000 → **4.152.000** |
| Tắt quy tắc giá rồi bật lại | Bật lại được |
| Sửa tên nông hộ từ danh sách | Tên mới hiện ngay trên bảng |
| `tel:` | `tel:0912345678` thật, không phải chữ |
| Tìm nhanh "co mai" | Ra "Cô Mai" trước, rồi tới phiếu của cô |
| 375px và 320px, 12 route | **Không route nào cuộn ngang** |
| ≥1440px, danh sách Phiếu | Pane chi tiết mở bên phải, URL mang `?xem=` |

### 🔴 Chưa kiểm được

Đăng nhập/đăng ký, đổi mật khẩu, sửa hồ sơ và "đưa sổ của máy vào tài khoản"
**chưa chạy lần nào** — cả bốn cần tài khoản Supabase thật. Logic đã viết,
đường đi đã nối, nhưng chưa có gì chứng minh. Bảng kiểm ở `supabase/VAN_HANH.md`.

---

## Giai đoạn F — Kinh doanh & thu tiền · 10/08/2026

**Kết quả:** phân tầng Free/Premium, luồng chuyển khoản VietQR, nhập file Excel,
mã giới thiệu.

> ⚠️ **Cổng chặn 2 chưa có bằng chứng đã vượt.** `deploy_plan/README.md` §1 đòi
> đưa bảng giá cho 10 người dùng thật và đếm ≥3 người nói "sẽ trả" trước khi
> viết phần này. Code đã có, nhưng con số đó vẫn phải đi hỏi — và nếu dưới 3 thì
> việc phải làm là xem lại mô hình giá, không phải sửa code.

### Chặn ở đâu — hai loại, không nhầm lẫn

| Loại | Chặn ở | Vì sao |
|---|---|---|
| Hạn mức 30 phiếu/tháng | **Client** (`core/receiptQuota.ts`) | Free chạy hoàn toàn trên máy người dùng. Ai vọc DevTools để ghi thêm phiếu trên máy của chính họ thì ta không mất gì |
| Đồng bộ · công nợ đám mây · sao lưu | **Database** (`0008`, `has_active_sync()` trong policy ghi) | Có chạm máy chủ. Chặn bằng JavaScript ở đây là chặn giả |

Policy **đọc** giữ nguyên mở. Hết hạn thì ngừng đẩy lên, không giữ dữ liệu làm
con tin — ràng buộc F §4.2, và cũng là lý do banner nói "vẫn dùng được trên máy
này" chứ không doạ mất sổ.

### Bốn quyết định đáng ghi

1. **Không có trạng thái `grace` / `expired` trong database.** Kế hoạch gọi tên
   chúng, nhưng cột chữ chỉ đúng nếu có tiến trình chạy định kỳ đổi nó — mà dự
   án không có cron. Cả `has_active_sync()` lẫn `core/subscription.ts` **suy ra
   từ ngày tháng**, nên hai bên luôn nói cùng một điều và không bao giờ ôi thiu.
2. **`src/billing/` đổi thành `features/billing/` + `core/subscription.ts`.**
   Kế hoạch F §3.2 đặt tên thư mục mới ở gốc `src/`, nhưng thư mục đó không nằm
   trong bảng ranh giới §3.1 và dependency-cruiser sẽ không có luật nào cho nó.
   Tên thư mục không đáng đổi lấy một lỗ hổng trong hàng rào duy nhất ép được
   bằng máy.
3. **Bậc gói nhớ trong máy** (`data/subscriptionStore.ts`). Không có nó thì một
   lần hỏi máy chủ hụt là người đã trả tiền bị hạ về bậc miễn phí và chặn ở
   phiếu thứ 31 giữa buổi cân. Chiều ngược lại (người vừa hết hạn còn hạn mức
   thêm một lúc) là cái giá cố ý — phần thật sự đáng tiền là đồng bộ, và cái đó
   máy chủ chặn.
4. **Thêm hai action `importSuppliers` · `importReceipts`** vào `StoreValue`.
   Gọi `addTransaction` 500 lần là 500 lần ghi cả quyển sổ xuống IndexedDB —
   thời gian tăng theo bình phương số dòng. Gộp lại còn một `commit`, và chính
   điều đó làm "không nhập nửa vời" thành thật chứ không phải lời hứa.

### Lỗi thật test bắt được

**Mọi phiếu nhập từ Excel lùi một ngày.** Ô ngày `01/08/2026` được `xlsx` trả về
là `2026-07-31T17:00:00.000Z` (nửa đêm giờ Việt Nam), và `.toISOString()` cắt ra
`2026-07-31`. Sửa: đọc bằng thành phần **giờ máy** rồi chốt vào **giữa trưa** —
lệch ±12 tiếng vẫn rơi đúng ngày. Đã kiểm tròn vòng với chính `xlsx` chứ không
chỉ với ô giả trong test.

### Chuyện nhỏ mà phải sửa

- `core/search.ts` giữ riêng hàm bỏ dấu tiếng Việt; phần đọc tiêu đề cột Excel
  cần đúng hàm đó ⇒ tách ra `core/vietnameseFold.ts`, dùng ở hai nơi.
- `sync.ts` phân biệt **máy chủ từ chối vì hết gói** (`42501`) với **mất mạng**:
  loại đầu KHÔNG đốt lượt thử lại và không đánh dấu phiếu "cần xem lại" — chúng
  lành lặn, chỉ đang đợi. Trả tiền xong là cả hàng đợi tự đi tiếp.
- `0009` thu hồi quyền ghi mức bảng trên `profiles` rồi cấp lại theo cột: quyền
  mức bảng phủ mọi cột, nên không thu hồi trước thì `referral_code` và
  `referred_by` vẫn nằm trong tay client.

### Chạy thật đã kiểm

| Việc | Kết quả |
|---|---|
| Hạ `FREE_RECEIPTS_PER_MONTH` xuống 0, mở `/tao-phieu` | Ra **màn chạm hạn mức** với số của chính sổ đó ("8 / 0"), không phải form |
| Chế độ trình diễn đang bật | **Không** bị hạn mức — sổ mẫu có sẵn hơn 30 phiếu |
| Excel tròn vòng: ghi file → đọc lại → dựng phiếu | `01/08/2026` ra đúng ngày 1/8, 12h; số `14.500` ra 14500 |
| Tiêu đề cột gõ không dấu, viết hoa (`TEN NONG HO`) | Nhận đúng cột |
| 15 route ở 375px | **Không route nào cuộn ngang**, không lỗi console |

### 🔴 Chưa kiểm được

Toàn bộ phần đụng vào tiền: webhook, chống trùng, chữ ký, kích hoạt tay, hoàn
tiền. Cần Supabase thật + một lần chuyển khoản thật. Bảng kiểm 10 mục ở
[`supabase/VAN_HANH.md`](supabase/VAN_HANH.md) §7.3. Số tài khoản trong
`config.ts` vẫn là **chỗ điền**.

---

## Giai đoạn G — Site & pháp lý · 11/08/2026

**Kết quả:** bốn trang tĩnh, và ba thứ trong app mà hai trang pháp lý phải dựa
vào mới nói thật được.

### Nguyên tắc chi phối cả giai đoạn

> Điều nguy hiểm không phải văn phong nghiệp dư, mà là **viết một đằng hệ thống
> làm một nẻo**.

Vì vậy thứ tự làm bị đảo so với kế hoạch: **viết code trước, viết trang sau**.
Ba câu dưới đây lúc bắt đầu giai đoạn G đều còn là lời hứa suông, nay mới có
thật:

| Câu trên trang pháp lý | Thứ phải xây để câu đó thành thật |
|---|---|
| "Bấm Xoá tài khoản là xoá hẳn, kể cả ảnh chứng từ" | `delete_own_account()` + `data/account.ts` |
| "Quản trị viên chỉ chạm dữ liệu khi bạn yêu cầu, có ghi nhận" | Bảng `admin_access_log`, hai script quản trị bắt buộc khai tên người duyệt |
| "Không có công cụ thống kê, không tải gì từ máy chủ ngoài" | `npm run site:check` chặn `<script>` và mọi tài nguyên ngoài |

### Ba quyết định đáng ghi

1. **`site:check` đứng NGOÀI `npm run verify`.** Site còn chỗ trống chờ nhóm
   điền (tên chủ thể, địa chỉ, vùng máy chủ, ảnh chụp), mà `verify` phải xanh
   suốt trong lúc làm. Cái này chặn **deploy**, không chặn commit — nên nó kiểm
   được cả thứ mà lint không kiểm được: giá trên site khớp `config.ts`, số Zalo
   khớp, không có `<script>`, không nạp gì từ máy chủ ngoài.
2. **Chỗ trống hiện màu vàng chọc mắt** (`class="fill"`), không phải ghi chú lặng
   lẽ trong comment. Một trang pháp lý phát hành kèm "ĐIỀN: …" là lỗi nghiêm
   trọng hơn nhiều so với một trang chưa đẹp — nó phải khó bỏ qua.
3. **Site dùng chữ có sẵn của máy, không tải Be Vietnam Pro từ máy chủ ngoài.**
   Kế hoạch §4.4 chỉ đòi dùng chung **bảng màu**, và màu thì chép nguyên. Tải
   font ngoài là gửi địa chỉ IP người đọc sang bên thứ ba, ngay trên trang vừa
   hứa không có bên thứ ba nào theo dõi họ.

### Xoá tài khoản — thứ tự không được đổi

Ảnh trên Storage **xoá trước**, rồi mới xoá `auth.users`. Ảnh không đi theo
`on delete cascade`, và ngay khi hàng người dùng mất thì không ai còn quyền xoá
chúng nữa (policy Storage khớp `auth.uid()`). Làm ngược lại là để ảnh chứng từ
của người ta nằm lại vĩnh viễn — đúng thứ trang Quyền riêng tư vừa hứa không xảy ra.

Hai thứ **cố ý ở lại** sau khi xoá, đều không kèm tên: dòng đối soát tiền
(`bank_transactions.user_id` là `on delete set null` — nếu xoá theo thì xoá tài
khoản trở thành cách dùng lại một mã giao dịch ngân hàng) và dòng nhật ký hỗ trợ
(`admin_access_log` không có khoá ngoại — nhật ký mà xoá được thì không còn là
nhật ký). Cả hai đã nói rõ trên trang Quyền riêng tư §6.

### Một điều phải khai mà suýt quên

Màn chuyển khoản tải ảnh QR từ **vietqr.io**, tức là gửi số tiền và nội dung
chuyển khoản sang một bên thứ ba. Đã liệt kê trong bảng "Bên thứ ba có thể thấy
gì". Tìm ra bằng cách `grep https:// src/` chứ không bằng cách nhớ lại — nên
mỗi lần thêm địa chỉ ngoài phải chạy lại phép grep đó và sửa trang.

### Chạy thật đã kiểm

| Việc | Kết quả |
|---|---|
| Ô đồng ý điều khoản | **Không tick sẵn**; không tick mà bấm đăng ký → hiện lỗi, không đăng ký |
| Hai liên kết trong ô đồng ý | Đúng địa chỉ site, mở tab mới |
| Nút xoá tài khoản: để trống · gõ sai tên vựa · gõ đúng | Mờ · mờ kèm "Chưa khớp tên vựa" · sáng lên |
| Vị trí thẻ xoá tài khoản | Nằm **sau** thẻ "Dữ liệu của bạn" — đường đi ngang qua nút "Lưu ra file" |
| Bốn trang site ở 375px và 320px | Không trang nào cuộn ngang; bảng dài cuộn trong khung của nó |
| Liên kết giữa bốn trang | Không liên kết nào gãy |
| `site:check` | Chặn đúng 10 chỗ còn `ĐIỀN:`; giá, số Zalo, không-script đều qua |
| `git grep demo@thumua365` | Không có — bản dựng lại chưa từng có tài khoản demo |

### 🔴 Chưa kiểm được

Nút xoá tài khoản **chưa chạy lần nào** — cần Supabase thật và một tài khoản
thử, rồi kiểm cả bảng lẫn Storage. Lighthouse trang tĩnh và việc cài PWA lên
iPhone / Android thật cũng phải đo trên bản deploy.

---

## Bỏ luật 300 dòng mỗi file · 09/10/2026

Theo issue #7. Luật "file trong `src/` ≤ 300 dòng" (thêm ở `5c1dcec`, giai đoạn
A) đếm cả dòng trống, comment và dòng do formatter tách, nên chặn PR vì định
dạng chứ không vì thiết kế: PR #6 đỏ CI vì `store.tsx` dài 312 dòng, trong khi
phần logic thêm vào chỉ khoảng 15 dòng. Từ nay việc tách file do review quyết
theo trách nhiệm của file.

- `scripts/check-rules.mjs`: bỏ `MAX_LINES` và bước kiểm độ dài; các luật khác
  giữ nguyên.
- Bỏ luật khỏi `README.md`, `deploy_plan/README.md` §3.3 và §3.9, các ô kiểm
  ở `deploy_plan/` A, D, E, H; sửa comment ở `labels.ts`, `screenLabels.ts`.
  Mục "Chuyện nhỏ mà phải sửa" của giai đoạn E giữ nguyên như nhật ký.
- Bảng chỉ số dưới đây còn ba số; số đo cũ ghi ở chú thích dưới bảng.
- Repo backend bỏ chỉ số cùng loại cùng ngày (Thumua365_BE#19).

---

## Logo · mã kết nối dễ thấy · màn Nhân viên dạng dashboard · 14/10/2026

Cần `@mambo/*` **0.13.0** (`api.reports.members`) — `package.json` đã trỏ release `v0.13.0`.

- **Logo**: `public/logo.svg` (bản gốc `Logo/logo.svg` ngoài repo, thêm `viewBox` để co giãn), `favicon.svg` là
  cùng file. PNG dựng lại từ SVG: `icon-192`, `icon-512` (nền trong), `icon-512-maskable` (nền trắng, logo
  trong vùng an toàn 70%), `apple-touch-icon` (180px, nền trắng — iOS tô đen nền trong). Manifest tách `any` /
  `maskable` thay vì một icon `any maskable`. `<Logo>` ở sidebar, màn đăng nhập, trang pháp lý.
- **Mã kết nối**: vẫn mỗi nông hộ một mã (không có mã chung của vựa — nhóm chọn giữ mô hình cũ). Cột "Kết nối"
  trên danh sách Nông hộ / Người mua: đã kết nối · mã đang chờ · nút "Lấy mã". Thẻ "Mã kết nối cho nông hộ"
  trên Tổng quan. Danh sách và thẻ chi tiết dùng chung một `useLinks` nên lấy mã ở đâu cũng thấy ngay.
- **Nhân viên**: chọn tháng, lọc chi nhánh, bốn số tổng, mỗi người số phiếu / tiền mua / lần ghi trả / lần làm
  gần nhất. Thêm người chuyển vào hộp thoại. Thẻ "Nhân viên hôm nay" trên Tổng quan của chủ.
- **Người làm không tự rời** (BE 0.13.0): bỏ nút "Rời tổ chức" của thẻ Tổ chức (#26 thêm theo BE 0.12.0) và
  `leaveOrg`; thẻ chỉ nhắc "nhờ chủ gỡ bạn ra". `deleteAccount` bắt `STILL_MEMBER` → `L.deleteAccountStillMember`.

---

## Bản đồ thu mua · 16/10/2026

Cần `@mambo/*` **0.14.0** (`api.places`, quyền `place:manage`). **`package.json` còn trỏ release `v0.13.0`**:
BE phát hành `v0.14.0` xong mới đổi 3 URL rồi `npm install` để lock có integrity thật — trước đó CI đỏ ở
typecheck. Chuyển từ prototype LiveMap (`k20elite/LiveMap`)
sang, viết lại theo khung của app (BottomSheet, Toast, ConfirmDialog, nhãn tiếng Việt trong `i18n/mapLabels.ts`).

- **Hai màn**: `/ban-do` (mọi vai trò có tổ chức; sổ của máy này không có) và `/dia-diem` "Địa điểm của tôi"
  (chủ vựa, chủ / quản lý doanh nghiệp). Nông dân có Bản đồ ở thanh dưới, ô thứ 3. `/ban-do?xem=<id>` mở popup,
  `?sua=<id>` mở form sửa — `mapLinks.ts` tách riêng để màn danh sách không kéo Leaflet.
- **Leaflet chỉ nằm trong chunk `MapPage`** (170 KB, gzip 51 KB) — luật depcruise `leaflet-chi-o-ban-do` chặn
  import từ ngoài `features/map/`. JS khởi tạo không đổi.
- **Tải theo khung nhìn**: `GET /v1/places?bbox=` mỗi lần dừng kéo, huỷ yêu cầu cũ bằng `AbortSignal`, kẹp bbox
  về ±180/±90 (thu nhỏ hết cỡ Leaflet trả kinh độ > 180 → máy chủ 422). Trả về chạm `PLACES_PAGE_LIMIT` (500)
  thì báo "phóng to để thấy hết".
- **Kiểm ở máy bằng cùng schema với máy chủ** (`PlaceInput` của contracts); lỗi 422 của máy chủ gắn vào ô,
  `lng` gộp vào `lat` vì form chỉ có một dòng Vị trí. Vượt `PLACES_PER_ORG_LIMIT` (100) báo kèm con số.
- **Hoàng Sa, Trường Sa**: nhãn chủ quyền vẽ đè trên nền; khung Việt Nam (`VN_BOUNDS`) gồm cả hai quần đảo.
- **Tile**: mặc định OpenStreetMap — miễn phí, phải ghi nguồn, **không cho lưu lượng lớn**
  (https://operations.osmfoundation.org/policies/tiles/). Đổi bằng `VITE_TILE_URL` / `VITE_TILE_ATTRIBUTION`.
  `TileLayer` gửi `referrerPolicy="strict-origin-when-cross-origin"` vì Vercel đặt `no-referrer` cho cả trang
  mà OSM chặn yêu cầu không có Referer.
- **Màu ghim** là token `--color-trader` / `--color-enterprise` / `--color-me` (đủ day / sun / night); SVG ghim
  dùng `currentColor`, không ghi cứng mã màu.
- **Ghi đè CSS của Leaflet phải có tiền tố `.map-page`**: `leaflet.css` nạp sau `index.css` (chunk MapPage),
  cùng độ ưu tiên là thua — popup giãn dòng, nền trắng ở chế độ đêm.

### Chạy thật đã kiểm (16/10/2026)

Edge thật qua Playwright, mọi thứ ở máy: FE dev · API build từ `feat/ban-do` · DB docker · Supabase Auth giả
(JWKS ES256 tự phát) — không chạm staging; mọi yêu cầu ra host khác (trừ tile OSM) bị chặn và đếm = 0.
26/26 bước, chạy hai lần liền: chủ vựa (xem, popup, Chỉ đường / Gọi, lọc, thêm, sửa, gỡ, "Địa điểm của
tôi", link `?xem` / `?sua`, id lạ), nông dân trên điện thoại (thanh dưới, bố cục, popup, bị chặn `/dia-diem`),
người cân, chủ / nhân viên doanh nghiệp, chặn quyền vị trí. Lỗi chạy thật bắt được (test đơn vị không thấy):
CSS bị leaflet.css đè; ghim giữ tên cũ sau khi sửa (`Marker` không cập nhật `title`); bấm ghim lúc đang bay
tới vị trí của tôi thì popup trôi khỏi màn hình; lỗi ô tên không tắt khi gõ lại.

## Nháp giữ khoản cộng/trừ · `@mambo/*` 0.15.0 · 17/10/2026

Trước đây khoản cộng/trừ chỉ nằm trong state của màn lập phiếu: chuyển khách hoặc "Để dành" là mất (bảng
`drafts` không có chỗ lưu). BE v0.15.0 thêm `drafts.adjustments`. **API phải lên trước app**: app mới gửi
`adjustments` lên API ≤ 0.14 thì op bị từ chối và nháp kẹt "xung đột".

- `useDraftReceipt`: lấy khoản từ nháp đã lưu, tự lưu khi khoản đổi. `save()` luôn gửi đủ `adjustments`,
  `note` và `counterpartyId`, kể cả khi trống.
- `draftToPatch` gửi theo **khoá có mặt** (`'note' in patch`) chứ không theo `!== undefined`. Đây là lỗi cũ:
  gỡ hết khoản, xoá ghi chú hay bỏ khách thì máy chủ không biết, và lần kéo về sau dựng lại đúng cái vừa gỡ.
  Khoản trống gửi `null`, không gửi `[]`.
- Ô số tiền của khoản làm tròn về đồng nguyên (các ô tiền khác: xem mục làm tròn tiền bên dưới).
- Màn bản đồ có `h1` ẩn (`sr-only`) cho trình đọc màn hình. Nút xoá từng khoản có `aria-label` "Xoá <tên khoản>".
- Chạy thật (local, hai trình duyệt chung một sổ, 1280 và 390px): 9/9. Máy 2 với sổ trống kéo về thấy đủ khoản;
  gỡ khoản và xoá ghi chú thì máy chủ thành `null`; chốt phiếu mang khoản, số trả đúng.

## Ô tiền gõ lẻ được, lưu đồng nguyên · 17/10/2026

Ô tiền dùng chung `NumberField` với ô cân nên gõ được dấu phẩy. Máy chủ chỉ nhận tiền là `int`: một lần trả
`500000,5` bị từ chối và op kẹt "xung đột". Người dùng chọn **cho gõ, app tự làm tròn** (không chặn phím phẩy).

- `features/shared/money.ts`: `parseMoney` = làm tròn tới đồng gần nhất (0,5 lên). Dùng cho mọi ô tiền: khoản
  cộng/trừ, trả một phần khi chốt, trả nợ, tiền cố định của quy tắc giá, giá đề nghị của đơn.
- `NumberField` có prop `money`: gõ lẻ thì dòng gợi ý (và bàn phím số) báo "Tiền không có số lẻ, sẽ lưu X₫".
  Ô tiền mới **phải** dùng `parseMoney` và bật `money`. Đơn giá, khối lượng, phần trăm được lẻ, không dùng.
- `wireMappers` làm tròn mọi trường tiền lần nữa trước khi gửi (lưới cho dữ liệu lẻ có sẵn trong máy).
  Op lẻ **đã kẹt** từ trước trong hàng đợi thì không sửa được bằng cách này: dữ liệu đã được map lúc xếp hàng.
- Cùng đợt: `Dialog` có `max-h` + tự cuộn. Trước đây hộp cao hơn màn hình (form quy tắc giá ở laptop 900px
  và điện thoại) đẩy nút **Lưu** ra ngoài màn hình, không cuộn tới được.
- Chạy thật (local, 1280 và 390px): 7/7. Máy chủ nhận đúng 30.001 / 500.001 / 100.000 / −20.001, hàng đợi
  trong máy rỗng. Hồi quy: khoản cộng/trừ 9/9, lập phiếu 11/11.

## Quên mật khẩu · xác nhận email · mật khẩu 8–72 · `@mambo/*` 0.16.0 · 16/10/2026

Trước đây không có "Quên mật khẩu": đăng nhập bằng email nội bộ `84…@id.thumua365.vn`, nên thư Supabase không
tới ai. Email khôi phục cũng chưa từng được xác nhận. Máy chủ (BE 0.16.0) giờ gửi thư qua Brevo:

- **Xác nhận email**: lưu email khôi phục thì máy chủ gửi link `/xac-nhan-email?token=…`. Thẻ Tài khoản hiện
  "Đã xác nhận" / "Chưa xác nhận" + nút "Gửi lại thư xác nhận" (60 giây một thư). Trang xác nhận không cần đăng nhập.
- **Quên mật khẩu**: nút ở màn đăng nhập (chỉ khi có máy chủ), gõ tên đăng nhập / SĐT / email. Luôn hiện cùng
  một câu (không cho dò ai có tài khoản) + link Zalo kỹ thuật viên. Chỉ email **đã xác nhận** mới nhận thư.
  Link `/dat-lai-mat-khau?token_hash=…&type=recovery` → `verifyOtp` → đặt mật khẩu mới → vào sổ.
  Máy đang đăng nhập sẵn thì trang không đụng phiên đó, chỉ đường sang Tài khoản.
- **Một luật mật khẩu**: 8–72 ký tự ở đăng ký, đổi mật khẩu, đặt lại, thêm nhân viên (`MIN/MAX_PASSWORD_LENGTH`
  lấy từ contracts, `features/shared/password.ts`). Màn đăng nhập không kiểm độ dài: mật khẩu cũ 6–7 ký tự
  vẫn vào được. Đăng ký kiểm thêm tên bắt buộc.
- Chính sách 2.2 (16/10/2026): thêm Brevo là bên xử lý email.
- SDK 0.16 kiểm phản hồi theo contract (`recoveryEmailVerified`) ⇒ **BE phải lên trước FE**.
- Chạy thật (local, 1280 và 390px): 14/14.
- Chưa có `BREVO_API_KEY` + `MAIL_FROM` trên Render thì cả hai loại thư báo "chưa gửi được thư".

## Số Zalo hỗ trợ thật · nút hiện/ẩn mật khẩu · 17/10/2026

- **#40**: `SUPPORT_ZALO` trong `src/config.ts` đổi từ số giả `0912345678` sang số thật `0969158913` (form Quên
  mật khẩu, thanh toán QR, trang Gói, trang Pháp lý) và `site/*.html`. Số mẫu trong `workbookFile.ts` và test giữ
  nguyên vì là dữ liệu giả có chủ đích. `site:check` vẫn còn 10 chỗ `ĐIỀN:` có từ trước (họ tên, địa chỉ, ảnh).
- **#41**: `Input` dùng chung tự có nút con mắt cho mọi ô `type="password"` (đăng nhập, đăng ký, đổi/đặt lại mật
  khẩu, tạo nhân viên). Nút `type="button"` + `aria-label` + `aria-pressed`; ô truyền `suffix` riêng thì giữ suffix đó.

## Audit "Phải sửa" · điện thoại P0/P1 · #42 #36 #37 · 18/10/2026

Đã merge và lên production (`7cf057f`). CI xanh, `verify` 211 test. **Chưa thử trên điện thoại thật / trình duyệt
với tài khoản thật** — các luồng đồng bộ dưới đây mới qua unit test và review.

- **#42 · 5 mục "Phải sửa" của audit 13/10**:
  - Hàng đợi không kẹt sau 5 lần lỗi mạng (thử lại 5 phút một lần). Op bị từ chối có banner Gửi lại / Bỏ. "Bỏ" gỡ
    op đó cùng mọi op sau nó của cùng bản ghi (`dropConflictedRecord`). Thêm mới thì xoá bản ghi khỏi sổ
    (`forgetRecord`), sửa / xoá thì bỏ con trỏ để kéo lại bản máy chủ.
  - `syncOnce` không tự ghi sổ / con trỏ / mốc đồng bộ. Store gộp phần kéo về vào sổ **mới nhất** trong chuỗi ghi
    (`rebasePulled`, bảo vệ bản ghi còn op chờ + đang ghi dở) — phiếu ghi trong lúc kéo không mất. `bookEpoch` tăng
    khi thay hẳn sổ (đổi tổ chức, nạp file, mẫu, xoá hết, bỏ op kẹt); lượt kéo cũ không gộp vào sổ mới.
  - Thoát HTML khi xuất PDF.
  - Chỉ khi sổ **đang đồng bộ** (`syncsWithServer`: có máy chủ + `book:sync` + gói không phải free + không bị chặn)
    mới ẩn "Lấy lại từ file" và `importData` ném lỗi. Gói free vẫn dùng được ⇒ FAQ landing không phải sửa.
  - Dữ liệu mẫu bật theo từng sổ (`thumua365:demo` = id sổ; giá trị cũ `'1'` vẫn hiểu là bật), không xếp op.
  - Đăng xuất khi còn op chưa gửi: hỏi lại ("Vẫn đăng xuất" thì bỏ op), không chặn cứng. Trước đây gói free
    (không đẩy được op) sẽ không đăng xuất được nữa — 11 tổ chức đang dùng thử hết hạn 15/11.
- **#36 · Điện thoại P0**: biểu đồ 7 ngày hiện cột; thanh tổng tiền + nút chốt ở Tạo phiếu dính đáy, chừa
  safe-area, cuộn ô nhập không bị thanh che (`html.sticky-total`); nút ‹ Quay lại ở màn con (app `standalone` không
  có back). Mở thẳng từ link (`history.state.idx === 0`) thì về màn cha (`backTarget`), không rời app. Đổi khách ở
  Tạo phiếu dùng `replace`, không thêm lịch sử.
- **#37 · Điện thoại P1**: báo cáo thuế một cột dưới `sm`, số không tràn; banner dữ liệu mẫu một dòng; chạm cả thẻ
  để mở ở Nông hộ / Người mua / Mặt hàng / Quy tắc giá (stretched link, nút / link / mã kết nối nổi trên lớp phủ);
  bộ lọc Phiếu 2 hàng, chip đang chọn tự cuộn vào tầm nhìn. **Đánh đổi:** nhấn giữ để chép chữ trên thẻ không còn
  được (trừ mã kết nối).
- **Còn lại**: "Đưa sổ của máy vào tài khoản" (`useDeviceBook`) đi qua `importData` ⇒ với sổ đang đồng bộ giờ báo
  lỗi thay vì trộn ngầm. Muốn hỗ trợ thật thì phải sinh op cho từng bản ghi. `esc` trong xuất PDF trùng
  `escapeHtml` nhưng khác tầng — gộp thì phải đưa vào `@mambo/core`.

## Đơn còn lại khi bên kia xoá tài khoản · `@mambo/*` 0.17.0 · 18/10/2026

App dành cho vựa ghi sổ; nông dân chỉ vào xem. Trước đây nông dân xoá tài khoản thì đơn của vựa với họ bị xoá theo.
BE 0.17.0 (PR BE #36) giữ đơn trong sổ bên còn lại. Bên đã xoá được đưa về null, đơn còn mở tự huỷ với ghi chú
"Bên kia đã xoá tài khoản — đơn tự huỷ", và kết nối chuyển `revoked` nên vựa mời lại được.

- `OrderSummary.counterpart` có thể null. Thêm `partnerName` (tên trong danh bạ của mình, null nếu không có dòng).
- `counterpartName(o)` (`OrderCard.tsx`): có `counterpart` thì lấy tên đó, không thì
  "`partnerName` (đã xoá tài khoản)". Thẻ đơn, tiêu đề, lịch sử đơn và ô "Theo đơn" đều dùng hàm này. Trang chi
  tiết hiện thêm dòng giải thích `orderCounterpartGoneHint`.
- `orderActions`: `counterpart === null` thì tắt mọi nút. Đơn như vậy luôn đã đóng (huỷ / cân xong); đây là lớp
  chặn thứ hai.
- **Thứ tự deploy ngược với 0.16**: FE trước, API sau. SDK 0.17 đọc được phản hồi của API cũ nhờ
  `partnerName` có `.default(null)`. SDK 0.16 thì không đọc được `counterpart: null` của API mới.
- **Chưa làm**: `linkState` chưa có trạng thái "đã kết thúc". Chưa phân biệt được kết nối bị huỷ vì bên kia
  xoá tài khoản với lời mời bị huỷ khi chưa ai nhận, vì cả hai đều có `counterpart` null. Vựa vẫn thấy "Lấy mã"
  để mời lại, kèm thông báo `link.revoked`.

## Rà soát đồng bộ · `@mambo/*` 0.18.0 · 19/10/2026

Theo báo cáo rà soát hai repo (cùng đợt với BE `v0.18.0`). Ba lỗi làm kẹt hàng đợi và vài lỗi đồng bộ:

- **Mặt hàng mẫu `prod-…`**: sổ của tổ chức nạp lên thì bỏ mặt hàng mẫu (`withoutLegacyProducts`); chỉ sổ trên
  máy (không có máy chủ) mới có sẵn mặt hàng mẫu (`starterData`). `derivedOps` không sinh op cho id `prod-…`.
- **Chặn op hỏng trước khi vào hàng đợi**: `opCheck.ts` dùng đúng `parseSyncOp` của máy chủ; `commit` ném lỗi
  trước khi sổ đổi. Tạo phiếu / để dành báo bằng toast, tự lưu nháp hiện "Chưa lưu được".
- **Ô nhập**: `NumberField` có `max` (phím làm số vượt mức thì không ăn); % chất lượng / hao hụt ≤ 100, số cân /
  đơn giá ≤ 1 tỷ; `toLine` kẹp lại cho nháp cũ. Tối đa 100 dòng, 20 khoản cộng/trừ, nhãn 120, ghi chú 2000, tên
  khách 200 — đều lấy từ `RECEIPT_LIMITS`.
- **"Bỏ thao tác này"** trên phiếu thêm mới: bỏ luôn các lần trả của phiếu đó (`dropWithDependents`), không thì
  máy chủ trả `PARENT_MISSING` mãi.
- **Lỗi lặp lại**: op bị máy chủ trả `PARENT_MISSING` / `INTERNAL` `MAX_REJECTED_TRIES` lần (~6 phút) thì thành kẹt,
  có banner "Gửi lại" / "Bỏ". `RATE_LIMITED`, mất mạng, cả lượt gửi hỏng (502/503 lúc Render khởi động) vẫn thử mãi.
- **Đổi chi nhánh**: op bị từ chối `BRANCH_SCOPE` tự bỏ (kèm op sau của cùng bản ghi), gửi tiếp ngay trong lượt;
  toast `BranchDropNotice` báo số đã bỏ. Hàng đợi trống thì lần kéo dựng lại sổ theo chi nhánh mới.
- **Gói hết hạn**: vẫn kéo về (trước đây dừng hẳn khi còn op chờ) — `status.blocked` vẫn bật.
- Op `prod-…` bản app cũ đã xếp vào hàng đợi: `flushQueue` tự gỡ, không gửi.
- Test 232 (+ `opCheck`, kẹp số, bỏ lần trả theo phiếu, kẹt sau N lần, `RATE_LIMITED`, `BRANCH_SCOPE`, op `prod-…`,
  kéo về khi hết gói).
- **Phát hành 19/10:** API trước (BE #38 `fa568e4`, `/v1/health` `0.18.0`), rồi #48 (lock theo release `v0.18.0`,
  CI xanh, merge `3c40db7`); bundle production có code mới.

## Hàng đợi không kẹt vì cả lượt bị từ chối · `@mambo/*` 0.19.0 · 19/10/2026 · đợt 1, đã phát hành

Theo `prompt-sua-loi-thumua365.md` (đợt 1: lỗi gốc chung, A1, A2, A3, B2, B9).

- **Lỗi gốc chung**: cả lượt `/sync/push` bị từ chối (413, 422 vỏ request, `NOT_A_MEMBER`, mạng, 5xx) trước đây
  gắn cờ kẹt cho **op đầu** — "Gửi lại" gặp lại lỗi cũ, "Bỏ" xoá op vô can. Giờ: không op nào bị gắn cờ; hẹn lại
  từ op đầu (giãn cách theo `tries`), giữ nguyên hàng đợi. Lỗi không phải mạng bật `status.refused` → banner
  "Máy chủ chưa nhận lượt gửi này" (không nói "mất mạng"). Chỉ `results[i].rejected` mới là lỗi của một op.
- **Kiểm vỏ ở máy** bằng `SyncPushInput` (đúng luật cổng gây 422 cả lượt). Không dùng `SyncPushRequest`: lỗi `data`
  máy chủ đã trả theo từng op; kiểm cả `data` ở đây chỉ trùng việc `opProblem`. Seq không tăng → cắt lô trước chỗ đó.
- **A1**: lô cắt theo `SYNC_PUSH_MAX_OPS` **và** `SYNC_PUSH_MAX_BYTES` (700KB, đo UTF-8 của cả thân). 413 → chia đôi
  lô; một op đơn lẻ vẫn 413 mới kẹt (`PAYLOAD_TOO_LARGE` + câu báo). Một lượt `flushQueue` gửi nhiều lô liền tới
  hết op tới hạn. Các `update` **liền nhau** của cùng một nháp gộp thành một op (gộp nông `data`), mang opId/seq
  của op **cuối** — lấy op đầu thì gửi lại nhóm có thêm lần lưu mới bị coi là `duplicate`, mất chữ. Nhận xong xoá
  hết op trong nhóm.
- **A2**: `getDeviceId` dùng `newId()` của core; id đã lưu không phải UUID (`dev-…` của bản cũ) thì sinh lại.
- **A3**: `seq` cấp trong transaction ghi op: `max(Date.now()*1000, seq lớn nhất trong 'queue' + 1)`, đọc qua index
  `seq` cursor `'prev'`, cùng transaction `readwrite` (hai tab không trùng). Bỏ `nextSeq()` (mốc trong bộ nhớ).
- **B2**: `warnings` (`ORDER_NOT_OPEN`, `RECORD_DELETED`) đi từ `flushQueue` → `syncOnce` → store `syncWarnings`
  (cộng dồn) → toast. Lần trả mang theo `transactionId` + `amount` để câu báo nói "Lần trả 500.000 đ cho phiếu
  Chú Bảy, 19/10". `useOrders`/`useOrder` hỏi lại khi số `ORDER_NOT_OPEN` tăng.
- **Một toast mỗi lượt**: `ToastProvider` chỉ giữ MỘT toast (câu sau đè câu trước) ⇒ `SyncNotices` gộp số op bỏ
  vì đổi chi nhánh + cảnh báo vào một câu (`syncNoticeText.ts`: kể 2 cái đầu, còn lại "+n"). Thay
  `BranchDropNotice` (đã xoá). Tên file thuần không được chỉ khác hoa/thường với component (TS1261, gãy trên CI).
- **Lỗi ẩn sửa thêm khi rà (cùng đợt)**:
  - Hai tab cùng đẩy: `flushQueue` chạy trong `navigator.locks` (`thumua365-push:<org>`). Không có Web Locks thì
    vẫn gửi nhưng **không gộp nháp** — gộp mà tab kia đã gửi op giữa nhóm thì op cuối cũ đè chữ mới.
  - Mỗi lô đọc lại hàng đợi (`readyOps`), không dùng ảnh chụp đầu lượt: op ghi thêm trong lúc gửi vẫn đúng thứ tự,
    op đã xoá (Bỏ / BRANCH_SCOPE) không gửi lại. BRANCH_SCOPE `break` rồi đọc lại, không đệ quy (từng treo).
  - Op kẹt từ trước luôn vào `conflicts` (cả khi lượt này lỗi mạng) — không thì banner "Gửi lại / Bỏ" biến mất.
  - 413 từ proxy (Render trả HTML, SDK ra `INTERNAL` + status 413) cũng chia lô như `PAYLOAD_TOO_LARGE`.
  - Test hàng đợi cài stub Web Locks khi `navigator.locks` không có — CI chạy Node 22 (không có), máy local
    Node 24 (có). Đã chạy `tests/data` bằng `npx -p node@22`: xanh.
- **B9**: `QueuedOp.rejectedTries` — chỉ lần máy chủ từ chối op (PARENT_MISSING / INTERNAL) mới cộng; mất mạng
  chỉ cộng `tries` (giãn cách). `keepRetrying` xét `rejectedTries`. "Gửi lại" đặt cả hai về 0.
- **Chạy thử local 19/10** (Docker DB + API `npm run dev` + FE, tài khoản thật, sổ "Vựa Test Local" chỉ ở DB local;
  giả lập mạng bằng cách bọc `fetch` trong trang): phiếu lập khi mất mạng lên đủ; 200 nháp nặng 1,5MB → 3 lô
  ~700KB, không 413; op 1,2MB → máy chủ trả `PAYLOAD_TOO_LARGE` thật, kẹt đúng op, banner còn khi mất mạng, "Bỏ"
  xong op sau đi tiếp; hai tab → một tab gửi, không `duplicate`, nháp giữ bản cuối; 403 cả lượt → banner
  "Máy chủ chưa nhận", không kẹt; toast gộp 3 cảnh báo; deviceId `dev-…` đổi sang UUID.
- **Sửa thêm sau chạy thử**: `isDue` coi mốc hẹn hỏng/thiếu là tới hạn (trước: `NaN` ⇒ chặn im cả hàng đợi);
  bước "Bạn là ai?" báo ô tên trống bằng tiếng Việt (`emptyFields`) thay câu zod tiếng Anh của máy chủ; toast
  không có "Hoàn tác" giữ theo độ dài câu (`toastDuration`, 60ms/ký tự, 8–20 giây).
- **Chạy thử hai luồng chéo tổ chức** (Vựa Test3 ↔ DN Test2, mỗi bên một profile Chrome; membership Test3 trong DN
  chèn tay ở DB local): DN huỷ đơn khi vựa còn phiếu theo đơn → `ORDER_NOT_OPEN`, phiếu giữ, gỡ khỏi đơn, toast
  nói rõ; chủ đổi chi nhánh nhân viên → op phiếu chi nhánh cũ bị `BRANCH_SCOPE` tự bỏ, toast báo, sổ dựng lại
  theo chi nhánh mới. Đạt cả hai.
- **Sửa sau đợt chạy thử này**: toast cảnh báo bỏ trùng (`entity:recordId:code`), bỏ nháp đã không còn, phiếu
  xếp trước lần trả (`worthTelling`); toast chốt phiếu in tổng thật + còn nợ/còn phải thu (`finishText.ts`,
  trước in số ĐÃ TRẢ dưới nhãn "Tổng phiếu" ⇒ "Ghi nợ & xong" ra "Tổng phiếu: 0đ"); hướng dẫn 4 bước theo
  chiều phiếu (`coachSteps`, phiếu bán "chọn người mua").
- Test 271 (+39: `localDb.test.ts`, `syncNoticeText.test.ts`, `toastDuration.test.ts`, `finishText.test.ts` mới; `isDue` hỏng, ô tên
  trống; hai tab, op ghi giữa lượt, 413 proxy, giữ banner kẹt; `sync.test.ts` cả lượt bị từ chối ×4, 200 op
  nháp to, 413 chia lô, op đơn lẻ quá lớn, gộp nháp, seq trùng, `ORDER_NOT_OPEN`, mất mạng rồi INTERNAL). Test cũ "FORBIDDEN cả lượt → kẹt op
  đầu" đã đổi theo hành vi mới.
- **Phát hành 19/10:** API trước (BE #40 `bd7eb2e`, `/v1/health` `0.19.0` lúc 13:53Z), rồi #50 (lock theo release
  `v0.19.0`, CI xanh, merge `3b03b53`); bundle production có code mới lúc 13:54Z.

---

## Trùng tên, ô nhập, ảnh, nhiều tab, đổi tài khoản · `@mambo/*` 0.20.0 · 20/10/2026 · đợt 2, chưa phát hành

Theo `prompt-sua-loi-thumua365.md` (đợt 2: B1, B3, B4, B5, B6, B7, B8, B10, C1, C4). C2, C3 chỉ đề xuất — xem
`docs/DE_XUAT_C2_C3.md` của BE. Nhánh `fix/dot2`, `package.json` khoá theo release `v0.20.0` của BE.

- **B1**: sổ của tổ chức là sổ máy chủ, kể cả lúc hết gói — chỉ sổ riêng trên máy mới có nút lấy lại từ file
  (`DataCard`, `ImportDataPage`). Nhập file vào sổ tổ chức từng làm sổ máy lệch với server.
- **B3**: không bao giờ gộp theo tên.
  - Lập phiếu gõ tên trùng người đã có mà chưa chọn ⇒ `NamesakeDialog` hỏi "người này hay người mới" (kèm SĐT,
    khu vực, số phiếu); trả lời đi vào `finish` dưới dạng `PartyChoice` → core `PartyMatch.asNew`.
  - Chip gợi ý ở ô người bán kèm SĐT / khu vực / ngày phiếu gần nhất khi tên trùng (`chipHint`) — hai chip
    "Anh Ba" giống hệt nhau thì bấm cũng như đoán (thấy lúc chạy thử).
  - Thêm ở danh bạ: luôn tạo người mới, chỉ nhắc `partyNamesakeHint`. Nhập file: hồ sơ đang kết nối
    (`linkedPartnerIds`) vào `keepApart`; không biết kết nối (lỗi mạng) thì không gộp ai.
- **B4**: `useAttempt` bọc mọi action của store ở form — `commit` ném (`opProblem`, sổ chưa sẵn sàng) thì toast
  thay vì im. Ô nhập đặt `maxLength` theo `PARTY_LIMITS` / `PRODUCT_LIMITS` / `NOTE_LIMITS` của contracts.
- **B5**: sửa đối tác xoá được SĐT, khu vực, ghi chú (gửi `null`, không bỏ trường); ghi chú cũ hiện khi mở sửa.
- **B6**: hàng đợi ảnh lưu `{ orgId, tries }` (bản cũ chuỗi `orgId` vẫn đọc được). Chỉ 413 / 415 / 400 có lý do mới
  bỏ ảnh; 401/403/429/5xx giữ ảnh, cộng `tries`, đủ `MAX_PHOTO_TRIES` thì báo một lần và không chặn ảnh sau nữa.
  SDK 0.20 đọc `statusCode` trong thân lỗi Storage.
- **B7** (tab khác mở bản app mới, nâng `DB_VERSION`):
  - `openLocalDb`: `blocking` / `terminated` / mở hỏng đều bỏ promise đã cache — lần sau mở lại, không dùng mãi
    kết nối đã đóng. `withReopen` thử lại một lần khi `InvalidStateError` / `VersionError`.
  - Vẫn không ghi được ⇒ `rescue.ts` cất op (kèm `opId` cấp sẵn) và phần sổ đã đổi (`bookChanges`) vào
    localStorage `thumua365_rescue`, store bật `reloadRequired` ⇒ `ReloadRequiredOverlay` che app ("Tải lại app
    để lưu"; cất cũng hỏng thì cho lưu sổ ra file). Lần mở sổ sau `drainRescued` đưa op vào hàng đợi với đúng
    `opId` (gửi trùng thì máy chủ báo `duplicate`) rồi áp lại phần sổ.
  - DB đóng hẳn ở lượt đồng bộ / ghi phần kéo về / mở sổ (không phải lần ghi của người dùng) ⇒ `noticeClosedDb`
    thử mở lại; không được thì `reloadRequired = 'idle'` ("không có gì bị mất"), không báo nhầm "không có mạng".
- **B8** (đổi tài khoản trên cùng máy, bị gỡ khỏi tổ chức):
  - `QueuedOp.userId`. `flushQueue` gọi `isolateOtherUsers` trước: op của người khác (và op bản cũ không có
    `userId`) sang `legacyQueue`, op của chính người này trở về. Op không chủ hiện ở `UnownedOpsCard` — chỉ gửi khi
    người dùng bấm "Của tôi — gửi đi" (`claimUnownedOps`); không đoán chủ.
  - `knownBooks.ts` (`thumua365_books:<userId>`) nhớ các sổ từng mở. `applyMe` so với membership: sổ bị gỡ mà không
    còn gì chưa gửi thì dọn ngay; còn thì giữ, `LeftOrgsDialog` cho xuất file rồi dọn. `NOT_A_MEMBER` lúc đồng bộ ⇒
    hỏi lại `/v1/me`, không gắn cờ kẹt. Đăng xuất dọn cả sổ đã bị gỡ (hợp membership + `knownBooks`).
  - `wipeOrgFromDevice` / `removeOpsOf` chỉ xoá op của người đó.
  - Ảnh chờ đẩy mang người chụp (`attachmentQueue` `{ orgId, userId, tries }`). `wipeOrgPhotos`: dọn sổ của một
    người chỉ xoá ảnh đã lên máy chủ và ảnh chờ của chính người đó; ảnh chờ của người khác hay chưa rõ người chụp
    (bản cũ) ở lại. Xoá tài khoản (`orgGone`) thì xoá hết. Đăng xuất đếm cả ảnh chưa gửi (`queuedPhotoCount`) — chỉ
    còn ảnh cũng phải hỏi. Sổ tổ chức mà chưa biết người dùng thì không nhận ảnh (`bookNotReady`).
  - `sweepOrphanBooks` sau mỗi lần `/v1/me` mới (có Supabase): dọn sổ không ai nhận — không nằm trong membership
    hiện tại, `knownBooks` hay bản `/v1/me` đã lưu của bất kỳ tài khoản nào trên máy, không phải sổ tài khoản máy,
    không còn op (của ai cũng vậy, cả cách ly) hay phần cất tạm. Đọc localStorage hỏng ⇒ không dọn gì. Đây là sổ bị
    gỡ từ trước bản này (chưa có `knownBooks`).
- **B10**: op bị bỏ vì đổi chi nhánh liệt kê từng phiếu / lần trả (người, ngày, tiền) ở `BranchDropCard`, ở yên tới
  khi bấm "Đã ghi lại"; toast chỉ đếm.
- **C4**: `EMAIL_TAKEN` (422 `details.reason`) ⇒ câu `L.emailTaken` "đổi sang email khác", không gộp vào "link
  hỏng". Trang Tài khoản hiện email khôi phục lấy từ máy chủ.
- Ảnh không lưu được vào máy (nén hỏng, hết chỗ) ⇒ `AttachmentPicker` toast `photoSaveFailed`, không im.
- **Test**: verify xanh, 47 file / 312 test. Mỗi lỗi có test đỏ trước khi sửa (`reopenDb`, `reloadRequired`,
  `storeFlows` B8 + sổ mồ côi, `deleteAccount` máy dùng chung, `sync` B8, `namesakes`, `saveErrors`,
  `attachmentQueue`, `recovery` C4, `syncNoticeText`).
- **Chạy thử local 19–20/10** (Docker DB + API 0.20 + Vite `--force` — không `--force` thì prebundle cũ báo "does not
  provide an export named 'PARTY_LIMITS'"; tài khoản thật, sổ "Vựa Thử Đợt 2" chỉ ở DB local):
  - B3: hai "Anh Ba" (Xóm Trên / Xóm Dưới), gõ tên không chọn → hộp hỏi, chọn Xóm Dưới → phiếu gắn đúng người (DB).
  - B7: mở `indexedDB.open('thumua365', 99)` trong trang → app nhường kết nối; thêm "Chị Tư" → overlay, op nằm ở
    `thumua365_rescue`; xoá DB v99, bấm tải lại → Chị Tư lên máy chủ đúng id, phần cất tạm đã dọn.
  - B5: thêm rồi xoá SĐT, khu vực → máy chủ `null`, ghi chú giữ, mở sửa thấy ghi chú cũ.
  - Sổ mồ côi: cài một sổ giả không ai nhận vào IndexedDB, tải lại → bị dọn, sổ thật giữ nguyên.
  - DB đóng lúc đồng bộ: mở v99 → overlay "Tải lại app", không có băng "không có mạng".
  - Ảnh (chặn `fetch` để không lên Storage staging): hàng đợi có `userId`; đăng xuất bị chặn "1 thao tác…"; đã gỡ
    ảnh thử, Storage staging không có object nào.
  - B1, B4, B6, B10 chỉ kiểm bằng test (cần gói hết hạn / chi nhánh doanh nghiệp).
  - Để ý: `npm run test:db` của BE dùng chung DB dev và `truncateAll()` — chạy là mất sổ thử local (đã dựng lại).

---

## Ba số phải giữ trong tầm

Đo lúc kết thúc mỗi giai đoạn.

| Chỉ số | Ngưỡng | Cuối D | Cuối E | Cuối F | Cuối G |
|---|---|---|---|---|---|
| JS khởi tạo | ≤ 250KB gzip | 88KB | 89KB | 91KB | **91KB** |
| Phủ test `core/` | ≥ 80% dòng | 97% (262 test) | 97% (310 test) | 98% (357 test) | **98%** (358 test) |
| Lighthouse mobile | Perf ≥85 · A11y ≥95 | chưa đo | chưa đo | chưa đo | **chưa đo** |

Đã bỏ 09/10/2026: "File dài nhất trong `src/`" (≤ 300 dòng), đo được cuối D 276
· E 276 · F 284 · G 284. Xem mục "Bỏ luật 300 dòng mỗi file" ở trên.

`npm run site:check` là bước kiểm thứ sáu, chạy **trước khi xuất bản site**, cố
ý không nằm trong `npm run verify`.

`npm run verify` chạy đủ 5 bước: lint → typecheck → luật dự án → ranh giới tầng
→ test. Tất cả xanh.

---

## Việc còn treo vì cần thứ ngoài repo

| Việc | Cần gì | Ghi ở |
|---|---|---|
| Chạy migration, sinh kiểu, test chéo hai tài khoản | Tài khoản Supabase (2 project) | `supabase/VAN_HANH.md` §2–§5 |
| Bảy kịch bản đồng bộ | Hai thiết bị thật + sóng chập chờn | `supabase/VAN_HANH.md` §6 |
| Cấu hình Auth (tắt xác nhận email, mật khẩu **8** ký tự, rate limit) | Dashboard Supabase | `supabase/VAN_HANH.md` §3 |
| Vercel Preview → staging, Production → prod | Tài khoản Vercel | `supabase/VAN_HANH.md` §1 |
| Gửi thư quên mật khẩu / xác nhận email | Tài khoản Brevo + `BREVO_API_KEY`, `MAIL_FROM` trên Render | BE `ops/PRODUCTION.md` |
| ~~Số Zalo kỹ thuật viên thật~~ | ✅ 17/10/2026 (#40) | `src/config.ts` `SUPPORT_ZALO` |
| Lighthouse mobile | Chạy trên bản deploy | — |
| Bộ ký hiệu 4 nông sản | Tuyến | `deploy_plan/NOTES.md` mục E |
| Mười mục nghiệm thu luồng tiền | Supabase thật + một lần chuyển khoản thật | `supabase/VAN_HANH.md` §7.3 |
| Số tài khoản nhận tiền | Quyết định của nhóm | `src/config.ts`, `VAN_HANH.md` §7.1 |
| Casso hoặc SePay (50–100k/tháng) | Đăng ký dịch vụ | `VAN_HANH.md` §7.2 — được phép hoãn, 10 khách đầu kích hoạt tay |
| **Cổng chặn 2**: 10 người dùng thật xem bảng giá, đếm số người nói "sẽ trả" | Nguyên (BD) | `deploy_plan/README.md` §1 |

---

## Ghi chú vận hành

- Dev server bản mới chạy ở **cổng 5174** qua cấu hình `thumua365-v1` trong
  `.claude/launch.json` của repo cũ — harness chỉ đọc launch.json ở thư mục làm
  việc chính. Bản demo cũ vẫn ở 5173.
- `.dependency-cruiser.cjs` ghi cứng tên `data/useStore.ts` và `data/hooks/`.
  Đổi tên hai chỗ đó thì phải sửa cả luật.
- IndexedDB tên `thumua365`, đang ở **version 2**. Lần nâng version 1→2 xoá và
  dựng lại kho `queue` — chấp nhận được vì app chưa phát hành.
