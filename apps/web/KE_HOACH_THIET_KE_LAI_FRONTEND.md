# 🎨 KẾ HOẠCH THIẾT KẾ LẠI FRONTEND — THUMUA365

> 📌 **Cập nhật 09/08/2026:** dự án đã chuyển sang **dựng lại từ base** cho bản phát hành thật — xem [KE_HOACH_XAY_DUNG_SAN_PHAM_THAT.md](KE_HOACH_XAY_DUNG_SAN_PHAM_THAT.md) (tài liệu chủ). Toàn bộ nội dung thiết kế dưới đây **vẫn giữ nguyên hiệu lực** và là đặc tả giao diện chính thức; chỉ khác một điểm: các mục ghi "sửa lỗi X" nay là "làm đúng ngay từ đầu", và lộ trình §13 được thay bằng lộ trình A–H của tài liệu chủ.

> **Câu hỏi gốc:** tối ưu giao diện để dùng tốt trên **web máy tính** và **app/mobile** như nhau — không màn hình nào bị thừa hoặc thiếu chức năng quan trọng.
> **Nguồn đối chiếu:** [KE_HOACH_TRIEN_KHAI_DEPLOY.md](KE_HOACH_TRIEN_KHAI_DEPLOY.md), [BAO_CAO_REVIEW_GIAI_DOAN_2.md](BAO_CAO_REVIEW_GIAI_DOAN_2.md), toàn bộ `src/` (53 file, ~7.900 dòng)
> **Ngày lập:** 09/08/2026
> **Ràng buộc bắt buộc:** không đụng `src/domain/**` (logic nghiệp vụ thuần), không phá vỡ hợp đồng `StoreValue` để backend Supabase ở [KE_HOACH_TRIEN_KHAI_DEPLOY.md §3](KE_HOACH_TRIEN_KHAI_DEPLOY.md) cắm vào được mà **không phải sửa UI lần thứ hai**.

---

## 0. TÓM TẮT ĐIỀU HÀNH (đọc 1 phút)

| | Hiện tại | Sau kế hoạch này |
|---|---|---|
| **Triết lý layout** | Mobile-first, desktop = mobile phóng to trong khung `max-w-6xl` | **Một codebase, hai mật độ** — cùng nội dung, khác cách trình bày |
| **Desktop** | Cột đơn, nhiều khoảng trắng, không có bảng dữ liệu, không có thanh trên, không phím tắt | Master–detail 2 pane, bảng dữ liệu thật, topbar + tìm kiếm toàn cục, phím tắt |
| **Mobile** | Bottom nav 4 mục + FAB; **Công nợ bị chôn** trong sheet "Thêm" | Bottom nav 5 slot đúng tần suất dùng; mọi chức năng ≤ 2 chạm |
| **Tính đồng đẳng** | Không có bảng kiểm → thừa/thiếu ngẫu nhiên | **Ma trận parity** bắt buộc: mỗi chức năng phải có lối vào trên cả 2 nền tảng |
| **Nền tảng UI** | Chuỗi Tailwind lặp lại ở 6 file, `alert/confirm/prompt`, không skeleton/toast/404 | Design token + 18 component dùng chung, dialog/toast riêng |
| **Người dùng ít rành CN** | 4 lỗi chặn: gieo dữ liệu giả cho user thật · hai cách hiểu dấu phẩy · xoá không hỏi lại · bắt buộc email | Sửa hết ở Phase 0 + bảng từ vựng + màn hình chào + hướng dẫn (§16) |
| **Màu sắc** | 382 chỗ `slate` lạnh + xanh lá gánh 6 vai trò cùng lúc → nhìn phẳng, nút chính không nổi | Nền ấm `sand`, mỗi màu một nghĩa, 3 tầng bề mặt, 3 theme (§17) |
| **Sẵn sàng backend** | Store đồng bộ, id không phải UUID, không có trạng thái loading/sync | Store có `status` + `syncState`, id UUID, phân trang sẵn — cắm Supabase không sửa UI |

**Khối lượng:** 5 phase, ~18–21 buổi làm việc. Phase 0–2 (4 lỗi chặn + nền tảng + điều hướng + 4 màn chính) đã đủ để demo/deploy; Phase 3–5 là hoàn thiện.

> ⚠️ **Phase 0 là điều kiện chặn để mở cho người dùng thật.** Bốn lỗi ở §16.1 làm sai dữ liệu nghiệp vụ, không phải chuyện giao diện — không được deploy công khai trước khi sửa xong.

---

## 1. AUDIT HIỆN TRẠNG (có dẫn chứng)

### 1.1 Những thứ đang ĐÚNG — giữ nguyên, không đụng

| Điểm mạnh | Vị trí | Lý do giữ |
|---|---|---|
| Tách bạch `domain/` thuần TS, không phụ thuộc React | `src/domain/*` | Redesign UI không rủi ro sai tiền/sai cân |
| `Numpad` bottom-sheet phím to (min 56px), dùng `pointerdown` | [Numpad.tsx:114](src/components/Numpad.tsx:114) | Đây là lợi thế cạnh tranh thật với thương lái đeo găng — chỉ mở rộng, không bỏ |
| Auto-save nháp 700 ms | [NewReceiptPage.tsx:245](src/pages/NewReceiptPage.tsx:245) | Chống mất dữ liệu khi rớt mạng/khoá màn hình |
| Chế độ Ngoài trời scale `font-size` gốc | [index.css:60](src/index.css:60) | Cách làm đúng (1 biến gốc, không override từng class) |
| Offline-first + PWA đã cấu hình | [vite.config.ts](vite.config.ts) | Cốt lõi sản phẩm |
| Segmented Mua/Bán ở Lịch sử | [HistoryPage.tsx:175](src/pages/HistoryPage.tsx:175) | Mô hình đúng, sẽ nhân rộng |

### 1.2 Vấn đề phía DESKTOP (nghiêm trọng nhất)

| # | Vấn đề | Dẫn chứng | Hậu quả |
|---|---|---|---|
| D1 | **Toàn app khoá `max-w-6xl` (1152px)** cho mọi loại trang | [Layout.tsx:26](src/components/Layout.tsx:26) | Màn 1920px bỏ trống ~40% chiều ngang; bảng tồn kho/lịch sử vẫn chật |
| D2 | **Không có bảng dữ liệu nào cho desktop** — mọi danh sách là card 1–2 cột | [HistoryPage.tsx:263](src/pages/HistoryPage.tsx:263), [SuppliersPage.tsx:43](src/pages/SuppliersPage.tsx:43), [DraftsPage.tsx:29](src/pages/DraftsPage.tsx:29) | Xem 200 phiếu phải cuộn 40 màn hình; không so sánh được số liệu theo cột |
| D3 | **Không có master–detail** — bấm phiếu là rời trang, quay lại mất vị trí cuộn và mất bộ lọc | `/receipt/:id` là route riêng ([App.tsx:45](src/App.tsx:45)) | Đối soát 20 phiếu = 40 lần chuyển trang |
| D4 | **Không có thanh trên (topbar) ở desktop** — không chỗ đặt tìm kiếm toàn cục, trạng thái đồng bộ, menu user | [Layout.tsx:21-31](src/components/Layout.tsx:21) chỉ có `SidebarNav` + `MobileHeader (lg:hidden)` | Khi có backend sẽ không có chỗ hiển thị "đang đồng bộ / offline" |
| D5 | **Sidebar 11 mục phẳng, không nhóm**, CTA duy nhất là "Tạo phiếu thu mua" | [SidebarNav.tsx:17](src/components/SidebarNav.tsx:17), [navItems.ts:19](src/components/navItems.ts:19) | Quét mắt chậm; phiếu bán bị lép vế so với phiếu mua |
| D6 | **Form tạo phiếu 1 cột `max-w-3xl`, dài ~1.100 dòng JSX** | [NewReceiptPage.tsx:445](src/pages/NewReceiptPage.tsx:445) | Trên desktop phải cuộn để thấy tổng tiền trong khi nửa màn hình trống |
| D7 | **Không phím tắt, không điều hướng bằng Tab/Enter** giữa các ô cân | toàn bộ form | Nhập liệu bàn phím ở nhà chậm hơn nhập trên điện thoại |
| D8 | Bảng tồn kho dùng `overflow-x-auto` cho cả desktop lẫn mobile | [InventoryPage.tsx:35](src/pages/InventoryPage.tsx:35) | Mobile phải cuộn ngang — pattern tệ nhất cho bảng trên di động |

### 1.3 Vấn đề phía MOBILE / APP

| # | Vấn đề | Dẫn chứng | Hậu quả |
|---|---|---|---|
| M1 | **Bottom nav chọn sai mục theo tần suất:** bar = Tổng quan, Lịch sử, Nháp, **Tồn kho**; **Công nợ nằm trong sheet "Thêm"** | [navItems.ts:20-31](src/components/navItems.ts:20) (`bar: true`), [BottomNav.tsx:13](src/components/BottomNav.tsx:13) | Công nợ là việc làm hằng ngày (đòi/trả tiền) mà mất 2 chạm; Tồn kho là việc xem theo tuần lại chiếm slot vàng |
| M2 | **Hai lối vào menu chồng nhau**: nút lưới ở header trái + sheet FAB | [MobileHeader.tsx:25](src/components/MobileHeader.tsx:25), [BottomNav.tsx:53](src/components/BottomNav.tsx:53) | Người dùng không biết tìm chức năng ở đâu |
| M3 | `maximum-scale=1.0, user-scalable=no` **chặn phóng to** | [index.html:6](index.html) | Vi phạm WCAG 1.4.4; người lớn tuổi (đúng tệp thương lái) không zoom được |
| M4 | Dùng `alert()` / `confirm()` / `prompt()` cho luồng nghiệp vụ | [NewReceiptPage.tsx:400](src/pages/NewReceiptPage.tsx:400), [ReceiptDetailPage.tsx:156](src/pages/ReceiptDetailPage.tsx:156), [ProfilePage.tsx:73,90](src/pages/ProfilePage.tsx:73) | Trong PWA standalone hộp thoại hệ thống trông "không phải app"; iOS chặn khi nhiều tab |
| M5 | Chỉ `padding-bottom: env(safe-area-inset-bottom)` ở bottom nav; `index.html` thiếu `viewport-fit=cover` | [BottomNav.tsx:49](src/components/BottomNav.tsx:49) | iPhone tai thỏ: nội dung chui xuống dưới thanh gạt |
| M6 | Font Be Vietnam Pro tải từ Google Fonts qua mạng | [index.html:10](index.html) | App "offline-first" nhưng lần mở đầu **không có mạng thì mất font** → nhảy layout |
| M7 | Không có pull-to-refresh, không skeleton, không toast xác nhận sau khi lưu | toàn bộ | Người dùng không chắc thao tác đã ăn |

### 1.4 Vấn đề CHUNG (chất lượng nền tảng)

| # | Vấn đề | Dẫn chứng |
|---|---|---|
| C1 | Chuỗi class `inputCls` bị **copy-paste ở 4 file** với 2 biến thể khác nhau | [NewReceiptPage.tsx:65](src/pages/NewReceiptPage.tsx:65), [UtilitiesPage.tsx:7](src/pages/UtilitiesPage.tsx:7), [ProfilePage.tsx:9](src/pages/ProfilePage.tsx:9), [AuthPages.tsx:6](src/pages/AuthPages.tsx:6) |
| C2 | Mỗi trang tự đặt bề rộng riêng: `max-w-3xl` / `max-w-2xl` / không đặt | [NewReceiptPage.tsx:445](src/pages/NewReceiptPage.tsx:445), [ReportsPage.tsx:54](src/pages/ReportsPage.tsx:54), [DebtPage.tsx:33](src/pages/DebtPage.tsx:33) |
| C3 | Mỗi trang tự viết `<h1>` + mô tả + hàng nút — 9 biến thể khác nhau | 9 file trong `src/pages/` |
| C4 | **Không có route 404** (`path="*"`) → URL sai ra trang trắng | [App.tsx:27-55](src/App.tsx:27) |
| C5 | **Không có ErrorBoundary** → 1 lỗi render là trắng toàn app, người dùng ngoài ruộng không biết làm gì |
| C6 | **Không code-splitting**: `jspdf` + `html2canvas` + `xlsx` nằm trong bundle chính (~1,27 MB, đã cảnh báo trong review) | [BAO_CAO_REVIEW_GIAI_DOAN_2.md §1](BAO_CAO_REVIEW_GIAI_DOAN_2.md) |
| C7 | Không có empty state / loading state chuẩn hoá — mỗi nơi một kiểu chữ xám |
| C8 | Không có dark mode và không có cách nào bật (điện thoại Android tối mặc định sẽ chói) |

---

## 2. NGHIÊN CỨU SẢN PHẨM TƯƠNG TỰ

### 2.1 Bốn nhóm tham chiếu

