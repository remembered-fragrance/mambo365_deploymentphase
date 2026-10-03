# GIAI ĐOẠN D — APP LÕI

**Buổi:** 7 · **Phụ thuộc:** C xong · **Người làm:** Tài (có thể chia với Khôi) · **Cần từ Tuyến:** bộ ký hiệu 4 nông sản — **hạn chót đầu giai đoạn này**

---

## 1. TỔNG QUAN

Dựng khung ứng dụng và **bốn màn hình chiếm 90% thời gian sử dụng**: Tổng quan · Phiếu · Tạo phiếu · Chi tiết phiếu. Kết thúc giai đoạn là có **bản dùng được thật** — đủ để một chủ vựa chạy một ngày làm việc.

Ba thứ quyết định chất lượng cả sản phẩm nằm ở đây:

1. **`DataView`** — khai báo cột một lần, tự render bảng ở màn rộng và card ở màn hẹp. Đây là câu trả lời cho "desktop tốt, mobile cũng tốt" mà không viết hai lần.
2. **Thanh chip "Đang cân"** — cân nhiều khách cùng lúc. Nghiệp vụ có thật, đã xác nhận với nhóm.
3. **`MoneyInput` + Numpad làm mặc định** — đây là chỗ người dùng chạm nhiều nhất trong ngày.

---

## 2. CÔNG NGHỆ

| Công nghệ | Dùng để | Ghi chú |
|---|---|---|
| React ^19.2 + react-router-dom ^7.18 | Màn hình, định tuyến | `BrowserRouter`, lazy theo route |
| Tailwind ^4.3 qua token `@theme` | Toàn bộ trình bày | Không hardcode màu |
| `matchMedia('(pointer: coarse)')` | Chọn Numpad hay bàn phím thật | **Không dùng bề rộng màn hình** — tablet cảm ứng 1024px vẫn cần Numpad |
| CSS container queries | `DataView` phản ứng theo ô chứa | Đúng vấn đề hơn media query |
| `React.lazy` + `Suspense` | Tách bundle theo route | Kèm `<Skeleton>` |
| SVG nội tuyến | Biểu tượng | Một họ, nét 1,75px, lưới 24px. **Không emoji** |
| `aria-live="polite"` | Tổng tiền, trạng thái lưu | Cho trình đọc màn hình |

**Chưa dùng ở giai đoạn này:** virtualization (chờ >200 dòng thật), Realtime, thư viện biểu đồ (biểu đồ cột tự vẽ bằng div là đủ).

---

## 3. VIỆC CẦN LÀM

### 3.1 Khung ứng dụng

- [ ] `AppShell` thay `Layout`: sidebar (≥lg) · `AppTopbar` (≥lg) · `MobileHeader` (<lg) · `BottomNav` (<lg).
- [ ] `PageContainer` với 4 mức bề rộng: `form` (max-w-3xl) · `content` (max-w-5xl) · `wide` (max-w-[1600px]) · `full`. **Mỗi trang không tự đặt `max-w-*` nữa.**
- [ ] `PageHeader`: tiêu đề + phụ đề + vùng nút hành động.
- [ ] `BottomNav` **5 slot cố định**, vị trí khai báo bằng `bar: 1|2|3|4` chứ không bằng thứ tự mảng:
  `Tổng quan · Phiếu (badge nháp) · [FAB] · Công nợ · Thêm`
- [ ] Sidebar desktop có **nhóm**: Hằng ngày · Đối tác · Hàng hoá & Kho · Báo cáo · (chân) Tài khoản. CTA kép Mua/Bán.
- [ ] `SyncBadge` + `OfflineBanner` đọc từ `status`.
- [ ] Nút **☀ Ngoài trời** ngay trên header/topbar — không chôn trong Cài đặt.
- [ ] Bỏ nút lưới ở header mobile (trùng chức năng với "Thêm" ở thanh dưới).

### 3.2 `DataView` — component then chốt

- [ ] Một khai báo cột, hai hình thái:
```tsx
<DataView
  rows={rows} getKey={r => r.id} onRowClick={...}
  columns={[
    { id:'date',  header:'Ngày',    cell:..., mobile:'secondary' },
    { id:'party', header:'Đối tác', cell:..., mobile:'title' },
    { id:'total', header:'Tổng',    cell:..., align:'right', mobile:'value' },
    { id:'debt',  header:'Còn nợ',  cell:..., align:'right', mobile:'badge', hideBelow:'lg' },
  ]}
/>
```
- [ ] Bảng ở ≥`md`, card ở <`md`. **Mobile không bao giờ cuộn ngang bảng.**
- [ ] Cột số dùng `.num` (tabular).
- [ ] `MasterDetail`: 2 pane ở ≥1440px · slide-over ở 1024–1439px · điều hướng trang ở <1024px. URL vẫn đổi để chia sẻ link được.

### 3.3 Tổng quan

- [ ] Lưới 12 cột ở desktop; cuộn dọc ở mobile.
- [ ] Khối **Hero duy nhất**: "Đã chi mua hôm nay" + số tiền lớn.
- [ ] Khối mới **"Việc cần làm hôm nay"**: *n* phiếu đang cân · *n* khoản quá hạn · *n* mặt hàng tồn âm.
- [ ] Cả **3 KPI đều bấm được**, dẫn tới Phiếu đã lọc sẵn kỳ tương ứng.
- [ ] Biểu đồ 7 ngày: hiện nhãn giá trị ở cột cao nhất (bản demo chỉ có tooltip — mobile không đọc được).
- [ ] Khối doanh thu bán: khi rỗng thì hiện `EmptyState` có nút, **không biến mất** (biến mất = người dùng không biết tính năng tồn tại).

### 3.4 Phiếu — gộp Lịch sử + Nháp

- [ ] Tab: `Đã xong` · `Đang cân (n)` · `Để dành (n)`. Segmented `Mua / Bán / Tất cả` giữ nguyên.
- [ ] Mobile: nút "Lọc (n)" mở `FilterSheet`; chip đang áp dụng hiện thành hàng ngang. **Bỏ khối lọc cao 300px luôn mở** của bản demo.
- [ ] Desktop: thanh lọc một hàng + bảng + pane chi tiết.
- [ ] Dòng tóm tắt `n phiếu · KL · tổng tiền` **dính khi cuộn** — đây là con số người dùng đối soát.
- [ ] Chọn nhiều phiếu (checkbox) → xuất chỉ những phiếu đã chọn.

### 3.5 🔴 Tạo phiếu — màn quan trọng nhất

**Tách file trước, làm giao diện sau.** Bản demo là một file 1.120 dòng; không tách thì không làm được bố cục 2–3 cột.

```
features/receipt/
├── CreateReceiptPage.tsx     điều phối, <300 dòng
├── SessionRail.tsx           ⭐ thanh chip "Đang cân"
├── CounterpartyPicker.tsx
├── LineEditor.tsx            (mobile)
├── LineTable.tsx             (desktop)
├── AdjustmentsPanel.tsx
├── PaymentPanel.tsx
├── AttachmentPicker.tsx
└── ReceiptSummary.tsx        tổng tiền + 2 nút kết thúc
```

**Thanh chip "Đang cân"** — chi tiết ở [KH Frontend §7.3.0](../KE_HOACH_THIET_KE_LAI_FRONTEND.md):

- [ ] Đọc `data.drafts.filter(d => d.status === 'draft' && d.kind === kind)`.
- [ ] Mỗi chip: **tên + tổng tiền đang chạy**. Chuyển chip = đổi `?draft=<id>`.
- [ ] Nút `+ Khách mới` → `/new` (không tham số).
- [ ] Hoàn thành phiếu → chip tự biến mất (`deleteDraft` đã có sẵn).
- [ ] Desktop: thanh chip thành **cột trái** trong bố cục 3 vùng.
- [ ] FAB mobile: nếu đang có phiên cân, sheet hiện **danh sách đang cân + "Khách mới"**.
- [ ] **Không dùng schema mới.** Nếu thấy mình đang thêm bảng, dừng lại — mô hình hiện tại đã đủ.