| Nhóm | Đại diện | Học được gì | **Không** nên bắt chước |
|---|---|---|---|
| **Sổ nợ / sổ bán hàng cho hộ kinh doanh VN** | [Sổ Bán Hàng](https://sobanhang.com/huong-dan-tong-hop-cach-su-dung-so-ban-hang-hieu-qua/) — công nợ, nhắc nợ, báo cáo lãi lỗ theo ngày/tháng, đa thiết bị (điện thoại/tablet/PC), giao diện tiếng Việt "vài chạm là xong" | (a) **Công nợ là màn hình cấp 1**, không chôn trong menu; (b) mọi nghiệp vụ chính ≤ 3 chạm; (c) ngôn ngữ đời thường, không thuật ngữ kế toán | Nhồi tính năng thương mại điện tử (Shopee/TikTok) — không liên quan vựa nông sản |
| **Sổ nợ số của tiểu thương (quốc tế)** | [OkCredit](https://okcredit.in/), [Khatabook/Vyapar](https://apps.apple.com/in/app/khatabook-vyapar-app/id1488204139) — ghi nợ/thu, nhắc nợ qua SMS/WhatsApp, đa ngôn ngữ; Vyapar mở rộng lên **bản desktop** | (d) Một dòng nghiệp vụ duy nhất "ai – bao nhiêu – khi nào trả"; (e) **bản desktop là bản mở rộng chứ không phải sản phẩm khác** | Bắt người dùng hiểu khái niệm "Jama/Udhar" — ta dùng thẳng "Phải trả / Phải thu" như [DebtPage](src/pages/DebtPage.tsx:37) đang làm (đúng rồi) |
| **Phần mềm vựa / thu mua nông sản VN** | [TTV Software](http://ttvsoft.vn/san-pham/phan-mem-quan-ly-thu-mua-xuat-ban-nong-san-cafe-tieu-p20274) (kết nối cân điện tử qua USB, áp bảng giá và tính tiền ngay từng lượt cân), [KiotViet nông sản](https://www.kiotviet.vn/phan-mem-quan-ly-cua-hang-nong-san-thuc-pham-tich-hop-can-dien-tu-ban-hang-nhanh-chong/), [phanmemtotnhat.vn](https://phanmemtotnhat.vn/phan-mem-vua-thu-mua-nong-san-thuc-pham-trai-cay-tom-ca) | (f) **Màn hình "lượt cân" là trung tâm sản phẩm** — không phải dashboard; (g) desktop được thiết kế cho **nhập liệu liên tục bằng bàn phím**, không phải để ngắm biểu đồ | Phụ thuộc phần cứng cân + cài đặt Windows — ta thắng ở chỗ chạy trên điện thoại ngoài ruộng, không cần cài |
| **Nền tảng giao dịch nông sản quốc tế** | [AgriDigital](https://www.agridigital.io/agridigital-platform) — một khung nhìn "live" nối **hợp đồng → giao hàng → tồn kho → thanh toán**, xem được mọi lúc mọi nơi; [Bushel Commercial Portal](https://www.bushelpowered.com/agribusiness//solutions/commercial-portal) | (h) **Liên kết xuyên màn hình**: từ phiếu nhảy sang đối tác, sang tồn kho, sang công nợ — không phải quay về menu; (i) hiển thị "vị thế hiện tại" (mua – bán – tồn – nợ) trên một màn | Hợp đồng kỳ hạn, tài chính chuỗi cung ứng — quá tầm giai đoạn này |

### 2.2 Chuẩn kỹ thuật giao diện 2026 (để không thiết kế theo cảm tính)

Tổng hợp từ [UXPin](https://www.uxpin.com/studio/blog/best-practices-examples-of-excellent-responsive-design/) và [khảo sát breakpoint 2026](https://www.rapiddoctools.com/blog/modern-responsive-breakpoints-2026-guide):

- Dashboard/admin/CRM là **loại giao diện khó responsive nhất** vì bảng và biểu đồ không tự co được → giải pháp đúng là **lưới 2 cột có sidebar** hoặc cột đơn có padding lớn, chứ không phải ép bảng co lại.
- Chuyển từ "thiết kế trang" sang **"thiết kế component tự thích ứng"** — dùng **container query** để component phản ứng theo kích thước ô chứa nó, không theo bề rộng màn hình.
- Card-grid xếp 4–5 cột trên desktop → 2 cột tablet → 1 cột mobile là pattern chuẩn, nhưng **bảng dữ liệu thì đổi hẳn hình thái** (table ↔ card), không phải co lại.

> **Kết luận rút ra cho THUMUA365:** vấn đề của app không phải "chưa responsive" — nó responsive rồi. Vấn đề là **chỉ có một hình thái trình bày duy nhất (card cột đơn) cho cả hai môi trường**. Việc cần làm là bổ sung hình thái thứ hai (table + master-detail + topbar) cho desktop, và **sắp xếp lại thứ tự ưu tiên** cho mobile — trong khi giữ **cùng một tập chức năng**.

---

## 3. BẢY NGUYÊN TẮC THIẾT KẾ (dùng để phân xử mọi tranh cãi về sau)

1. **Parity nội dung, khác mật độ.** Mọi chức năng có mặt ở cả 2 nền tảng. Cái khác nhau là *bao nhiêu thứ hiện cùng lúc*, không phải *có hay không*. Kiểm chứng bằng ma trận ở §6.3.
2. **Mobile = tốc độ một tay. Desktop = tốc độ bàn phím và đối soát.** Cùng việc "tạo phiếu": mobile tối ưu số chạm ngón cái; desktop tối ưu Tab/Enter và nhìn được tổng tiền cùng lúc với dòng hàng.
3. **Không có "phiên bản rút gọn".** Không bao giờ ẩn một chức năng chỉ vì màn hình nhỏ — nếu chật thì đổi hình thái (bảng → card, cột phải → tab), không cắt.
4. **Danh sách dài phải đổi hình thái, không được cuộn ngang trên mobile.** Bảng chỉ tồn tại từ `md` trở lên.
5. **Tiền và khối lượng là chữ to nhất trên màn hình.** Người dùng làm việc dưới nắng, tay bẩn, mắt trung niên.
6. **Không dùng hộp thoại hệ thống.** `alert/confirm/prompt` bị cấm trong code mới — thay bằng `<Dialog>` và `<Toast>`.
7. **Mọi thay đổi UI phải giữ nguyên chữ ký `StoreValue`.** Nếu một màn hình cần dữ liệu mới, thêm *selector* trong `domain/` chứ không đổi hợp đồng store (xem §12).

---

## 4. HỆ THỐNG THIẾT KẾ (design system)

### 4.1 Token — khai báo một lần trong `src/index.css` (Tailwind v4 `@theme`)

```css
@import 'tailwindcss';

@theme {
  /* Typography — self-host, không phụ thuộc mạng (xem §11.3) */
  --font-sans: 'Be Vietnam Pro', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace; /* dùng cho cột số trong bảng */

  /* Thương hiệu */
  --color-brand-50:  #f0fdf4;
  --color-brand-500: #22c55e;
  --color-brand-600: #16a34a;
  --color-brand-700: #15803d;   /* màu chủ đạo hiện tại — giữ */
  --color-brand-800: #166534;

  /* Ngữ nghĩa nghiệp vụ — thay cho việc rải amber/blue/rose khắp nơi */
  --color-purchase: #15803d;    /* phiếu mua  (xanh) */
  --color-sale:     #1d4ed8;    /* phiếu bán  (xanh dương) */
  --color-payable:  #b45309;    /* phải trả   (hổ phách) */
  --color-receivable: #047857;  /* phải thu   (ngọc) */
  --color-danger:   #be123c;
  --color-overdue:  #be123c;

  /* Mật độ — biến duy nhất điều khiển "thoáng/chặt" */
  --density-row-h: 3.25rem;     /* chiều cao dòng danh sách */
  --density-gap:   1rem;
  --density-radius: 0.75rem;
}

/* Desktop chặt hơn: cùng component, ít khoảng trắng hơn */
@media (min-width: 1024px) {
  :root { --density-row-h: 2.5rem; --density-gap: 0.75rem; }
}

/* Ngoài trời: thoáng hơn + chữ to hơn (mở rộng cơ chế đã có ở index.css:60) */
html.outdoor { font-size: 112.5%; --density-row-h: 3.75rem; }
```

**Vì sao làm thế này:** hiện tại "mật độ" đang được biểu diễn bằng cách rải `lg:p-6`, `lg:text-2xl`, `lg:gap-4` ở ~30 chỗ. Gom về 3 biến CSS thì đổi cảm giác toàn app chỉ sửa 1 chỗ, và **chế độ Ngoài trời tự động đúng trên cả desktop** thay vì chỉ scale chữ.

### 4.2 Utility dùng chung — dẹp copy-paste (C1)

```css
@utility input-base {
  @apply w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base
         text-slate-900 outline-none transition
         focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20;
}
@utility card { @apply rounded-2xl bg-white p-4 shadow-sm; }
@utility num  { @apply font-mono tabular-nums; } /* số tiền/khối lượng thẳng cột */
```

> `tabular-nums` là chi tiết nhỏ nhưng quan trọng: cột tiền trong bảng hiện đang nhảy chữ số vì dùng font tỉ lệ.

### 4.3 Thang chữ

| Vai trò | Mobile | Desktop | Ghi chú |
|---|---|---|---|
| Số tiền chủ đạo (hero) | 30px/800 | 36px/800 | Ô "Đã chi mua hôm nay" |
| Tiêu đề trang | 20px/700 | 24px/700 | Chuẩn hoá qua `<PageHeader>` |
| Số trong bảng/card | 16px/600 mono | 14px/600 mono | |
| Nhãn phụ | 12px | 12px | **Tối thiểu 12px** — hiện có nhiều `text-[10px]` ([DashboardPage.tsx:261](src/pages/DashboardPage.tsx:261)) không đọc nổi ngoài nắng |
| Ô nhập liệu | **16px** | 14px | 16px trên mobile để iOS không auto-zoom |

---

## 5. KIẾN TRÚC LAYOUT & APP SHELL

### 5.1 Breakpoint và hình thái

| Dải | Tên | Điều hướng | Hình thái danh sách | Form tạo phiếu |
|---|---|---|---|---|
| `< 640px` | Điện thoại | Bottom nav 5 slot + FAB, header mỏng | Card 1 cột | 1 cột + thanh tổng tiền dính đáy + Numpad |
| `640–1023px` | Tablet / ngang | Bottom nav (giữ) | Card 2 cột | 1 cột rộng, Numpad tuỳ chọn |
| `1024–1439px` | Laptop | Sidebar 240px + **Topbar** | **Bảng** | 2 cột: form 2/3 + tóm tắt dính 1/3 |
| `≥ 1440px` | Màn lớn | Sidebar 260px + Topbar | Bảng + **pane chi tiết** (master–detail) | 2 cột, khung tối đa 1440px |

### 5.2 App shell mới

```
┌──────────── AppShell (thay Layout.tsx) ────────────────────────────┐
│ SidebarNav (≥lg, có nhóm)  │  AppTopbar (≥lg)                      │
│  • Logo                    │   [🔍 Tìm phiếu/khách/mặt hàng ⌘K]    │
│  • Nhóm 1..5 (§6.1)        │   [● Đã đồng bộ]  [☀ Ngoài trời] [👤] │
│  • CTA kép: Mua / Bán      ├───────────────────────────────────────┤
│  • Footer: Tài khoản       │  <PageContainer width="…">            │
│                            │     <PageHeader title actions/>       │
│                            │     <Outlet/>                          │
│                            │  </PageContainer>                      │
├────────────────────────────┴───────────────────────────────────────┤
│ MobileHeader (<lg): [logo]        [● sync] [☀] [avatar]             │
│ BottomNav  (<lg):   Tổng quan · Phiếu · (+) · Công nợ · Thêm        │
└────────────────────────────────────────────────────────────────────┘
```

`PageContainer` thay cho việc mỗi trang tự đặt `max-w-*` (C2):

```tsx
type Width = 'form' | 'content' | 'wide' | 'full';
// form: max-w-3xl (tạo phiếu, hồ sơ, báo cáo)
// content: max-w-5xl (tổng quan, công nợ)
// wide: max-w-[1600px] (lịch sử, tồn kho, đối tác — cần bề ngang cho bảng)
// full: không giới hạn (master-detail 2 pane)
```

### 5.3 Vùng an toàn & PWA (sửa M3, M5)

```html
<!-- index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```
Bỏ `maximum-scale=1.0, user-scalable=no`. Bù lại bằng: mọi `input` trên mobile ≥16px (đã có `text-base`, chỉ cần soát lại `compactInputCls` ở [NewReceiptPage.tsx:68](src/pages/NewReceiptPage.tsx:68) đang là `text-sm`).

Thêm padding safe-area cho cả 4 phía qua utility:
```css
@utility safe-b { padding-bottom: max(env(safe-area-inset-bottom), 0.5rem); }
@utility safe-x { padding-inline: max(env(safe-area-inset-left), 1rem) max(env(safe-area-inset-right), 1rem); }
```

---

## 6. KIẾN TRÚC THÔNG TIN & ĐIỀU HƯỚNG MỚI

### 6.1 Nhóm chức năng (thay danh sách phẳng 11 mục)

| Nhóm | Mục | Route |
|---|---|---|
| **Hằng ngày** | Tổng quan · Phiếu (Lịch sử + Nháp) · Công nợ | `/` · `/history` `/drafts` · `/debts` |
| **Đối tác** | Người bán · Người mua | `/suppliers` · `/buyers` |
| **Hàng hoá & Kho** | Mặt hàng · Tồn kho · Cấu hình giá | `/products` · `/inventory` · **`/pricing`** (tách khỏi Tiện ích) |
| **Báo cáo** | Báo cáo thuế · Tiện ích (máy tính, ghi chú) | `/reports` · `/utilities` |
| **Hệ thống** (footer) | Tài khoản & Cài đặt | `/profile` |

> **Thay đổi có chủ ý:** tách "Cấu hình giá" khỏi [UtilitiesPage](src/pages/UtilitiesPage.tsx:156) — nó là cấu hình nghiệp vụ ảnh hưởng trực tiếp tới số tiền trên phiếu, không phải "tiện ích" ngang hàng với máy tính bỏ túi. Hiện nó là card `lg:col-span-2` nằm dưới cùng, rất khó tìm.

### 6.2 Cấu hình nav mới — mở rộng `navItems.ts`

```ts
export interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly shortLabel?: string;    // MỚI: nhãn ngắn cho bottom nav ("Phiếu" vs "Lịch sử giao dịch")
  readonly Icon: ComponentType<IconProps>;
  readonly end?: boolean;
  readonly group: NavGroup;        // MỚI: 'daily' | 'partners' | 'goods' | 'reports' | 'system'
  readonly bar?: 1 | 2 | 3 | 4;    // MỚI: vị trí cố định trên bottom nav (thay boolean — hết nhập nhằng slice())
  readonly badge?: 'drafts' | 'overdue';  // MỚI: thêm badge quá hạn
  readonly desktopOnly?: boolean;
}
```

Lý do đổi `bar: boolean` → `bar: 1|2|3|4`: hiện [BottomNav.tsx:14](src/components/BottomNav.tsx:14) dùng `slice(0,2)` / `slice(2)`, nghĩa là **thứ tự thanh dưới phụ thuộc thứ tự khai báo mảng** — thêm một mục ở giữa `NAV_ITEMS` sẽ âm thầm xáo trộn thanh điều hướng. Đây là bug chờ xảy ra.

### 6.3 ⭐ MA TRẬN PARITY — công cụ chống "thừa/thiếu"

Đây là phần trả lời trực tiếp yêu cầu *"tránh bị thừa thiếu các phần quan trọng"*. **Quy tắc: không PR nào được merge nếu làm một ô chuyển sang ❌.**

| # | Chức năng | Lối vào MOBILE (hiện tại) | Lối vào DESKTOP (hiện tại) | Sau kế hoạch: MOBILE | Sau kế hoạch: DESKTOP |
|---|---|---|---|---|---|
| 1 | Tổng quan | Bottom nav ✅ | Sidebar ✅ | Bottom nav slot 1 | Sidebar · Hằng ngày |
| 2 | Tạo phiếu **mua** | FAB → sheet ✅ | Nút CTA sidebar ✅ | FAB (chạm) | CTA kép + phím `N` |
| 3 | Tạo phiếu **bán** | FAB → sheet ✅ | Sidebar ✅ | FAB (chạm) | CTA kép + phím `B` |
| 4 | Lịch sử | Bottom nav ✅ | Sidebar ✅ | Bottom nav slot 2 (tab "Đã xong") | Sidebar · master-detail |
| 5 | Phiếu nháp / hàng chờ | Bottom nav ✅ | Sidebar ✅ | **Tab trong "Phiếu"** + badge | Sidebar + badge |
| 6 | **Công nợ** | ⚠️ chỉ trong sheet "Thêm" | Sidebar ✅ | **Bottom nav slot 4** | Sidebar · Hằng ngày |
| 7 | Người bán | Sheet "Thêm" ✅ | Sidebar ✅ | Sheet "Thêm" (đúng tần suất) | Sidebar · Đối tác |
| 8 | Người mua | Sheet "Thêm" ✅ | Sidebar ✅ | Sheet "Thêm" | Sidebar · Đối tác |
| 9 | Mặt hàng | Sheet "Thêm" ✅ | Sidebar ✅ | Sheet "Thêm" | Sidebar · Hàng hoá |
| 10 | Tồn kho | Bottom nav ⚠️ (chiếm slot vàng) | Sidebar ✅ | **Chuyển vào sheet "Thêm"** + card ở Tổng quan | Sidebar · Hàng hoá |
| 11 | **Cấu hình giá** | ⚠️ chôn trong Tiện ích | ⚠️ chôn trong Tiện ích | Sheet "Thêm" → `/pricing` | Sidebar · Hàng hoá |
| 12 | Báo cáo thuế | Sheet "Thêm" ✅ | Sidebar ✅ | Sheet "Thêm" | Sidebar · Báo cáo |
| 13 | Tiện ích (máy tính, ghi chú) | Sheet "Thêm" ✅ | Sidebar ✅ | Sheet "Thêm" | Sidebar · Báo cáo |
| 14 | Tài khoản / Sao lưu | Avatar header ✅ | Sidebar footer ✅ | Avatar header | Topbar menu user |
| 15 | **Tìm kiếm toàn cục** | ❌ không có | ❌ không có | **Nút kính lúp ở header** | **Topbar + `Ctrl/⌘ K`** |
| 16 | **Trạng thái đồng bộ / offline** | ❌ không có | ❌ không có | **Chip ở header** | **Chip ở topbar** |
| 17 | Xuất Excel / PDF lịch sử | Nút trong trang ✅ | Nút trong trang ✅ | Gom vào menu "⋯" | Nút trực tiếp trên toolbar bảng |
| 18 | Chế độ Ngoài trời | Chỉ trong Tài khoản ⚠️ | Chỉ trong Tài khoản ⚠️ | **Nút ☀ ở header** (bật tại chỗ) | **Nút ☀ ở topbar** |

**Tổng kết thay đổi điều hướng:** 3 mục được nâng cấp lối vào (Công nợ, Cấu hình giá, Ngoài trời), 1 mục hạ cấp đúng tần suất (Tồn kho), 2 mục hoàn toàn mới (Tìm kiếm toàn cục, Trạng thái đồng bộ — cái sau là **bắt buộc** khi có backend).

### 6.4 Bottom nav mới (5 slot cố định)

```
┌──────┬──────┬────────┬────────┬──────┐
│Tổng  │Phiếu │  ( + ) │Công nợ │ Thêm │
│quan  │ (3)  │  FAB   │        │ ⋯    │
└──────┴──────┴────────┴────────┴──────┘
          ↑ badge nháp        ↑ badge quá hạn
```
FAB giữ nguyên cơ chế sheet chọn Mua/Bán hiện có ([BottomNav.tsx:70](src/components/BottomNav.tsx:70)) — chỗ này đang làm tốt. Bỏ nút lưới ở header trái (M2), dồn hết vào "Thêm".

---

## 7. THIẾT KẾ LẠI TỪNG MÀN HÌNH

Ký hiệu: 🔴 bắt buộc · 🟡 nên có · 🟢 tuỳ chọn

### 7.1 Tổng quan (`/`) — [DashboardPage.tsx](src/pages/DashboardPage.tsx)

| | Mobile | Desktop |
|---|---|---|
| Bố cục | Cuộn dọc: Hero → 3 KPI → 2 biểu đồ → Doanh thu bán → Gần đây | **Lưới 12 cột**: hàng 1 = Hero(5) + 3 KPI xếp 2×2(4) + Việc cần làm(3); hàng 2 = biểu đồ 7 ngày(7) + theo nông sản(5); hàng 3 = Gần đây dạng bảng(8) + Tồn kho tóm tắt(4) |

- 🔴 Thêm khối **"Việc cần làm hôm nay"** (mới): *n* phiếu nháp chưa xong · *n* khoản **quá hạn** · *n* mặt hàng tồn âm. Đây là thứ AgriDigital gọi là "live position" và là lý do người dùng mở app buổi sáng. Dữ liệu đã có sẵn qua `data.drafts`, `creditTerms` ([DebtPage.tsx:25](src/pages/DebtPage.tsx:25)), `inventoryByProduct`.
- 🔴 Ba KPI hiện tại (`Tuần/Tháng/Còn nợ`) chỉ có 1 cái bấm được ([DashboardPage.tsx:121](src/pages/DashboardPage.tsx:121)) → **cả 3 đều bấm được**, dẫn tới Lịch sử đã lọc sẵn kỳ tương ứng.
- 🟡 Biểu đồ 7 ngày: thêm nhãn giá trị ở cột cao nhất; hiện chỉ có `title` (hover) nên **trên mobile không đọc được số** ([DashboardPage.tsx:136](src/pages/DashboardPage.tsx:136)).
- 🟡 Khối doanh thu bán hiện chỉ hiện khi `hasSalesData` — giữ, nhưng khi rỗng thì hiện empty state có nút "Tạo phiếu bán đầu tiên" thay vì biến mất (biến mất = người dùng không biết tính năng tồn tại).
- 🟢 Bỏ `text-[10px]` → tối thiểu `text-xs`.

### 7.2 Phiếu (`/history` + `/drafts`) — thay đổi lớn nhất

**Hợp nhất thành một màn hình có tab**, vì cả hai đều là "danh sách phiếu":

```
[ Đã xong ] [ Nháp (3) ]        ← tab
[ Mua ][ Bán ][ Tất cả ]        ← segmented (giữ nguyên, HistoryPage.tsx:175)
```

| | Mobile | Desktop |
|---|---|---|
| Bộ lọc | Nút "Lọc (2)" mở **bottom sheet**; chip đang áp dụng hiện thành hàng ngang cuộn được | **Thanh lọc một hàng** trên bảng: ô tìm · kỳ · thanh toán · mặt hàng · [Xoá lọc] |
| Danh sách | Card như hiện tại (đang tốt) | **Bảng**: Ngày · Loại · Đối tác · Mặt hàng · KL · Tổng tiền · Đã trả · Còn nợ · TT |
| Xem chi tiết | Điều hướng sang `/receipt/:id` | **Pane phải** (≥1440px) hoặc slide-over (1024–1439px), URL vẫn đổi thành `/receipt/:id` để chia sẻ link được |

- 🔴 Bộ lọc hiện chiếm nguyên một `<section>` cao ~300px luôn mở ([HistoryPage.tsx:190-256](src/pages/HistoryPage.tsx:190)) — đẩy danh sách xuống dưới màn hình đầu tiên. Phải thu gọn.
- 🔴 Dòng tóm tắt `n phiếu · KL · tổng tiền` phải **dính (sticky)** khi cuộn — đây là con số người dùng đối soát.
- 🟡 Bảng desktop: cột số dùng `.num` (tabular), dòng nợ tô nền `--color-payable/8%`.
- 🟡 Chọn nhiều phiếu (checkbox) → xuất Excel/PDF chỉ những phiếu đã chọn. Hiện chỉ xuất được toàn bộ kết quả lọc ([HistoryPage.tsx:102](src/pages/HistoryPage.tsx:102)).
- 🟢 Virtualize danh sách khi > 200 dòng (xem §11.4).

### 7.3 Tạo phiếu (`/new`, `/sales`) — màn hình quan trọng nhất

#### 7.3.0 ⭐ CÂN NHIỀU KHÁCH CÙNG LÚC — chốt 09/08/2026

> **Đã xác nhận với nhóm: việc này xảy ra thật.** Ở điểm cân, nhiều nông hộ đến cùng lúc; chủ vựa cân dở cho người này thì người kia tới, quay đi quay lại. Đây là khoảnh khắc bận nhất trong ngày và là chỗ Muamu thiết kế đúng còn ta thì chưa.

**Tin tốt: mô hình dữ liệu đã sẵn sàng, chỉ thiếu giao diện.** `DraftReceipt[]` với `status: 'draft' | 'waiting'` đã tồn tại ([types.ts:230](src/domain/types.ts:230)), autosave 700ms đã chạy, route `/new?draft=<id>` đã hoạt động. Vấn đề là **nháp đang bị đối xử như kho lưu trữ, không phải như bàn làm việc đang mở**.

**Giải pháp: thanh chip "Đang cân" ngay đầu màn tạo phiếu.**

```
┌────────────────────────────────────────────────┐
│  ĐANG CÂN (3)                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐  │
│  │ ● Cô   │ │  Chú   │ │  HTX   │ │ + Khách │  │
│  │  Mai   │ │  Tâm   │ │ Ea Tu  │ │   mới   │  │
│  │ 13,9tr │ │  1,4tr │ │   —    │ │         │  │
│  └────────┘ └────────┘ └────────┘ └─────────┘  │
├────────────────────────────────────────────────┤
│  (phiếu của người đang chọn — như thiết kế cũ) │
```

| Quyết định | Lý do |
|---|---|
| **Một phiếu hiển thị đầy đủ tại một thời điểm**, chuyển bằng **một chạm** | Muamu xếp chồng tất cả khách trên một màn — với form của ta (công thức, phân loại, điều chỉnh giá) thì sẽ thành cuộn vô tận. Người dùng **không cần nhìn thấy** tất cả cùng lúc; họ cần **chuyển** nhanh và **biết ai đang ở mức nào** |
| Mỗi chip hiện **tên + tổng tiền đang chạy** | Đây chính là thông tin họ cần liếc: ai đã bao nhiêu tiền rồi |
| Chuyển chip = đổi `?draft=<id>` | Dùng đúng routing và autosave đã có. **Không cần cấu trúc dữ liệu mới, không cần đổi schema** |
| Hoàn thành phiếu → chip tự biến mất | `deleteDraft` sau khi tạo transaction đã làm sẵn ([NewReceiptPage.tsx:391](src/pages/NewReceiptPage.tsx:391)) |
| Desktop: thanh chip thành **cột trái** (master–detail) | Màn rộng thì hiện được cả danh sách lẫn phiếu đang mở — có luôn cái lợi của Muamu mà không phải nhồi nhét |
| FAB trên mobile: nếu đang có phiên cân, sheet hiện **danh sách đang cân + "Khách mới"** thay vì chỉ Mua/Bán | Quay lại người đang cân dở là thao tác thường hơn là tạo mới |

**Hai nút kết thúc — học cách nén quy trình của Muamu:**

Thay vì "Hoàn thành phiếu" rồi mới hỏi trả bao nhiêu, dùng **hai nút song song**:

| Nút | Hành động |
|---|---|
| **Trả đủ & xong** | Ghi `amountPaid = finalTotal`, hoàn thành, quay về thanh chip |
| **Ghi nợ & xong** | Mở ô nhập số tiền trả ngay (mặc định 0) → hoàn thành, quay về thanh chip |

Đây là bản không-máy-in của `"THANH TOÁN + IN"` / `"NỢ + IN"`. Khi máy in nhiệt được bổ sung sau này, **nhãn nút chỉ cần đổi thành "… & in"** — không phải thiết kế lại (xem §7.3.1).

> **Ảnh hưởng đến §16.3 (bảng từ vựng):** trước đây tôi đề xuất gộp "Phiếu nháp / Hàng chờ" thành một tên duy nhất. Với luồng nhiều khách thì **hai trạng thái này thật sự khác nhau** và `DraftStatus` đã phân biệt sẵn:
> - **Đang cân** (`status: 'draft'`) — trong phiên làm việc hiện tại, hiện trên thanh chip
> - **Để dành** (`status: 'waiting'`) — cất lại làm sau, xem ở tab "Nháp" của màn Phiếu
>
> Dùng đúng hai tên này. Đây là sửa lại đề xuất cũ, không phải mâu thuẫn.

#### 7.3.1 Chuẩn bị sẵn cho máy in nhiệt (đã hoãn, không được chặn đường)

Máy in nhiệt **không vào v1.0** (§17b). Nhưng hai ràng buộc rẻ tiền cần áp dụng **ngay từ bây giờ** để sau này không phải thiết kế lại:

1. **Thiết kế biên nhận theo khổ giấy nhiệt 80mm ngay từ đầu** — một cột, đen tuyền trên trắng, không nền màu, không xám nhạt, không đổ bóng. Không tốn gì thêm, mà lại làm bản PDF trông giống phiếu thật hơn, và trùng khớp với yêu cầu tương phản cao của chế độ Ngoài trời.
2. **Hai nút kết thúc đặt tên sao cho thêm "& in" được** mà không phải sắp xếp lại bố cục.

#### 7.3.2 Bố cục chung

| | Mobile | Desktop (≥1024px) |
|---|---|---|
| Bố cục | Thanh chip "Đang cân" dính trên + 1 cột + **thanh tổng tiền dính đáy**: `Tổng: 13.916.000₫` + 2 nút kết thúc | **3 vùng**: trái (3/12) = danh sách đang cân; giữa (5/12) = đối tác + dòng hàng; phải (4/12) **dính** = tóm tắt tiền, điều chỉnh, thanh toán, chứng từ, 2 nút kết thúc |
| Nhập số | Numpad bottom-sheet (giữ nguyên) | **Bàn phím thật**: `Tab` sang ô kế, `Enter` xuống dòng hàng mới, `Ctrl+Enter` hoàn thành phiếu. Numpad **không hiện** ở desktop |
| Dòng hàng | Card mở rộng đầy đủ (như hiện tại) | **Hàng bảng có thể sửa tại chỗ**: Mặt hàng · Cách tính · KL · Bì/HL · Đơn giá · Thành tiền · [×] |

- 🔴 **`NumField` phải phân biệt thiết bị**: hiện mọi lần chạm đều mở Numpad. Trên desktop có chuột+bàn phím thì Numpad là cản trở. Dùng `matchMedia('(pointer: coarse)')` chứ **không** dùng bề rộng màn hình (tablet cảm ứng 1024px vẫn cần Numpad).
- 🔴 Tổng tiền hiện nằm giữa trang, dưới danh sách dòng ([NewReceiptPage.tsx:732](src/pages/NewReceiptPage.tsx:732)) — với 3 dòng hàng là đã trôi khỏi màn hình. Phải luôn nhìn thấy trên cả 2 nền tảng.
- 🔴 Thay `prompt()`/`alert()` (N4 trong review, [NewReceiptPage.tsx:400](src/pages/NewReceiptPage.tsx:400)) bằng `<Dialog>` — modal "Thêm điều chỉnh" đã có sẵn ở [dòng 956](src/pages/NewReceiptPage.tsx:956), chỉ cần thống nhất về một component.
- 🔴 Trạng thái lưu nháp hiện là chữ xám `text-xs` cạnh tiêu đề ([dòng 455](src/pages/NewReceiptPage.tsx:455)) → đổi thành chip có icon: `● Đang lưu` / `✓ Đã lưu 10:32` / `⚠ Chưa đồng bộ`. **Chip này chính là chỗ hiển thị trạng thái sync khi có backend** — thiết kế sẵn từ bây giờ.
- 🟡 Cảnh báo vượt tồn kho khi bán ([dòng 700](src/pages/NewReceiptPage.tsx:700)) đang là dòng chữ nhỏ trong card → nâng thành banner có màu ở đầu form.
- 🟡 File 1.120 dòng cần tách: `ReceiptForm/` → `CounterpartyPicker.tsx`, `LineEditor.tsx`, `LineTable.tsx` (desktop), `AdjustmentsPanel.tsx`, `PaymentPanel.tsx`, `AttachmentPicker.tsx`, `ReceiptSummary.tsx`. **Tách thuần cơ học, không đổi logic** — đây là điều kiện để làm được layout 2 cột.

### 7.4 Chi tiết phiếu (`/receipt/:id`) — [ReceiptDetailPage.tsx](src/pages/ReceiptDetailPage.tsx)

- 🔴 Desktop: render **bên trong pane phải** của màn Phiếu khi vào từ danh sách; render full-page khi mở trực tiếp bằng URL. Một component, hai chỗ nhúng.
- 🔴 Hàng nút (In · PDF · PNG · Chia sẻ · Xoá) → mobile: 2 nút chính (Chia sẻ, In) + menu "⋯"; desktop: đủ nút trên toolbar.
- 🔴 Thay `confirm()` xoá chứng từ/xoá phiếu ([dòng 156](src/pages/ReceiptDetailPage.tsx:156)) bằng `<ConfirmDialog>`.
- 🟡 Khối in ấn: rà lại `@media print` — hiện chỉ có `.no-print` ([index.css:29](src/index.css:29)). Cần thêm: ẩn sidebar/topbar, ép nền trắng, `break-inside: avoid` cho bảng dòng hàng.

### 7.5 Công nợ (`/debts`) — [DebtPage.tsx](src/pages/DebtPage.tsx)

| | Mobile | Desktop |
|---|---|---|
| | Tab Phải trả / Phải thu (giữ) → accordion theo đối tác (giữ) | **2 cột song song**: Phải trả ‖ Phải thu, không cần tab |

- 🔴 Thêm bộ lọc **"Quá hạn"** — logic `isOverdue` đã có ([dòng 25](src/pages/DebtPage.tsx:25)) nhưng chỉ dùng để vẽ badge, chưa lọc được.
- 🔴 Sắp xếp mặc định: quá hạn trước, rồi đến số tiền giảm dần.
- 🟡 Nút "Trả một phần" mở form inline có `<input type="number">` ([dòng 229](src/pages/DebtPage.tsx:229)) — trên mobile nên mở Numpad cho nhất quán với màn tạo phiếu.
- 🟡 Nút "Trả đủ" thực hiện ngay không xác nhận ([dòng 218](src/pages/DebtPage.tsx:218)) — thao tác tiền bạc không hoàn tác được thì cần một bước xác nhận nhẹ (toast có nút "Hoàn tác" trong 5 giây là đủ, không cần dialog).

### 7.6 Tồn kho (`/inventory`) — [InventoryPage.tsx](src/pages/InventoryPage.tsx)

- 🔴 **Sửa lỗi hình thái**: bảng + `overflow-x-auto` cho mobile (D8) → mobile dùng card (Mặt hàng / Tồn — Đã mua · Đã bán), desktop giữ bảng.
- 🟡 Thêm cột **giá vốn bình quân** và **giá trị tồn ước tính** (tính được từ `transactions`, thêm selector trong `domain/inventory.ts` — không đổi store).
- 🟡 Hàng tồn âm: hiện tô nền đỏ ([dòng 49](src/pages/InventoryPage.tsx:49)) → thêm dòng giải thích "bán nhiều hơn mua — kiểm tra lại phiếu", vì tồn âm luôn là dấu hiệu nhập sai.

### 7.7 Người bán / Người mua (`/suppliers`, `/buyers`)

- 🔴 Desktop: bảng (Tên · SĐT · Khu vực · Số phiếu · Tổng tiền · Còn nợ · Giao dịch gần nhất) + sắp xếp theo cột.
- 🔴 Hai trang này gần như giống hệt nhau ([SuppliersPage.tsx](src/pages/SuppliersPage.tsx) vs [BuyersPage.tsx](src/pages/BuyersPage.tsx)) → gộp thành **một component `PartnerListPage`** nhận prop `role: 'supplier' | 'buyer'`, giữ 2 route riêng. Giảm ~80 dòng trùng lặp và đảm bảo hai bên không lệch tính năng về sau.
- 🔴 Không sửa/xoá được đối tác từ danh sách (chỉ tạo được trong lúc lập phiếu) → thêm nút Sửa mở dialog. `updateBuyer`/`deleteBuyer` đã có trong store ([store.tsx:90](src/data/store.tsx:90)) nhưng **chưa có UI nào gọi tới**; phía người bán thì store còn chưa có `updateSupplier`/`deleteSupplier` — đây là hai chỗ *duy nhất* trong kế hoạch cần thêm action vào store (xem §12.2).

### 7.8 Mặt hàng (`/products`) & Cấu hình giá (`/pricing`)

🔴 **Phát hiện quan trọng: quy tắc giá đang bị chẻ đôi ở hai màn hình, với hai bản editor gần như trùng nhau.**

| Nơi | Quản lý gì | Code |
|---|---|---|
| `/products` → thẻ từng mặt hàng | Rule **gắn với 1 mặt hàng** (`r.productId === p.id`) | [ProductsPage.tsx:197-425](src/pages/ProductsPage.tsx:197) (~90 dòng) |
| `/utilities` → `PricingRulesCard` | Rule **chung** (`!r.productId`) | [UtilitiesPage.tsx:156-311](src/pages/UtilitiesPage.tsx:156) (~90 dòng) |

Hệ quả: không màn hình nào cho thấy **toàn bộ** quy tắc đang tác động lên một phiếu; chủ vựa thấy tiền lệch mà không biết tìm ở đâu. Hai bản editor cũng đã bắt đầu lệch nhau — [ProductsPage.tsx:415](src/pages/ProductsPage.tsx:415) đã sửa lỗi #6 (thêm `pointer-events-none` vào overlay khi rule tắt), còn bản sao ở [UtilitiesPage.tsx:299](src/pages/UtilitiesPage.tsx:299) **vẫn thiếu** → tắt rule chung xong không bật lại được.

- 🔴 Gộp thành **một** component `PricingRuleEditor` dùng ở cả hai nơi (xoá ~90 dòng trùng, hết chuyện lệch bản).
- 🔴 Tạo route `/pricing`: danh sách **tất cả** rule (chung + theo mặt hàng) trong một bảng, lọc theo mặt hàng. Thẻ mặt hàng ở `/products` giữ lối tắt "Quy tắc giá (2)" trỏ sang `/pricing?product=…`.
- 🟡 Mỗi rule có dòng xem trước: "Đơn hàng 1 tấn × 20.000đ → điều chỉnh −50.000đ" để hiểu tác dụng trước khi bật.

### 7.9 Báo cáo (`/reports`) & Tiện ích (`/utilities`)

- 🟡 `/reports`: `max-w-2xl` ([ReportsPage.tsx:54](src/pages/ReportsPage.tsx:54)) là hợp lý cho mobile nhưng desktop nên thêm **bảng xem trước theo tháng** bên phải thay vì chỉ 4 ô số.
- 🟡 `/utilities` sau khi tách pricing chỉ còn Máy tính + Ghi chú → desktop 2 cột, mobile 1 cột. Máy tính nên dùng chung `Numpad` thay vì `<input type="number">` ([UtilitiesPage.tsx:45](src/pages/UtilitiesPage.tsx:45)).

### 7.10 Đăng nhập / Đăng ký (`/login`…) — [AuthPages.tsx](src/pages/AuthPages.tsx)

- 🟡 Desktop: bố cục 2 nửa — trái là ảnh/giá trị sản phẩm, phải là form (chuẩn của mọi SaaS). Hiện là card giữa màn hình.
- 🔴 **Trước khi deploy công khai phải bỏ mật khẩu demo hardcode** trong state và dòng gợi ý ([AuthPages.tsx:14-15,48](src/pages/AuthPages.tsx:14)). Chỉ giữ khi `import.meta.env.DEV`.

### 7.11 Màn hình mới cần thêm

| Màn | Vì sao |
|---|---|
| **404 / NotFound** | C4 — hiện URL sai ra trang trắng |
| **ErrorBoundary fallback** | C5 — "Đã có lỗi, dữ liệu của bạn vẫn an toàn trong máy" + nút Tải lại + nút Xuất backup |
| **Command palette (⌘K)** | Parity #15 — tìm phiếu/khách/mặt hàng, desktop-first nhưng mobile cũng mở được bằng nút kính lúp |
| **Offline banner** | Khi `!navigator.onLine`: dải mỏng "Đang ngoại tuyến — dữ liệu sẽ tự đồng bộ khi có mạng" |

---

## 8. THƯ VIỆN COMPONENT CẦN XÂY

```
src/components/
├── layout/
│   ├── AppShell.tsx          ⬅ thay Layout.tsx
│   ├── AppTopbar.tsx         🆕 desktop: search + sync + outdoor + user
│   ├── SidebarNav.tsx        ♻ thêm nhóm, CTA kép
│   ├── MobileHeader.tsx      ♻ bỏ nút lưới, thêm chip sync + nút ☀
│   ├── BottomNav.tsx         ♻ 5 slot cố định
│   ├── PageContainer.tsx     🆕 4 mức bề rộng
│   └── PageHeader.tsx        🆕 title + subtitle + actions + breadcrumb
├── ui/
│   ├── Button.tsx            🆕 variant: primary|secondary|ghost|danger, size: sm|md|lg
│   ├── Input.tsx / NumInput.tsx  🆕 NumInput tự chọn Numpad vs bàn phím
│   ├── Select.tsx  Chip.tsx  Badge.tsx
│   ├── Card.tsx  StatCard.tsx     ♻ gom từ Kpi/Stat đang lặp ở Dashboard + Reports
│   ├── Dialog.tsx  ConfirmDialog.tsx   🆕 thay alert/confirm
│   ├── BottomSheet.tsx       ✅ đã có, giữ
│   ├── Toast.tsx + ToastProvider  🆕 (có hành động "Hoàn tác")
│   ├── Skeleton.tsx  EmptyState.tsx  ErrorState.tsx  🆕
│   ├── Segmented.tsx         🆕 gom từ 3 chỗ tự viết
│   └── Numpad.tsx            ✅ đã có, giữ nguyên
├── data/
│   ├── DataView.tsx          🆕 ⭐ table ở ≥md, card ở <md — cùng một khai báo cột
│   ├── DataToolbar.tsx       🆕 search + filter + export + chọn nhiều
│   ├── FilterSheet.tsx       🆕 bộ lọc dạng sheet cho mobile
│   ├── MasterDetail.tsx      🆕 2 pane ở ≥1440, slide-over 1024–1439, điều hướng ở <1024
│   └── Money.tsx  Weight.tsx  DateText.tsx   🆕 bọc format + tabular-nums
└── feedback/
    ├── SyncBadge.tsx         🆕 ⭐ điểm cắm của backend
    └── OfflineBanner.tsx     🆕
```

### 8.1 `DataView` — component then chốt

Đây là thứ giải quyết đồng thời D2, D8 và nguyên tắc #4:

```tsx
<DataView
  rows={results}
  getKey={(t) => t.id}
  onRowClick={(t) => openDetail(t.id)}
  columns={[
    { id: 'date',  header: 'Ngày',    cell: (t) => <DateText v={t.date}/>, width: 96,
      mobile: 'secondary' },
    { id: 'party', header: 'Đối tác', cell: (t) => t.supplierName,
      mobile: 'title' },
    { id: 'total', header: 'Tổng',    cell: (t) => <Money v={total(t)}/>, align: 'right',
      mobile: 'value' },
    { id: 'debt',  header: 'Còn nợ',  cell: (t) => <Money v={debt(t)}/>, align: 'right',
      mobile: 'badge', hideBelow: 'lg' },
  ]}
/>
```

Thuộc tính `mobile` quyết định ô đó rơi vào vị trí nào của card khi màn hình hẹp (`title` / `secondary` / `value` / `badge` / `hidden`). **Một lần khai báo cột → hai hình thái.** Đây chính là cách áp dụng nguyên tắc "thiết kế component tự thích ứng" thay vì thiết kế trang, và là cách đảm bảo không bao giờ có cột nào "có trên desktop mà mất trên mobile" một cách vô tình.

---

## 9. TƯƠNG TÁC & TRẠNG THÁI

| Trạng thái | Hiện tại | Chuẩn mới |
|---|---|---|
| Đang tải | Không có (dữ liệu đồng bộ từ localStorage) | `<Skeleton>` theo hình dạng nội dung — **bắt buộc chuẩn bị trước khi có backend** |
| Rỗng | Dòng chữ xám, mỗi nơi một kiểu | `<EmptyState icon title description action>` |
| Lỗi | `alert()` hoặc `console.error` | `<ErrorState>` trong vùng + `<Toast variant="danger">` |
| Thành công | Không có phản hồi | `<Toast>` 3 giây, thao tác xoá kèm nút "Hoàn tác" |
| Xác nhận | `confirm()` | `<ConfirmDialog>`; thao tác nhẹ thì bỏ hẳn xác nhận, dùng Hoàn tác |
| Nhập liệu | `prompt()` ở 1 chỗ | `<Dialog>` với form |
| Ngoại tuyến | Không hiển thị | `<OfflineBanner>` + `<SyncBadge>` |

**Quy tắc kỹ thuật:** thêm luật lint cấm `alert|confirm|prompt` trong `src/` (`.oxlintrc.json` — `no-alert`).

---

## 10. CHẾ ĐỘ NGOÀI TRỜI v2 & KHẢ NĂNG TIẾP CẬN

| Việc | Chi tiết |
|---|---|
| 🔴 Bật nhanh | Nút ☀ ở header/topbar (parity #18), không phải vào Tài khoản |
| 🔴 Tác động rộng hơn | Ngoài `font-size`, đổi cả `--density-row-h` (thoáng hơn) và tăng độ dày nét chữ; hiện chỉ có 3 override rời rạc ([index.css:65-83](src/index.css:65)) |
| 🟡 Dark mode | Thêm `prefers-color-scheme` + lựa chọn Sáng/Tối/Tự động trong Tài khoản. Không dùng chung với Ngoài trời (Ngoài trời = **sáng + tương phản cao**, ngược với Tối) |
| 🔴 Tương phản | Rà toàn bộ `text-slate-400` trên nền trắng (tỉ lệ ~2.8:1, **không đạt** WCAG AA 4.5:1). Đổi tối thiểu `text-slate-500`; hiện `text-slate-400` xuất hiện ở ~25 chỗ |
| 🔴 Vùng chạm | Tối thiểu 44×44px trên mobile. Nút "×" xoá điều chỉnh ([NewReceiptPage.tsx:767](src/pages/NewReceiptPage.tsx:767)) và nút "✕" đóng banner survey ([DashboardPage.tsx:87](src/pages/DashboardPage.tsx:87)) đang nhỏ hơn |
| 🔴 Bàn phím | Focus ring nhất quán (`focus-visible:ring-2 ring-brand-500`); bẫy focus trong Dialog/Sheet; `Esc` đóng (Numpad đã làm đúng — [Numpad.tsx:37](src/components/Numpad.tsx:37)) |
| 🟡 Đọc màn hình | `aria-label` cho mọi nút chỉ có icon; `aria-live="polite"` cho tổng tiền và trạng thái lưu |
| 🟡 Ngôn ngữ | `<html lang="vi">` ✅ đã đúng |

---

## 11. HIỆU NĂNG FRONTEND

### 11.1 Chia tách bundle (giải C6)

```tsx
// App.tsx — lazy theo route
const ReportsPage   = lazy(() => import('./pages/ReportsPage'));
const ReceiptDetail = lazy(() => import('./pages/ReceiptDetailPage'));
```
```ts
// Thư viện nặng: chỉ nạp khi bấm nút
const exportXlsx = async () => {
  const { exportTransactionsXlsx } = await import('../domain/export');
  exportTransactionsXlsx(results, filename);
};
```
`xlsx` (~430KB) + `jspdf` (~350KB) + `html2canvas` (~200KB) chiếm phần lớn 1,27MB. Chuyển sang `import()` động trong [HistoryPage.tsx:102](src/pages/HistoryPage.tsx:102), [ReportsPage.tsx:41](src/pages/ReportsPage.tsx:41), [receiptExport.ts](src/domain/receiptExport.ts) — **không đụng logic**, chỉ đổi cách nạp.

**Ngân sách:** JS khởi tạo ≤ **250KB gzip**; LCP ≤ 2,5s trên 4G mô phỏng.

### 11.2 Tăng tốc cảm nhận
- Skeleton thay vì màn trắng khi lazy chunk đang tải (`<Suspense fallback>`).
- `content-visibility: auto` cho card ngoài khung nhìn trong danh sách dài.

### 11.3 Font tự lưu trữ (giải M6)
Cài `@fontsource/be-vietnam-pro` (subset `vietnamese` + `latin`, weight 400/600/800), bỏ 3 thẻ `<link>` Google Fonts trong `index.html`. Font vào precache của service worker → **mở app offline lần đầu vẫn đúng chữ**, và bớt 2 lượt DNS/TLS khi khởi động.

### 11.4 Danh sách dài
Ngưỡng: > 200 dòng thì bật virtualization (`@tanstack/react-virtual`, ~4KB). Quan trọng khi lên Supabase vì một vựa chạy 2 năm có thể có 5.000–10.000 phiếu.

---

## 12. ⭐ TƯƠNG THÍCH BACKEND — PHẦN QUAN TRỌNG NHẤT

Mục tiêu: làm xong redesign này thì việc cắm Supabase ([KE_HOACH_TRIEN_KHAI_DEPLOY.md §3–4](KE_HOACH_TRIEN_KHAI_DEPLOY.md)) **chỉ phải sửa `src/data/`, không sửa `src/pages/` và `src/components/` lần thứ hai**.

### 12.1 Ranh giới ba tầng — bất di bất dịch

```
components/ + pages/   ← redesign toàn bộ ở đây (Phase 0–5)
        ↕ chỉ qua useStore() và các hàm domain/
data/ (storage, auth, attachmentStore, store.tsx)  ← Supabase thay ở đây (giai đoạn sau)
        ↕
domain/                ← KHÔNG ĐỤNG. Không một dòng nào.
```

Kế hoạch deploy đã khẳng định điều này ở §4.2 — kế hoạch frontend này **tuân thủ**, và bổ sung: tầng UI cũng không được import trực tiếp `data/storage.ts` (hiện [ProfilePage.tsx:89](src/pages/ProfilePage.tsx:89) đang gọi thẳng `localStorage.setItem(dataKeyForUser(...))` — **đây là chỗ rò rỉ tầng duy nhất, phải bọc lại thành `store.importData(payload)`**, nếu không thì khi lên Supabase, chức năng Nhập backup sẽ ghi vào localStorage rồi bị đồng bộ ghi đè).

### 12.2 Hợp đồng `StoreValue` — giữ nguyên chữ ký

Toàn bộ 22 action hiện có ([store.tsx:37-99](src/data/store.tsx:37)) **giữ nguyên tên và chữ ký**. Redesign chỉ được phép:

| Cho phép | Không cho phép |
|---|---|
| Thêm selector mới trong `domain/` | Đổi kiểu tham số/trả về của action đang có |
| Thêm action mới **theo đúng khuôn mẫu cũ** | Cho component gọi thẳng `repo.*` |
| Thêm trường **chỉ đọc** vào `StoreValue` | Chuyển action sang `Promise` (xem 12.5) |

Hai action mới duy nhất cần thêm (phục vụ §7.7 và §12.1):
```ts
updateSupplier(id: string, patch: Partial<Supplier>): void;
deleteSupplier(id: string): void;
importData(payload: { appData: AppData; attachments?: … }): Promise<void>;
```

### 12.3 Ba thứ phải thêm NGAY để không phải làm UI hai lần

Đây là điểm mấu chốt. UI mới cần vẽ sẵn chỗ cho ba khái niệm mà **hôm nay chưa có nhưng chắc chắn sẽ có** khi lên Supabase:

**(a) Trạng thái tải/lỗi của toàn bộ store**
```ts
// data/useStore.ts — thêm vào StoreValue
readonly status: {
  readonly loading: boolean;   // hôm nay: luôn false (localStorage đồng bộ)
  readonly error: string | null;
  readonly lastSyncedAt: string | null;  // hôm nay: null
  readonly pendingCount: number;         // hôm nay: 0
};
```
UI (`<Skeleton>`, `<SyncBadge>`, `<ErrorState>`) đọc từ đây ngay từ Phase 1. Khi Supabase vào, chỉ việc điền giá trị thật — **không component nào phải sửa**.

**(b) Trạng thái đồng bộ theo từng bản ghi**
```ts
// domain/types.ts — thêm field TÙY CHỌN, không phá migration
export type SyncState = 'synced' | 'pending' | 'conflict';
export interface Transaction { …; readonly syncState?: SyncState; }
```
`<DataView>` vẽ chấm nhỏ cạnh dòng khi `syncState === 'pending'`. Hôm nay `undefined` → không vẽ gì. Đây là cách kế hoạch deploy §4 mô tả ("đánh dấu chưa đồng bộ") — bây giờ ta chuẩn bị sẵn chỗ hiển thị.

**(c) Phân trang / lọc ở tầng dữ liệu**
Hiện mọi trang đọc `data.transactions` rồi lọc bằng JS ([HistoryPage.tsx:63](src/pages/HistoryPage.tsx:63)). Với Supabase và 10.000 phiếu thì không kéo hết về được. Giải pháp không phá vỡ hiện tại: UI gọi qua một hook trung gian
```ts
const { rows, total, loadMore, isLoadingMore } = useTransactionList(filters);
```
Hôm nay hook này bọc `filterTransactions()` đồng bộ và cắt trang phía client. Sau này nó gọi `supabase.from('transactions').select().range()`. **Chữ ký hook không đổi → UI không đổi.**

### 12.4 🔴 ID phải là UUID — nếu bỏ qua sẽ phải migrate đau đớn

Hiện id sinh bằng [storage.ts:44](src/data/storage.ts:44):
```ts
`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
// → "tx-m3k2p1-a7f3q"
```
Nhưng schema đề xuất trong kế hoạch deploy dùng `id uuid primary key default gen_random_uuid()`. Hai thứ này **không tương thích**. Hệ quả nếu để nguyên: hoặc phải đổi cột sang `text` (mất tính ràng buộc và index kém hơn), hoặc phải remap toàn bộ id khi migrate — mà id đang được tham chiếu chéo ở `counterpartyId`, `productId`, `attachmentIds`, `ruleId`.

**Sửa ngay trong Phase 0** (1 dòng, không rủi ro vì dữ liệu cũ vẫn đọc được — id là `string` ở mọi nơi):
```ts
const newId = (): string =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
```
Lợi ích kép: id sinh ở client là UUID → **ghi lạc quan (optimistic insert) giữ nguyên id sau khi đồng bộ lên server**, không cần đợi server trả id về mới render. Đây là điều kiện cần của offline-first.

### 12.5 Action đồng bộ trong thế giới bất đồng bộ

Supabase là async, action hiện tại là sync và có cái **trả về giá trị ngay** (`addTransaction` trả `Transaction` để [NewReceiptPage.tsx:392](src/pages/NewReceiptPage.tsx:392) điều hướng tới `/receipt/${tx.id}`).

**Đừng chuyển sang `async`.** Mô hình đúng cho local-first:

```
UI gọi addTransaction(input)
   → ghi vào cache cục bộ + gán syncState:'pending'  (đồng bộ, tức thời)
   → trả về Transaction ngay                          (UI điều hướng được luôn)
   → đẩy vào hàng đợi nền → gửi Supabase khi có mạng → syncState:'synced'
```

Giữ chữ ký đồng bộ giữ được UX tức thời hiện tại và **không phải sửa một dòng UI nào**. Lỗi mạng không báo qua giá trị trả về mà qua `status.error` + `<Toast>` — hạ tầng đã dựng ở 12.3(a).

### 12.6 Ánh xạ tên trường

FE camelCase (`amountPaid`, `counterpartyId`, `creditTerms`), Postgres snake_case (`amount_paid`, …). Viết **một** module `data/mappers.ts` (`toRow` / `fromRow`) cho mỗi thực thể. UI và `domain/` tuyệt đối không biết tới tên cột DB.

### 12.7 Ảnh chứng từ — một hook che hai nguồn

Hiện UI gọi thẳng `getAttachment(id)` và tự quản `URL.createObjectURL` ở **hai chỗ** với hai cách khác nhau ([NewReceiptPage.tsx:172](src/pages/NewReceiptPage.tsx:172) không revoke — rò rỉ; [ReceiptDetailPage.tsx:33](src/pages/ReceiptDetailPage.tsx:33) có revoke). Gom thành:
```ts
const { url, status } = useAttachmentUrl(id);
```
Hôm nay đọc IndexedDB; sau này thử IndexedDB trước, miss thì lấy signed URL từ Supabase Storage rồi cache lại. **Sửa rò rỉ bộ nhớ + chuẩn bị backend cùng lúc.**

### 12.8 🔴 Bốn điều chỉnh cần bổ sung vào schema ở kế hoạch deploy

Đối chiếu §3.2 của [KE_HOACH_TRIEN_KHAI_DEPLOY.md](KE_HOACH_TRIEN_KHAI_DEPLOY.md) với type thực tế trong [types.ts](src/domain/types.ts), có 4 chỗ lệch cần sửa **trong tài liệu deploy** (không phải việc của frontend, nhưng phát hiện từ đây):

| # | Vấn đề | Sửa |
|---|---|---|
| 1 | Bảng `transactions` và `drafts` **không có `updated_at`**, trong khi §11 của chính tài liệu đó chốt chiến lược chống xung đột là "ghi sau thắng theo `updated_at`" | Thêm `created_at`, `updated_at timestamptz not null default now()` cho **mọi** bảng + trigger cập nhật |
| 2 | Bảng `drafts` **thiếu `kind`** — đúng lỗi 🔴#4 trong [báo cáo review](BAO_CAO_REVIEW_GIAI_DOAN_2.md) (nháp phiếu bán hoàn thành ra phiếu mua). `DraftReceipt` ở [types.ts:233](src/domain/types.ts:233) đã có `kind` rồi | Thêm `kind text check (kind in ('purchase','sale'))` và `counterparty_id uuid` |
| 3 | `transactions` thiếu `supplier_id`, nhưng `Transaction.supplierId` là **bắt buộc** trong type ([types.ts:204](src/domain/types.ts:204)) dù đã đánh dấu deprecated | Hoặc thêm cột `supplier_id text`, hoặc đổi type thành optional trước — chọn một, đừng để mapper phải bịa giá trị |
| 4 | Xoá cứng (hard delete) làm hỏng đồng bộ đa thiết bị: máy A xoá phiếu, máy B offline sửa phiếu đó → khi online lại phiếu "sống dậy" | Thêm `deleted_at timestamptz` (xoá mềm) và lọc `deleted_at is null` trong policy/truy vấn |

### 12.9 Bảng kiểm "sẵn sàng backend" cho mỗi PR frontend

- [ ] Không import `data/storage` hay `localStorage` trực tiếp từ `pages/` hoặc `components/`
- [ ] Không giả định dữ liệu có sẵn ngay lập tức — mọi danh sách xử lý được `status.loading`
- [ ] Không giả định đã tải **toàn bộ** dữ liệu — dùng `useTransactionList` thay vì `data.transactions.filter()`
- [ ] Mọi thao tác ghi đều có phản hồi (toast) và có thể hiển thị trạng thái `pending`
- [ ] Id mới sinh bằng `newId()` (UUID)

---

## 13. LỘ TRÌNH TRIỂN KHAI

| Phase | Nội dung | Ước lượng | Deploy được sau phase này? |
|---|---|---|---|
| **0 — Nền móng + 4 lỗi chặn** | 🔴 **L1–L4 ở §16.1** (bỏ seed cho user thật · thống nhất `parseNumber` · xác nhận/hoàn tác · đăng nhập bằng SĐT) · token màu + nền ấm `sand` (§17.2 bước 1–2) · utility `input-base`/`card`/`num` · `newId()` UUID (§12.4) · self-host font · bỏ `user-scalable=no` · lazy `xlsx`/`jspdf` · ErrorBoundary + route 404 · thêm `status` vào store (§12.3a) · luật lint cấm `alert/confirm/prompt` và `parseFloat` trong `pages/` | **3–4 buổi** | ✅ An toàn, đo được ngay. **L1–L4 phải xong trước khi có người dùng thật đầu tiên** |
| **1 — Khung & điều hướng** | `AppShell` + `AppTopbar` + `PageContainer` + `PageHeader` · nav mới có nhóm · bottom nav 5 slot · `SyncBadge` + `OfflineBanner` · nút ☀ ngoài trời · Toast/Dialog/ConfirmDialog + thay hết `alert/confirm/prompt` · **bảng từ vựng §16.3** gom vào `i18n/labels.ts` · ba tầng bề mặt (§17.2 bước 3) | **3–4 buổi** | ✅ Đây là lúc "cảm giác app" thay đổi rõ nhất |
| **2 — Bốn màn hình cốt lõi** | `DataView` + `MasterDetail` · Tổng quan (lưới 12 cột + "Việc cần làm") · Phiếu (gộp Lịch sử+Nháp, bảng desktop, filter sheet mobile) · Tạo phiếu (tách file + 2 cột desktop + **đảo mặc định Numpad §16.2** + **hiển thị dần §16.5**) · Chi tiết phiếu trong pane · `MoneyInput` có ngăn nghìn + đọc bằng chữ | **6 buổi** | ✅ **Mốc demo/pilot** — đạt yêu cầu "tốt cả PC và mobile" |
| **3 — Phần còn lại + onboarding** | Công nợ 2 cột + lọc quá hạn · Tồn kho đổi hình thái · gộp `PartnerListPage` (+ `tel:` §16.6) · tách `/pricing` · Báo cáo · Tiện ích · Auth 2 nửa · **màn hình chào + hướng dẫn 4 bước + nút "?" (§16.4)** | **4 buổi** | ✅ |
| **4 — Hoàn thiện** | Command palette ⌘K · phím tắt · **theme tối (§17.2 bước 4)** · virtualization · `useAttachmentUrl` (§12.7) · rà a11y & tương phản · in ấn | **2–3 buổi** | ✅ |
| **5 — Đo & sửa + thử với người thật** | Lighthouse (Performance/A11y/PWA) · test thật iOS Safari + Android Chrome · test 320px và 2560px · **thử nghiệm với 3 người 45–60 tuổi (§16.7)** · sửa tồn đọng | **2 buổi** | ✅ Chốt |

**Thứ tự này là bắt buộc**: Phase 0 và 1 tạo ra nền để Phase 2 không phải viết lại. Không nhảy thẳng vào Phase 2.

**Quan hệ với kế hoạch deploy:** Phase 0–2 của tài liệu này chính là "Bước 1" trong [lộ trình §10 của kế hoạch deploy](KE_HOACH_TRIEN_KHAI_DEPLOY.md) (chuẩn bị frontend độc lập với backend). Làm xong Phase 2 thì deploy bản localStorage lên Vercel để có link demo, rồi mới sang Bước 2 (dựng Supabase) — đúng thứ tự đã chốt.

**Việc cần làm song song, không thuộc phạm vi frontend:** rà lại 10 lỗi trong [BAO_CAO_REVIEW_GIAI_DOAN_2.md](BAO_CAO_REVIEW_GIAI_DOAN_2.md) trước khi vào Phase 2, để không redesign đè lên bug. Kiểm tra nhanh trạng thái hôm nay:

| Lỗi | Trạng thái | Bằng chứng |
|---|---|---|
| #1 icon PWA 192/512 | ✅ đã có | `public/icon-192.png`, `public/icon-512.png` |
| #2 thiếu nav `/sales`, `/reports` | ✅ đã sửa | [navItems.ts:22,30](src/components/navItems.ts:22) |
| #3 phiếu bán tạo rác trong Người bán | ✅ đã sửa | `addTransaction` rẽ nhánh `resolveBuyer` khi `kind==='sale'` — [storage.ts:481](src/data/storage.ts:481) |
| #4 nháp phiếu bán → hoàn thành ra phiếu mua | ✅ đã sửa | `completeDraft` đọc `draft.kind` — [storage.ts:641](src/data/storage.ts:641); DraftsPage route theo kind — [DraftsPage.tsx:60](src/pages/DraftsPage.tsx:60) |
| #5 xoá phiếu/nháp không dọn ảnh IndexedDB | ✅ đã sửa | cascade `deleteAttachment` ở [store.tsx:60,74](src/data/store.tsx:60) |
| #6 overlay rule tắt chặn nút bật | ⚠️ **nửa vời** | đã sửa ở [ProductsPage.tsx:415](src/pages/ProductsPage.tsx:415), **còn sót** ở bản sao [UtilitiesPage.tsx:299](src/pages/UtilitiesPage.tsx:299) — xử lý cùng §7.8 |
| #7–#10, N1–N5 | chưa kiểm | cần rà thủ công; N1 (rò rỉ objectURL) và N4 (`prompt()`) đã nằm sẵn trong kế hoạch này ở §12.7 và §9 |

---

## 14. TIÊU CHÍ NGHIỆM THU (đo được, không cảm tính)

### Bố cục
- [ ] Ở 1280px và 1920px: **không** trang nào để trống > 25% chiều ngang khả dụng ở vùng nội dung chính
- [ ] Ở 1024px trở lên: Lịch sử, Tồn kho, Người bán, Người mua hiển thị dạng **bảng**
- [ ] Ở 375px: **không** trang nào cuộn ngang (kiểm tra `document.body.scrollWidth <= window.innerWidth` trên mọi route)
- [ ] Ở 320px (iPhone SE cũ): bottom nav 5 slot không vỡ chữ

### Parity
- [ ] 18/18 dòng trong ma trận §6.3 đều ✅ ở cả hai cột
- [ ] Mọi chức năng đến được trong **≤ 2 chạm** từ Tổng quan trên mobile, **≤ 2 click** trên desktop
- [ ] Mọi hành động có trên desktop đều có trên mobile (kể cả xuất Excel/PDF, sửa đối tác)

### Chất lượng
- [ ] Lighthouse mobile: Performance ≥ 85 · Accessibility ≥ 95 · Best Practices ≥ 95 · PWA installable ✅
- [ ] JS khởi tạo ≤ 250KB gzip (hiện ~1,27MB chưa nén)
- [ ] `grep -r "alert(\|confirm(\|prompt(" src/` → 0 kết quả
- [ ] `grep -r "text-\[10px\]" src/` → 0 kết quả
- [ ] Không còn chuỗi `inputCls` trùng lặp (`grep -c "rounded-xl border border-slate-200 bg-white px-3"` → 0 ngoài `index.css`)
- [ ] Mọi nút chỉ có icon đều có `aria-label`
- [ ] Điều hướng bằng bàn phím xong trọn vẹn luồng tạo phiếu, không chạm chuột

### Sẵn sàng backend
- [ ] Chữ ký 22 action trong `StoreValue` **không đổi** so với `git show HEAD:src/data/useStore.ts`
- [ ] `grep -rn "localStorage\|from '../data/storage'" src/pages src/components` → 0 kết quả
- [ ] `newId()` trả về UUID v4 hợp lệ
- [ ] Bật cờ giả lập `status.loading = true` → mọi trang hiện skeleton, **không trang nào crash**
- [ ] Gán tay `syncState: 'pending'` cho 1 phiếu → hiện chỉ báo trên danh sách và trong chi tiết

### Thực địa
- [ ] Test thật trên iOS Safari (PWA đã cài) và Android Chrome — không chỉ DevTools
- [ ] Test ngoài nắng với chế độ Ngoài trời bật (kiểm tra bằng mắt, có người dùng thật càng tốt)
- [ ] Test chế độ máy bay: tạo phiếu → bật mạng → không mất dữ liệu

---

## 15. RỦI RO & CÁCH XỬ LÝ

| Rủi ro | Mức | Cách xử lý |
|---|---|---|
| Tách `NewReceiptPage` 1.120 dòng làm hỏng luồng tính tiền/auto-save | **Cao** | Tách **thuần cơ học** (cắt JSX ra component nhận props), một commit riêng, không đổi state hay logic; đối chiếu trước/sau bằng cùng bộ dữ liệu seed và so tổng tiền |
| Redesign xong rồi backend lại đòi sửa UI | **Cao** | Chính là lý do có §12; đặc biệt 12.3 và 12.4 phải làm ở Phase 0, không hoãn |
| Bỏ `user-scalable=no` gây zoom ngoài ý muốn khi chạm ô nhập trên iOS | Trung bình | Đảm bảo mọi `input` mobile ≥16px; test trên iPhone thật |
| Đổi bottom nav làm người dùng cũ bối rối | Trung bình | Pilot còn nhỏ nên chấp nhận được; kèm coach-mark một lần khi mở app sau cập nhật |
| Đổi `newId()` sang UUID làm vỡ dữ liệu cũ | Thấp | Id ở mọi nơi là `string`, không parse, không so sánh prefix — dữ liệu cũ đọc bình thường. Kiểm chứng bằng cách import 1 file backup cũ |
| Làm quá tay design system, chậm ra sản phẩm | Trung bình | Chỉ xây component khi có ≥ 2 nơi dùng; danh sách §8 đã lọc theo tiêu chí đó |

---

## 16. ⭐ THIẾT KẾ CHO NGƯỜI DÙNG ÍT RÀNH CÔNG NGHỆ

> Đây là mục quan trọng ngang §12. Tệp người dùng thật: **chủ vựa / thương lái 40–65 tuổi, ở Bình Phước – Đắk Lắk – Gia Lai, dùng điện thoại Android tầm trung, biết Zalo và Facebook, phần lớn không dùng email, mắt trung niên, làm việc ngoài nắng, tay bẩn/đeo găng.** Mọi quyết định giao diện phải trả lời được câu: *bác ấy tự làm được không, hay phải có người chỉ?*

### 16.1 Bốn lỗi CHẶN — sửa ở Phase 0, không hoãn

Đây không phải chuyện thẩm mỹ. Bốn lỗi này làm **sai dữ liệu** hoặc **chặn người dùng ngay cửa vào**.

#### 🔴 L1 — Mọi tài khoản mới đều bị gieo dữ liệu giả

`loadData` gọi `buildSeedData()` cho bất kỳ user mới nào ([storage.ts:350](src/data/storage.ts:350)), sinh ra 5 nông hộ giả và hàng chục phiếu giả với số tiền thật ([seed.ts:29,55](src/data/seed.ts:29)) — bao gồm một phiếu **74.000.000₫** ghi ngày hôm nay.

- **Hậu quả với tệp này:** người dùng mới không phân biệt được dữ liệu mẫu với dữ liệu của mình. Họ hoặc bỏ app vì "máy tính báo sai", hoặc tệ hơn là bắt đầu ghi phiếu thật lẫn vào và **vĩnh viễn không bao giờ tách ra được**. Tổng quan, Công nợ, Tồn kho, Báo cáo thuế đều sai từ ngày đầu.
- **Sửa:** chỉ seed cho `user-demo`. Người dùng thật vào app với dữ liệu rỗng + màn hình chào đón (§16.4).
```ts
// storage.ts — thay dòng 350
const seeded = id === 'user-demo' ? buildSeedData() : emptyData();
```
- **Kèm theo:** thêm nút "Dùng thử với dữ liệu mẫu" trong Tài khoản → nạp seed **có gắn cờ** và banner đỏ "Đang xem dữ liệu mẫu — [Xoá hết và bắt đầu thật]".

#### 🔴 L2 — Hai cách hiểu dấu phẩy trái ngược nhau trong cùng một app

| Nơi | Code | Người dùng gõ `1,5` thì ra |
|---|---|---|
| Numpad + form tạo phiếu | [parseNumber.ts:7](src/utils/parseNumber.ts:7) — `s.replace(/,/g, '.')` | **1,5** (phẩy = thập phân — đúng chuẩn Việt Nam) |
| Ô "Trả một phần" ở Công nợ | [DebtPage.tsx:182](src/pages/DebtPage.tsx:182) — `parseFloat(s.replace(/,/g, ''))` | **15** (phẩy = ngăn nghìn) |

Cùng một người, cùng một app, cùng một chuỗi ký tự → hai con số lệch nhau 10 lần, ở đúng ô **thanh toán tiền**.

- **Sửa:** `DebtPage` phải dùng `parseNumber()` như mọi nơi khác. Cấm `parseFloat` trực tiếp trong `pages/` bằng luật lint.
- **Kèm theo (quan trọng hơn):** ô nhập tiền **không hiển thị dấu ngăn nghìn khi gõ**. Người dùng gõ `74000000` chỉ thấy một dãy số liền, không có cách nào tự đếm số 0. Làm `<MoneyInput>` hiển thị `74.000.000` ngay khi gõ (giữ giá trị thô trong state), và dưới ô ghi chữ: **"bảy mươi bốn triệu đồng"**. Đọc bằng chữ là cách kiểm tra duy nhất mà người ít rành công nghệ tin được.
- **Bỏ `type="number"`** ở [NumField](src/pages/NewReceiptPage.tsx:1095) → dùng `type="text" inputMode="decimal"`. Lý do: `type="number"` bị lăn chuột đổi giá trị ngoài ý muốn trên desktop, và cách nó xử lý dấu ngăn nghìn khác nhau giữa các trình duyệt.

#### 🔴 L3 — Năm hành động phá huỷ không hỏi lại, không hoàn tác được

| Hành động | Vị trí | Mức thiệt hại |
|---|---|---|
| **"Trả đủ"** — ghi nhận thanh toán ngay lập tức | [DebtPage.tsx:218](src/pages/DebtPage.tsx:218) | **Sai sổ nợ với người thật** |
| Xoá phiếu nháp | [DraftsPage.tsx:75](src/pages/DraftsPage.tsx:75) | Mất phiếu đang cân dở |
| Xoá quy tắc giá | [ProductsPage.tsx:359](src/pages/ProductsPage.tsx:359), [UtilitiesPage.tsx:221](src/pages/UtilitiesPage.tsx:221) | Phiếu sau tính sai tiền |
| Xoá ghi chú | [UtilitiesPage.tsx:133](src/pages/UtilitiesPage.tsx:133) | Mất thông tin |

Nghịch lý: xoá **ảnh chứng từ** thì lại có `confirm()` ([ReceiptDetailPage.tsx:156](src/pages/ReceiptDetailPage.tsx:156)). App đang cẩn thận với cái ít quan trọng và dễ dãi với cái quan trọng nhất.

- **Quy tắc mới — áp dụng đồng nhất toàn app:**

| Loại hành động | Cách xử lý | Ví dụ |
|---|---|---|
| Ghi tiền (thanh toán, hoàn thành phiếu) | **Toast + nút "Hoàn tác" 8 giây** (không dialog — dialog làm chậm việc lặp lại nhiều lần) | "Trả đủ" |
| Xoá thứ khôi phục được | Toast + "Hoàn tác" 8 giây | Ghi chú, nháp |
| Xoá thứ không khôi phục được | `<ConfirmDialog>` nêu rõ **hậu quả bằng số** | "Xoá phiếu 12.500.000₫ của Cô Lê Thị Mai ngày 08/08?" |
| Xoá cấu hình ảnh hưởng tương lai | ConfirmDialog + nêu ảnh hưởng | "Xoá quy tắc này, các phiếu sau sẽ không tự trừ 50.000₫ nữa" |

- Nút xoá **không được đặt cạnh nút xác nhận**. Hiện ở [DraftsPage.tsx:58](src/pages/DraftsPage.tsx:58) ba nút `Tiếp tục | Hoàn thành | Xóa` nằm sát nhau trong lưới 3 cột — tay đeo găng chạm nhầm là chuyện chắc chắn xảy ra. Chuyển "Xoá" vào menu "⋯".

#### 🔴 L4 — Đăng nhập bắt buộc email

[auth.ts:40](src/data/auth.ts:40) bắt buộc email khi đăng ký; quên mật khẩu cũng qua email ([auth.ts:101](src/data/auth.ts:101)). Phần lớn tệp người dùng mục tiêu **không có hoặc không nhớ email** — họ có số điện thoại và Zalo.

**Quyết định (09/08/2026): tạm hoãn OTP-SMS. Giai đoạn phát hành đầu dùng "một ô đăng nhập" — tên tài khoản / số điện thoại / email + mật khẩu.** OTP-SMS là bước nâng cấp Phase sau, khi đã có ngân sách tin nhắn và đủ người dùng để cần tự phục hồi mật khẩu quy mô lớn.

**Thiết kế màn hình đăng nhập:**

```
┌────────────────────────────────────────┐
│  Tên đăng nhập, số điện thoại hoặc email │   ← MỘT ô duy nhất
│  [ 0905112233                        ]  │
│  Mật khẩu                               │
│  [ ••••••                        👁 ]  │   ← có nút hiện mật khẩu
│  ☑ Ghi nhớ đăng nhập trên máy này       │   ← mặc định BẬT
│  [        Đăng nhập        ]            │
│  Quên mật khẩu? · Đăng ký               │
└────────────────────────────────────────┘
```

| Quyết định | Lý do cho tệp người dùng này |
|---|---|
| **Một ô duy nhất**, tự nhận dạng loại | Không bắt người dùng hiểu "email hay số điện thoại?" — đó là câu hỏi của lập trình viên, không phải của chủ vựa |
| **Nút 👁 hiện mật khẩu**, mặc định ẩn | Gõ sai mật khẩu trên bàn phím điện thoại là nguyên nhân đăng nhập hỏng số 1 |
| **"Ghi nhớ đăng nhập" bật sẵn** | Mục tiêu là người dùng **gần như không bao giờ phải gõ lại mật khẩu**. Phiên đăng nhập dài (Supabase refresh token), chỉ hỏi lại khi đổi thiết bị |
| **Mật khẩu tối thiểu 6 ký tự, cho phép toàn số** | Bắt chữ hoa + ký tự đặc biệt với tệp này = họ viết ra giấy dán lên tường, an toàn giảm chứ không tăng |
| **SĐT chuẩn hoá khi lưu** | `0905112233`, `0905 112 233`, `+84905112233` phải là **cùng một tài khoản**. Chuẩn hoá về `+84…` ở tầng `data/`, hiển thị lại dạng `0905 112 233` |
| **Đăng ký: bắt buộc Tên + SĐT + mật khẩu; email tuỳ chọn** | Email chỉ dùng để tự lấy lại mật khẩu — phải nói rõ điều đó ngay dưới ô |

**Trước mắt (chưa có backend):** đổi khoá tra cứu trong [auth.ts](src/data/auth.ts) từ `email` sang một trường `identifier` chuẩn hoá, thêm `username?` và cho `email?` thành tuỳ chọn. Không đổi kiến trúc, không đổi `UserProfile` ở tầng UI ngoài việc thêm 2 trường.

**Khi lên Supabase** — chi tiết kỹ thuật ở [KE_HOACH_TRIEN_KHAI_DEPLOY.md §3.4](KE_HOACH_TRIEN_KHAI_DEPLOY.md). Tóm tắt: Supabase Auth chỉ nhận email hoặc phone làm định danh, nên cần một hàm `resolve_identifier()` phía DB dịch "tên tài khoản / SĐT / email" → email nội bộ trước khi gọi `signInWithPassword`.

> ⚠️ **Hệ quả phải chấp nhận và phải nói rõ với người dùng:** người đăng ký **không khai email** thì **không thể tự lấy lại mật khẩu**. Ở quy mô pilot (vài chục người) thì hỗ trợ tay qua Zalo là khả thi; nhưng đây là **giới hạn có trần** — xem §3.4 của tài liệu deploy để biết khi nào bắt buộc phải bật OTP.

- **Bỏ mật khẩu demo hardcode** trong state và dòng gợi ý ([AuthPages.tsx:14,48](src/pages/AuthPages.tsx:14)) khi không phải `import.meta.env.DEV`.

### 16.2 Numpad — đảo ngược mặc định

Bàn phím số 56px là **lợi thế cạnh tranh lớn nhất** của app với tệp này, nhưng đang bị giấu sau một nút emoji 🔢 rộng 32px nép trong góc ô nhập ([NewReceiptPage.tsx:1101](src/pages/NewReceiptPage.tsx:1101)). Chạm vào ô thì ra bàn phím hệ thống bé tí.

| | Hiện tại | Mới |
|---|---|---|
| Chạm ô tiền/cân (thiết bị cảm ứng) | Bàn phím hệ thống | **Numpad** |
| Muốn bàn phím thường | (mặc định) | Nút phụ "⌨ Bàn phím thường" trong header Numpad |
| Desktop (`pointer: fine`) | Numpad qua nút emoji | Bàn phím thật, **không** có Numpad |

Bổ sung cho Numpad: nút **"Xoá hết"** (hiện chỉ có ⌫ xoá từng ký tự — sửa một số sai 8 chữ số phải bấm 8 lần), và hiển thị **số đang gõ dưới dạng có dấu ngăn nghìn + đọc bằng chữ** ngay trên bàn phím.

### 16.3 Bảng từ vựng — nói giọng chợ, không nói giọng phần mềm

Rà toàn bộ chuỗi hiển thị trong `src/**/*.tsx`. Đổi ở **một** file `src/i18n/labels.ts` để về sau sửa chữ không phải lục 20 file.

| Đang dùng | Vấn đề | Đổi thành |
|---|---|---|
| `KL/SL cân (kg)` | Viết tắt kép, không đọc ra được | **Cân được (kg)** |
| `KL bì/trừ (kg)` | | **Trừ bì (kg)** |
| `KL/SL tính tiền` · `Tổng KL/SL tính tiền` | | **Tính tiền theo** · **Tổng tính tiền** |
| `Phiếu nháp / Hàng chờ` | Hai tên cho một thứ, ngay trên tiêu đề | **Tách thành hai trạng thái có nghĩa thật** (sửa 09/08, xem §7.3.0): **Đang cân** (`draft`) · **Để dành** (`waiting`) |
| `Cách tính` + `netAfterTare`… | Khái niệm kỹ thuật lộ ra ngoài | Gập vào **"Sửa cách tính"**, chỉ mở khi cần (§16.5) |
| `Cân - bì` | Dấu trừ dễ đọc nhầm | **Cân xong trừ bì** |
| `Trừ hao hụt %` | | **Trừ hao hụt** |
| `Cao su: hàm lượng` | | **Cao su tính theo hàm lượng mủ** |
| `Lãi gộp ước tính (tháng)` | Từ kế toán | **Tạm tính lời (tháng này)** |
| `Bán − Mua` | Ký hiệu toán | **Tiền bán trừ tiền mua** |
| `Điều chỉnh giá` | Mơ hồ | **Cộng / trừ thêm** |
| `Chiết khấu SL lớn` | Viết tắt + từ Hán Việt | **Bớt giá khi mua nhiều** |
| `Phí xe đến lấy` | Ổn — giữ | — |
| `Số tiền (âm để trừ)` · `âm = trừ đi` | Bắt hiểu số âm | Hai nút **[+ Cộng thêm] [− Trừ bớt]** rồi nhập số dương |
| `Phân loại chất lượng` | | **Loại hàng** (Loại 1, Loại 2…) |
| `Hectogram (hg)` — *"302 hg = 30.2 kg"* ([ProfilePage.tsx:173](src/pages/ProfilePage.tsx:173)) | Không ai nói "hectogram" | **Lạng (hg)** — *"302 lạng = 30,2 kg"* |
| `Tồn kho` | Chấp nhận được | Giữ, thêm phụ đề **"hàng còn trong kho"** |
| `Công nợ` → tab `Phải trả` / `Phải thu` | Ổn — giữ | — |
| `Báo cáo thuế` | Ổn | Thêm phụ đề **"số liệu để đi khai thuế"** |
| `Chứng từ đính kèm` | Từ hành chính | **Ảnh phiếu cân / hoá đơn** |
| `Sao lưu & Phục hồi` | | **Lưu dữ liệu ra file / Lấy lại từ file** |
| `Xuất file Backup` | Chữ Anh | **Lưu ra file** |
| `Đơn vị nhập` / `Đ.vị` | | **Cân theo** (kg / lạng / bao) |
| `Ngưỡng kg` | | **Từ bao nhiêu kg trở lên** |
| `Khách lẻ` | Ổn — giữ | — |

**Nguyên tắc chung:** một nhãn không được vừa viết tắt vừa dùng từ Hán Việt. Nếu buộc phải dùng thuật ngữ (Tồn kho, Công nợ, Báo cáo thuế — vì đó là từ người dùng nghe từ kế toán/cơ quan thuế), thì **phải có một dòng phụ đề giải thích bằng lời thường**.

### 16.4 Lần đầu mở app — hiện không có gì cả

Không tour, không nút "?", không số hotline, không video. Với tệp này thì cách vào nghề gần như duy nhất là được người khác cầm tay chỉ. Bổ sung:

| Việc | Chi tiết |
|---|---|
| 🔴 **Màn hình chào (sau L1)** | Dữ liệu rỗng → không phải trang trắng, mà là 3 thẻ lớn: **[① Tạo phiếu đầu tiên] [② Xem thử dữ liệu mẫu] [③ Lấy lại dữ liệu từ file]** |
| 🔴 **Hướng dẫn 4 bước lần đầu tạo phiếu** | Coach-mark chỉ vào: chọn người bán → chọn mặt hàng → nhập cân & giá → bấm Hoàn thành. Chỉ hiện một lần, có nút "Bỏ qua" |
| 🔴 **Nút "?" ở mọi trang** | Mở sheet giải thích trang đó làm gì, bằng 3–4 câu + 1 ảnh |
| 🟡 **Số Zalo hỗ trợ** trong Tài khoản | Kênh liên lạc mà tệp này thật sự dùng. Banner khảo sát đã có ([DashboardPage.tsx:79](src/pages/DashboardPage.tsx:79)) là chiều ngược lại — cần cả chiều họ gọi mình |
| 🟡 **Video 60 giây** nhúng ở màn hình chào | Người ít rành công nghệ học bằng xem, không bằng đọc |

### 16.5 Giảm gánh nặng của form tạo phiếu

Form hiện có ~15 trường hiện cùng lúc. Với người mới, phần lớn là nhiễu.

- 🔴 **Ô "Cách tính" đang hiện luôn luôn** ([NewReceiptPage.tsx:576](src/pages/NewReceiptPage.tsx:576)), kể cả khi đã chọn mặt hàng — mà chọn mặt hàng thì `applyProduct` đã tự set cách tính rồi ([dòng 329](src/pages/NewReceiptPage.tsx:329)). Gập vào link nhỏ **"Sửa cách tính"**. Người dùng thường không bao giờ cần mở nó.
- 🔴 **Hiển thị dần (progressive disclosure)**: mặc định chỉ hiện *Người bán · Mặt hàng · Cân được · Đơn giá · Thành tiền*. Các mục **Cộng/trừ thêm · Ảnh chứng từ · Hẹn ngày trả · Ghi chú** gập lại sau nút "Thêm thông tin khác".
- 🟡 **Nhắc lại lần trước**: khi chọn một nông hộ đã có lịch sử, hiện dòng gợi ý *"Lần trước: Điều, 28.000đ/kg, ngày 05/08"* + nút "Dùng lại". Dữ liệu đã có sẵn trong `supplierSummaries`.
- 🟡 **Xem lại trước khi chốt**: bấm "Hoàn thành phiếu" mở sheet tóm tắt (Ai · Hàng gì · Bao nhiêu kg · Bao nhiêu tiền · Trả bao nhiêu · Còn nợ bao nhiêu) rồi mới lưu. Một chạm thêm, đổi lấy việc không phải sửa phiếu sai.

### 16.6 Việc nhỏ, giá trị lớn

| Việc | Vị trí | Vì sao |
|---|---|---|
| 🔴 **`tel:` gọi điện** từ danh sách nông hộ/người mua | [SuppliersPage.tsx:59](src/pages/SuppliersPage.tsx:59) hiển thị SĐT dạng chữ | Việc chủ vựa làm nhiều nhất sau khi mở danh sách là **gọi điện**. Một dòng code |
| 🟡 **Chia sẻ qua Zalo** rõ ràng | `navigator.share` đã có | Ghi rõ nút "Gửi Zalo" thay vì icon chia sẻ chung chung |
| 🟡 **Nút ☀ Ngoài trời ra header** | §6.3 parity #18 | Người cần nó nhất là người ít có khả năng tự tìm ra nó trong Cài đặt |
| 🟡 **Đọc số tiền bằng chữ** ở tổng phiếu | mới | Cách kiểm tra duy nhất mà người dùng tin được |

### 16.7 Tiêu chí nghiệm thu riêng cho mục này

Bổ sung vào §14:

- [ ] Tài khoản mới đăng ký → **0 giao dịch, 0 nông hộ**, thấy màn hình chào
- [ ] Gõ `1,5` vào ô "Trả một phần" và ô "Đơn giá" → **cùng ra 1,5**
- [ ] Gõ `74000000` vào ô đơn giá → hiện `74.000.000` và dòng chữ "bảy mươi bốn triệu"
- [ ] Không hành động phá huỷ nào thực hiện được chỉ bằng **một** lần chạm không thể quay lại
- [ ] Đăng ký + đăng nhập được **không cần email**
- [ ] Chạm vào ô tiền trên điện thoại → **Numpad mở**, không phải bàn phím hệ thống
- [ ] `grep -rn "KL/SL\|Hectogram\|Backup\|SL lớn" src/` → 0 kết quả
- [ ] Mỗi trang có nút "?" giải thích
- [ ] **Thử nghiệm với người thật:** 3 người 45–60 tuổi chưa từng thấy app, **tự tạo được phiếu thu mua đầu tiên trong 3 phút, không ai chỉ**. Đây là tiêu chí quyết định — các tiêu chí khác chỉ là điều kiện cần

---

## 17. MÀU SẮC & THEME

### 17.1 Chẩn đoán: vấn đề không phải "thiếu màu", mà là "màu không mang thông tin"

Thống kê class màu trong `src/`:

| Họ màu | Số lần dùng | Đang dùng cho |
|---|---|---|
| `slate` | **382** | Nền, chữ, viền — gần như mọi thứ |
| `green` | **172** | Thương hiệu · nút chính · phiếu mua · đã thanh toán · lời · tồn kho dương · **và mọi thứ tích cực khác** |
| `amber` | 41 | Công nợ · phiếu nháp · cảnh báo |
| `blue` | 30 | Phiếu bán · banner khảo sát |
| `rose`/`red` | 39 | Xoá · quá hạn · tồn âm |
| `emerald` | 7 | Gradient hero · lãi gộp |
| `stone`/`orange` | 6 | Màu nông sản (rải rác) |

Hai kết luận:

**(a) Cảm giác "đơn điệu" đến từ bề mặt, không từ sắc độ.** Toàn bộ app là **thẻ trắng, bo 16px, `shadow-sm`, trên nền `slate-100`** — không có phân cấp độ nổi, không có bề mặt nhuộm màu, không có phân vùng. 40 thẻ giống hệt nhau xếp dọc thì dù đổi màu chủ đạo thành gì cũng vẫn đơn điệu.

**(b) Màu xanh đang gánh quá nhiều việc.** Thương hiệu, nút chính, "phiếu mua", "đã thanh toán", "có lời", "tồn dương" — **tất cả đều green-700**. Khi mọi thứ quan trọng đều một màu thì **không gì nổi bật cả**. Đây mới là lý do thật khiến app trông nhạt. Thêm nữa, xanh đang được gọi bằng **14 token khác nhau** (`green-50/100/200/400/500/600/700/800` × bg/text/border/ring) không theo hệ thống nào.

### 17.2 Đề xuất: đổi — nhưng đổi vai trò, không đổi thương hiệu

Tôi **không khuyến nghị đổi màu chủ đạo**. Lý do: xanh lá đúng với ngành nông sản, người dùng pilot đã quen, và `theme_color: '#15803d'` đã nằm trong PWA manifest ([vite.config.ts:20](vite.config.ts)) — đổi là đổi cả màu thanh trạng thái điện thoại và icon đã cài. Cái cần đổi là **kỷ luật sử dụng màu** và **chất liệu bề mặt**.

#### Bước 1 — Nền trung tính chuyển từ LẠNH sang ẤM

`slate` là xám ngả xanh (lạnh, hợp fintech). Đổi sang xám ngả nâu/cát cho một sản phẩm nông nghiệp — ấm hơn, thân thiện hơn, và **làm màu xanh lá + hổ phách nổi hẳn lên** vì bớt cạnh tranh sắc lạnh. Đây là thay đổi rẻ nhất và tác động thị giác lớn nhất trong toàn bộ mục này.

```css
@theme {
  /* Trung tính ấm — thay slate. Tự đặt để không lệ thuộc bảng mặc định */
  --color-sand-50:  #faf9f7;
  --color-sand-100: #f4f2ee;   /* nền canvas — thay slate-100 */
  --color-sand-200: #e7e3dc;   /* viền */
  --color-sand-400: #a8a196;
  --color-sand-500: #78716c;   /* chữ phụ — ĐẠT tương phản 4.6:1 trên trắng */
  --color-sand-700: #44403c;
  --color-sand-900: #1c1917;   /* chữ chính */
}
```
> Lưu ý kép: đổi `text-slate-400` (2,8:1 — trượt WCAG AA) sang `sand-500` (4,6:1) **giải quyết luôn 48 chỗ vi phạm tương phản** đã nêu ở §10. Một lần đổi, hai vấn đề.

#### Bước 2 — Tách vai trò của màu (phần quan trọng nhất)

Mỗi màu chỉ được mang **một** nghĩa. Xanh lá chỉ còn là **thương hiệu + hành động chính**, không còn kiêm "phiếu mua" hay "có lời".

```css
@theme {
  /* Thương hiệu + hành động chính — CHỈ dùng cho nút chính và nav đang chọn */
  --color-brand-600: #16a34a;
  --color-brand-700: #15803d;   /* giữ đúng theme_color của PWA */

  /* Chiều giao dịch — cặp đối lập, nhận ra ngay không cần đọc chữ */
  --color-in:   #0d9488;   /* MUA / nhập hàng  — xanh mòng két */
  --color-out:  #7c3aed;   /* BÁN / xuất hàng  — tím */

  /* Tiền */
  --color-payable:    #c2410c;   /* mình nợ người ta — cam đất */
  --color-receivable: #0369a1;   /* người ta nợ mình — xanh dương sâu */
  --color-overdue:    #be123c;   /* quá hạn */
  --color-profit:     #15803d;
  --color-loss:       #be123c;

  /* Nông sản — chính thức hoá barColor() đang hardcode trong DashboardPage */
  --color-crop-rubber: #78716c;
  --color-crop-cashew: #d97706;
  --color-crop-coffee: #7c2d12;
  --color-crop-pepper: #3f3f46;
}
```

Vì sao **mua = mòng két, bán = tím** thay vì xanh lá / xanh dương như hiện tại: hai màu này **đối lập rõ trên màn hình rẻ tiền và dưới nắng**, trong khi green-700 vs blue-600 hiện tại thì gần nhau về độ sáng, người mắt kém rất khó phân biệt phiếu mua với phiếu bán trong danh sách trộn lẫn. Và quan trọng hơn: gỡ được xanh lá khỏi vai "phiếu mua" thì **nút chính mới nổi trở lại**.

> **Bắt buộc:** màu không bao giờ là tín hiệu duy nhất. Mọi chỗ phân biệt mua/bán phải có **thêm icon và chữ** ("↓ Mua" / "↑ Bán") — cho người mù màu (khoảng 8% nam giới, và đây là tệp gần như toàn nam).

#### Bước 3 — Ba tầng bề mặt thay vì một

Đây là thứ trực tiếp chữa cảm giác "phẳng lì".

| Tầng | Dùng cho | Kiểu |
|---|---|---|
| **Canvas** | Nền trang | `sand-100`, không đổ bóng |
| **Card** | Thẻ nội dung thường | Trắng, `shadow-sm`, viền `sand-200` |
| **Raised** | Thứ cần chú ý: tổng tiền, việc cần làm hôm nay | Trắng, `shadow-md`, viền màu ngữ nghĩa 2px |
| **Tinted** | Vùng gom nhóm: bộ lọc, tóm tắt | Nền `sand-50` hoặc màu ngữ nghĩa 8% — **không đổ bóng** |
| **Hero** | Một khối duy nhất mỗi trang | Gradient thương hiệu, chữ trắng |

Quy tắc: **mỗi trang chỉ được có một khối Hero và tối đa hai khối Raised.** Hiện Tổng quan có Hero gradient ([DashboardPage.tsx:98](src/pages/DashboardPage.tsx:98)), Tồn kho cũng có Hero gradient ([InventoryPage.tsx:22](src/pages/InventoryPage.tsx:22)) — giữ, nhưng những khối còn lại phải hạ xuống tầng thấp hơn để có tương phản.

#### Bước 4 — Ba theme, không phải hai

| Theme | Khi nào | Đặc điểm |
|---|---|---|
| **Sáng** (mặc định) | Trong nhà, ban ngày | Như mô tả trên |
| **Ngoài trời** ☀ | Dưới nắng | Nền trắng tinh, chữ `sand-900`, **bỏ hết màu nhạt và shadow**, viền đen 2px, chữ to hơn 12,5%, dòng cao hơn. Đây là chế độ **tương phản cực đại**, không phải "sáng hơn" |
| **Tối** 🌙 | Tối, trong kho, ban đêm | Nền `#1c1917` (nâu đen ấm, không phải đen xanh), thẻ `#292524`. **Màu ngữ nghĩa phải sáng lên 1–2 bậc** để giữ tương phản trên nền tối |

Ba theme là ba giá trị của một thuộc tính `data-theme` trên `<html>` — mở rộng đúng cơ chế `.outdoor` đang có ([Layout.tsx:15](src/components/Layout.tsx:15)), không phải viết mới.

```css
:root[data-theme='outdoor'] { --shadow-card: none; --border-w: 2px; font-size: 112.5%; }
:root[data-theme='dark']    { --color-canvas: #1c1917; --color-card: #292524; --color-in: #2dd4bf; … }
```

### 17.3 Việc phải làm & chi phí

| Việc | Cách làm | Rủi ro |
|---|---|---|
| Thêm token vào `@theme` | Chỉ thêm, chưa xoá gì | Không |
| `slate-*` → `sand-*` | Tìm-thay hàng loạt (382 chỗ), theo bảng ánh xạ cố định | Thấp — thuần trình bày, một commit riêng, xem lại bằng ảnh chụp trước/sau |
| Tách vai trò xanh lá | Sửa tay theo ngữ cảnh ~60 chỗ | Trung bình — cần rà từng chỗ xem xanh đó đang nghĩa gì |
| Ba tầng bề mặt | Áp qua `<Card elevation>` ở §8 | Thấp — làm cùng lúc với dựng component |
| Theme tối | Sau cùng, Phase 4 | Thấp |

**Xếp vào lộ trình:** token + đổi nền ấm vào **Phase 0** (đi cùng đợt thiết lập design token, và nó chữa luôn lỗi tương phản). Tách vai trò màu + ba tầng bề mặt vào **Phase 1–2** (làm cùng lúc với dựng component, không làm riêng). Theme tối vào **Phase 4**.

### 17.4 Tiêu chí nghiệm thu

- [ ] `grep -ro "slate-" src/ | wc -l` → 0
- [ ] Không màu nào mang quá **một** nghĩa (rà bằng bảng ở 17.2)
- [ ] Mọi cặp chữ/nền đạt **≥ 4,5:1**; chế độ Ngoài trời đạt **≥ 7:1**
- [ ] Mua/bán phân biệt được **khi chụp màn hình rồi chuyển sang ảnh xám** (kiểm tra không phụ thuộc màu)
- [ ] Mỗi trang: đúng 1 khối Hero, ≤ 2 khối Raised
- [ ] `barColor()` hardcode trong [DashboardPage.tsx:266](src/pages/DashboardPage.tsx:266) đã chuyển sang token
- [ ] Ba theme đều xem được trên cùng một màn hình mà không phải tải lại app

---

## 17b. ĐỊNH HƯỚNG THẨM MỸ "SỔ VỰA" — chốt 09/08/2026

> Bản trình bày trực quan có mockup ba môi trường và phần mổ xẻ đối thủ: **artifact "Định hướng UI/UX — THUMUA365"**. Mục này là bản ghi quyết định; artifact là bản để đưa cho Tuyến.

**Bối cảnh:** proposal CP4 §6 nêu **Muamu** (Google Play: *"Mua Mủ Cao Su"*, CSU Software Co., Ltd, `vn.muamu.app`) là đối thủ gần nhất. Số liệu thực tế: **hơn 50 lượt tải, chưa có đánh giá nào, cập nhật gần nhất 04/9/2025**. Không phải mối đe doạ cạnh tranh — nhưng do người trong ngành làm nên đáng học.

### Bốn điều Muamu làm ĐÚNG (nghiệp vụ thật, ta đang thiếu)

| # | Điều học được | Ta đang thế nào |
|---|---|---|
| 1 | **Nhiều khách mở song song trên một màn** — ở điểm cân, nông hộ xếp hàng và người ta cân xen kẽ | Ta là "mỗi lần một phiếu" + danh sách nháp. **Có thể đang thua ở đúng khoảnh khắc này.** Cần quyết có làm không |
| 2 | **"NỢ + IN" / "THANH TOÁN + IN"** — gộp hình thức trả và in vào một nút | Ta tách hai bước |
| 3 | **Trạng thái máy in ngay đầu màn** — in phiếu giấy đưa nông hộ là một phần của nghề | Ta chỉ có PDF/PNG/chia sẻ, **chưa có khái niệm máy in nhiệt** |
| 4 | Hàng số dày đặc — với người đã quen thì đọc nhanh hơn đọc nhãn | Vấn đề của Muamu không phải mật độ, mà là thiếu tiêu đề cột |

### Tám điều phải tránh

Năm cột số **không tiêu đề** · hai nút "+" khác màu **không nhãn** · ba con số lớn nhất **không nhãn** · vị trí đẹp nhất dành cho thông tin hành chính (số phiên bản, hạn giấy phép) · chữ bị cắt cụt khắp nơi · bộ biểu tượng chắp vá sai ẩn dụ · màu dùng trang trí không mang nghĩa · không có thanh điều hướng (lưới phóng ứng dụng).

### Luận điểm chốt

> **Cái đẹp ở đây không đến từ trang trí mà từ kỷ luật chữ, khoảng trắng và việc dám để trống.**
> Những lựa chọn khiến app đọc được dưới nắng — chữ đậm, tương phản mạnh, một điểm nhấn mỗi màn, con số là nhân vật chính — **cũng chính là những lựa chọn khiến app trông đắt tiền**. Còn những lựa chọn "cho đẹp" mà giết khả năng đọc (chữ mảnh, pastel, xám nhạt trên trắng) thì đồng thời cũng đã lỗi mốt. Đẹp và dễ đọc ngoài nắng **không mâu thuẫn** — Muamu vừa xấu vừa khó dùng vì cùng một nguyên nhân: thiếu thứ bậc.

### Sáu trụ cột

1. **Con số là nhân vật chính** — bộ chữ riêng cho tiền/khối lượng, đều nét, thẳng cột. Toàn bộ "ngân sách thẩm mỹ" tiêu ở đây.
2. **Giấy ấm, mực đậm** — nền ngả cát thay xám lạnh, mực đen ngả nâu. (Thay §17.2 bước 1.)
3. **Một điểm nhấn mỗi màn** — đúng một khối đậm, thường là con số tiền lớn nhất.
4. **Màu mang nghĩa** — xanh rừng = thương hiệu + nút chính · chàm = phải thu · đất nung = phải trả. Luôn kèm chữ/biểu tượng cho người mù màu.
5. **Một bộ biểu tượng, một độ nét** — 1,75px, lưới 24px. **Bỏ emoji nông sản**, thay bằng ký hiệu vẽ riêng (việc của Tuyến).
6. **Sống sót dưới nắng** — mọi lựa chọn thẩm mỹ phải còn giá trị ở chế độ Ngoài trời.

**Bảng màu chốt:** Giấy `#EDEAE3` · Mực `#1A1714` · Xanh rừng `#14663C` · Phải thu `#0E6E7A` · Phải trả `#9A3412` · Kẻ `#D6D0C4`.
Xanh rừng là bản đậm hơn của `#15803D` hiện tại — giữ nhận diện và `theme_color` của PWA, đạt tương phản 7:1 trên nền giấy.

### Biên nhận là kênh marketing rẻ nhất

Mỗi phiếu in/gửi Zalo đều đến tay **một nông hộ** — người không dùng app nhưng kể chuyện cho vựa khác. CP4 §10 xếp truyền miệng là kênh acquisition chính, và tờ biên nhận chính là vật mang thông điệp đó.

⇒ **Biên nhận phải là thứ được chăm chút nhất trong toàn sản phẩm**, và phải làm *chủ vựa trông chuyên nghiệp hơn trong mắt người bán*. Cho in tên vựa lên đầu phiếu **ngay từ bản Free**. Dòng "Lập bằng THUMUA365" để nhỏ và khiêm tốn — quảng cáo lộ liễu trên chứng từ của khách sẽ phản tác dụng.

### Dứt khoát không làm

Kính mờ / gradient neon · chữ mảnh, chữ <12px, xám nhạt trên trắng · minh hoạ trang trí đẩy nội dung xuống · emoji làm biểu tượng chức năng · ảnh stock nông dân cười · màn hình chờ có hoạt hình · tối làm mặc định.

### Ba việc cần quyết — ✅ ĐÃ CHỐT 09/08/2026

| Ai | Quyết gì | Kết quả |
|---|---|---|
| **Quang Tuyến** | Bảng màu + bộ ký hiệu nông sản | ✅ **Đồng ý.** Bảng màu "Sổ Vựa" ở trên là chính thức — ghi vào `index.css` dạng token ở giai đoạn A. Bộ ký hiệu 4 nông sản: Tuyến vẽ, cần trước giai đoạn D; tạm dùng ký hiệu nét đơn trong mockup |
| **Cả nhóm** | Nhiều khách cùng lúc | ✅ **Có xảy ra thật → đưa vào v1.0.** Thiết kế chi tiết ở §7.3.0. Không phát sinh schema, tận dụng `DraftReceipt` + autosave sẵn có |
| **Cả nhóm** | Máy in nhiệt | ⏸ **Hoãn** — cập nhật sau khi triển khai một thời gian. Hai ràng buộc chuẩn bị sẵn ở §7.3.1 để sau này không phải thiết kế lại |

---

## 18. NGOÀI PHẠM VI (nói rõ để khỏi trôi việc)

- Không viết lại `domain/` hay đổi công thức tính tiền/tồn kho.
- Không đổi framework (giữ Vite + React Router + Tailwind — kế hoạch deploy §2.3 đã kết luận không cần Next.js, kế hoạch này đồng ý).
- Không thêm thư viện UI ngoài (shadcn/MUI): app đã có phong cách riêng phù hợp tệp người dùng, thêm vào sẽ phình bundle và mâu thuẫn với chế độ Ngoài trời.
- Không làm đa ngôn ngữ (i18n) — người dùng mục tiêu 100% tiếng Việt.
- Không làm phân quyền nhiều người dùng/nhân viên — chưa có trong lộ trình nghiệp vụ.
- Không đóng gói Capacitor ở giai đoạn này (giữ nguyên PWA→Capacitor như kế hoạch deploy §6.3).

---

## Nguồn tham khảo

Sản phẩm tương tự:
[Sổ Bán Hàng](https://sobanhang.com/huong-dan-tong-hop-cach-su-dung-so-ban-hang-hieu-qua/) ·
[Sổ Bán Hàng trên App Store](https://apps.apple.com/vn/app/s%E1%BB%95-b%C3%A1n-h%C3%A0ng-qu%E1%BA%A3n-l%C3%BD-to%C3%A0n-di%E1%BB%87n/id1560099589) ·
[OkCredit](https://okcredit.in/) ·
[Khatabook / Vyapar](https://apps.apple.com/in/app/khatabook-vyapar-app/id1488204139) ·
[TTV Software — thu mua nông sản](http://ttvsoft.vn/san-pham/phan-mem-quan-ly-thu-mua-xuat-ban-nong-san-cafe-tieu-p20274) ·
[KiotViet — nông sản tích hợp cân điện tử](https://www.kiotviet.vn/phan-mem-quan-ly-cua-hang-nong-san-thuc-pham-tich-hop-can-dien-tu-ban-hang-nhanh-chong/) ·
[Phần mềm vựa thu mua nông sản](https://phanmemtotnhat.vn/phan-mem-vua-thu-mua-nong-san-thuc-pham-trai-cay-tom-ca) ·
[AgriDigital Platform](https://www.agridigital.io/agridigital-platform) ·
[Bushel Commercial Portal](https://www.bushelpowered.com/agribusiness//solutions/commercial-portal)

Chuẩn thiết kế:
[UXPin — Responsive Design Best Practices 2026](https://www.uxpin.com/studio/blog/best-practices-examples-of-excellent-responsive-design/) ·
[Modern Responsive Breakpoints 2026](https://www.rapiddoctools.com/blog/modern-responsive-breakpoints-2026-guide) ·
[Responsive Design in 2026 — container queries](https://dev.to/armorbreak/responsive-design-in-2026-the-modern-approach-nee)

---

*Tài liệu này bổ sung "chiều giao diện" cho bộ tài liệu Giai đoạn 2 và kế hoạch deploy — không thay đổi lộ trình tính năng, không thay đổi lựa chọn hạ tầng (Supabase + Vercel/Cloudflare), chỉ trả lời câu hỏi "giao diện phải làm lại thế nào để dùng tốt như nhau trên máy tính và điện thoại, mà backend vẫn cắm vào được".*