**Hai nút kết thúc:**
- [ ] `Trả đủ & xong` — `amountPaid = finalTotal`, hoàn thành, quay về thanh chip.
- [ ] `Ghi nợ & xong` — mở ô nhập tiền trả ngay (mặc định 0), hoàn thành, quay về thanh chip.
- [ ] Đặt tên và bố cục sao cho sau này thêm `& in` **chỉ là đổi nhãn**.

**Nhập liệu:**
- [ ] `MoneyInput`: hiện ngăn nghìn ngay khi gõ (`74.000.000`) + dòng chữ **"bảy mươi bốn triệu đồng"**. `type="text" inputMode="decimal"`.
- [ ] Numpad **là mặc định** trên `pointer: coarse`; nút phụ "⌨ Bàn phím thường". Desktop không hiện Numpad, dùng `Tab`/`Enter`/`Ctrl+Enter`.
- [ ] Ô **"Cách tính"** gập vào link "Sửa cách tính" — chọn mặt hàng đã tự set rồi, hiện luôn là nhiễu trong 90% trường hợp.
- [ ] **Hiển thị dần**: mặc định chỉ Người bán · Mặt hàng · Cân được · Đơn giá · Thành tiền. Cộng/trừ thêm · Ảnh · Hẹn ngày trả · Ghi chú gập sau nút "Thêm thông tin khác".
- [ ] Chọn nông hộ có lịch sử → gợi ý *"Lần trước: Điều, 28.000đ/kg, 05/08"* + nút "Dùng lại".
- [ ] Tổng tiền **luôn nhìn thấy** (thanh dính đáy ở mobile, cột phải dính ở desktop).
- [ ] Chip trạng thái lưu: `● Đang lưu` / `✓ Đã lưu 10:32` / `⚠ Chưa đồng bộ`.

### 3.6 Chi tiết phiếu & biên nhận

- [ ] Một component, hai chỗ nhúng: trong pane phải (từ danh sách) và full-page (mở bằng URL).
- [ ] Mobile: 2 nút chính (Chia sẻ, In) + menu "⋯". Desktop: đủ nút trên toolbar.
- [ ] Xoá phiếu → `ConfirmDialog` nêu **hậu quả bằng số**: *"Xoá phiếu 12.500.000₫ của Cô Lê Thị Mai ngày 08/08?"*
- [ ] 🔴 **Biên nhận thiết kế theo khổ giấy nhiệt 80mm ngay từ bây giờ**: một cột, đen tuyền trên trắng, không nền màu, không xám nhạt, không đổ bóng. Máy in nhiệt đã hoãn nhưng ràng buộc này miễn phí và tránh phải thiết kế lại.
- [ ] Biên nhận có: tên vựa (in được từ bản Free) · số phiếu · ngày · người bán · bảng dòng hàng · tổng cộng · **số tiền bằng chữ** · đã trả / còn nợ · chỗ ký · dòng "Lập bằng THUMUA365" nhỏ và khiêm tốn.
- [ ] `@media print`: ẩn sidebar/topbar, nền trắng, `break-inside: avoid` cho bảng dòng hàng.

---

## 4. RÀNG BUỘC RIÊNG

1. **Tách file `CreateReceiptPage` là thao tác thuần cơ học** — cắt JSX thành component nhận props, một commit riêng, không đổi state hay logic. Đối chiếu tổng tiền trước/sau bằng cùng bộ dữ liệu.
2. **Không component nào trong `components/` được import `core/` hay `data/`.** Chúng chỉ nhận props. Cần dữ liệu → `features/` truyền xuống.
3. **Không viết chuỗi tiếng Việt trong JSX.** Tất cả qua `labels.ts`.
4. **Mỗi trang đúng một khối Hero, tối đa hai khối Raised.** Tương phản đến từ tiết chế.
5. **Không thêm màn hình ngoài bốn màn của giai đoạn này.** Công nợ, tồn kho, đối tác… là giai đoạn E.
6. **Không tối ưu hiệu năng chưa đo.** Không virtualization, không `memo` rải khắp nơi. Đo trước.
7. Màu không bao giờ là tín hiệu duy nhất — mua/bán phải kèm biểu tượng và chữ.

---

## 5. YÊU CẦU ĐẦU RA

**Chức năng:**
- [ ] **Cân 3 khách xen kẽ**: mở 3 phiếu, chuyển qua lại nhiều lần, mỗi phiếu giữ đúng số của mình, hoàn thành từng cái → không lẫn dòng hàng, không mất số, chip biến mất đúng lúc
- [ ] Chuyển giữa các khách đang cân **một chạm**, không mất dữ liệu đang gõ dở
- [ ] Chạm ô tiền trên điện thoại → **Numpad mở**, không phải bàn phím hệ thống
- [ ] Gõ `74000000` → hiện `74.000.000` + "bảy mươi bốn triệu đồng"
- [ ] Hoàn thành phiếu bằng `Trả đủ & xong` → quay về đúng thanh chip, không nhảy lung tung
- [ ] Đi trọn luồng tạo phiếu **chỉ bằng bàn phím** trên desktop, không chạm chuột

**Trình bày:**
- [ ] Ở 375px: **không trang nào cuộn ngang** (`document.body.scrollWidth <= window.innerWidth` trên mọi route)
- [ ] Ở 320px: thanh dưới 5 slot không vỡ chữ
- [ ] Ở 1280px và 1920px: không trang nào để trống >25% chiều ngang vùng nội dung
- [ ] Ở ≥1024px: danh sách Phiếu hiển thị **dạng bảng**
- [ ] Ba theme (Trong nhà / Ngoài nắng / Ban đêm) đều xem được, đổi không cần tải lại

**Kỹ thuật:**
- [ ] Không file nào trong `features/receipt/` **>300 dòng**
- [ ] `grep -rn "core/\|data/" src/components` → **rỗng**
- [ ] Bundle khởi tạo vẫn **≤250KB gzip**
- [ ] Lighthouse mobile: Perf ≥85 · A11y ≥95
- [ ] Mọi nút chỉ có biểu tượng đều có `aria-label`

---

## 6. CẠM BẪY

| Bẫy | Hậu quả | Tránh bằng |
|---|---|---|
| Tách `CreateReceiptPage` kèm sửa logic | Sai tiền, khó truy nguyên nhân | Tách cơ học một commit riêng |
| Làm thanh chip bằng cấu trúc dữ liệu mới | Phát sinh schema, đồng bộ phức tạp thêm | Dùng `DraftReceipt` + `?draft=` đã có |
| Xếp chồng nhiều khách trên một màn kiểu Muamu | Cuộn vô tận, form của ta giàu hơn nhiều | Một phiếu hiển thị, chuyển bằng chip |
| Bảng có `overflow-x-auto` trên mobile | Pattern tệ nhất cho bảng ở màn hẹp | `DataView` đổi hình thái |
| Numpad mở theo bề rộng màn hình | Tablet cảm ứng mất Numpad | `pointer: coarse` |
| Dùng emoji làm biểu tượng | Mỗi máy hiển thị một kiểu, phóng to vỡ | Chờ bộ ký hiệu của Tuyến; tạm dùng SVG nét đơn |
| Nút xoá đặt cạnh nút xác nhận | Tay đeo găng chạm nhầm | Xoá vào menu "⋯" |
| Làm luôn màn Công nợ "cho tiện" | Trôi phạm vi, giai đoạn D không bao giờ xong | Ghi vào `NOTES.md` |
