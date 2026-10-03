# GIAI ĐOẠN E — PHẦN CÒN LẠI & ONBOARDING

**Buổi:** 4–5 · **Phụ thuộc:** D xong · **Người làm:** Tài (chia được với Khôi) · **Cần từ người khác:** không

---

## 1. TỔNG QUAN

Hoàn thiện các màn còn lại để **ma trận parity đạt 18/18** — mọi chức năng đều có lối vào trên cả máy tính và điện thoại, không thừa không thiếu. Thêm phần **đón người dùng mới**, thứ mà bản demo không có một dòng nào.

Đây là giai đoạn nhiều màn nhưng ít rủi ro: khung, `DataView`, component và tầng dữ liệu đã xong ở D. Phần lớn công việc là lắp ráp.

Điểm cần giữ kỷ luật: **không thêm tính năng.** Proposal CP4 §5.3 nói điểm khác biệt của sản phẩm là *ít tính năng nhưng đúng nghề*.

---

## 2. CÔNG NGHỆ

Không có công nghệ mới. Dùng lại toàn bộ từ D: `DataView` · `MasterDetail` · `PageContainer` · `Dialog`/`Toast` · token màu · `labels.ts`.

| Thứ dùng lại | Ở màn nào |
|---|---|
| `DataView` | Tồn kho · Người bán · Người mua · Mặt hàng · Quy tắc giá |
| `MasterDetail` | Người bán/mua (danh sách + lịch sử giao dịch) |
| `ConfirmDialog` + Toast hoàn tác | Mọi thao tác xoá |
| `Numpad` | Ô trả nợ một phần · máy tính trong Tiện ích |
| `EmptyState` | Mọi danh sách rỗng |

---

## 3. VIỆC CẦN LÀM

### 3.1 Công nợ (`/debts`)

- [ ] Mobile: giữ tab `Phải trả` / `Phải thu` + accordion theo đối tác. Desktop: **hai cột song song**, bỏ tab.
- [ ] 🔴 Thêm bộ lọc **"Quá hạn"** — logic `isOverdue` đã có nhưng mới chỉ dùng để vẽ nhãn, chưa lọc được.
- [ ] Sắp xếp mặc định: quá hạn trước, rồi số tiền giảm dần.
- [ ] Nút "Trả một phần" mở **Numpad** cho nhất quán với màn tạo phiếu.
- [ ] Nút "Trả đủ" → Toast có nút **Hoàn tác 8 giây** (không dùng dialog — thao tác này lặp lại nhiều lần trong ngày).

### 3.2 Tồn kho (`/inventory`)

- [ ] 🔴 Sửa hình thái: bản demo dùng bảng + `overflow-x-auto` cho **cả mobile**. Chuyển sang `DataView` — card ở mobile, bảng ở desktop.
- [ ] Thêm cột **giá vốn bình quân** và **giá trị tồn ước tính** — thêm selector trong `core/inventory.ts`, **không** đổi store.
- [ ] Hàng tồn âm: ngoài nền đỏ, thêm dòng giải thích *"bán nhiều hơn mua — kiểm tra lại phiếu"*. Tồn âm luôn là dấu hiệu nhập sai.
- [ ] Giữ chú thích: tồn tính theo **khối lượng vật lý**, không phải khối lượng tính tiền.

### 3.3 Người bán & Người mua — gộp một component

- [ ] 🔴 Hai trang gần như giống hệt nhau ở bản demo. Gộp thành `PartnerListPage` nhận `role: 'supplier' | 'buyer'`, giữ hai route. Giảm ~80 dòng trùng và bảo đảm hai bên không lệch tính năng về sau.
- [ ] Desktop: bảng (Tên · SĐT · Khu vực · Số phiếu · Tổng tiền · Còn nợ · Gần nhất) + sắp xếp theo cột.
- [ ] 🔴 **Sửa/xoá được đối tác từ danh sách.** Bản demo chỉ tạo được trong lúc lập phiếu; `updateBuyer`/`deleteBuyer` có trong store nhưng **không UI nào gọi tới**, còn phía người bán thì store chưa có hai action tương ứng — bổ sung `updateSupplier`/`deleteSupplier` theo đúng khuôn mẫu cũ.
- [ ] 🟡 **`tel:` gọi điện** — việc chủ vựa làm nhiều nhất sau khi mở danh sách nông hộ. Một dòng code, giá trị lớn.

### 3.4 Mặt hàng (`/products`) & Quy tắc giá (`/pricing`)

- [ ] 🔴 Gộp hai bản editor quy tắc giá đang trùng nhau: bản demo có một bản trong thẻ mặt hàng (`productId` cụ thể) và một bản trong Tiện ích (rule chung), ~90 dòng mỗi bản, **và chúng đã bắt đầu lệch nhau**. Gộp thành một `PricingRuleEditor` dùng ở cả hai chỗ.
- [ ] Tạo route `/pricing`: **tất cả** quy tắc (chung + theo mặt hàng) trong một bảng, lọc theo mặt hàng. Thẻ mặt hàng giữ lối tắt "Quy tắc giá (2)" trỏ sang `/pricing?product=…`.
- [ ] Mỗi rule có dòng xem trước: *"Đơn hàng 1 tấn × 20.000đ → điều chỉnh −50.000đ"*.
- [ ] Overlay khi rule tắt phải có `pointer-events-none` — thiếu nó thì tắt xong không bật lại được.

### 3.5 Báo cáo & Tiện ích

- [ ] `/reports`: giữ bố cục hẹp ở mobile; desktop thêm **bảng xem trước theo tháng** bên phải thay vì chỉ 4 ô số. Giữ nguyên phần cảnh báo pháp lý.
- [ ] `/utilities` sau khi tách quy tắc giá chỉ còn Máy tính + Ghi chú → desktop 2 cột. Máy tính dùng **Numpad** thay `<input type="number">`.

### 3.6 Tài khoản (`/profile`)

- [ ] Hồ sơ · đổi mật khẩu · đơn vị khối lượng · chế độ hiển thị (3 theme).
- [ ] Sao lưu / phục hồi — gọi `importData()` của tầng data, **không đụng thẳng vào lưu trữ**.
- [ ] Nhắc **bổ sung email** nếu tài khoản chưa có (7 ngày một lần) — không có email thì không tự lấy lại mật khẩu được.
- [ ] Hiện số phiên bản ứng dụng (phục vụ hỗ trợ từ xa).
- [ ] Số Zalo hỗ trợ.

### 3.7 Đón người dùng mới

- [ ] **Màn hình chào** khi dữ liệu rỗng — không phải trang trắng, mà ba thẻ lớn:
  `[① Tạo phiếu đầu tiên] [② Xem thử dữ liệu mẫu] [③ Lấy lại dữ liệu từ file]`
- [ ] **Hướng dẫn 4 bước** lần đầu tạo phiếu (coach-mark): chọn người bán → chọn mặt hàng → nhập cân & giá → bấm xong. Hiện một lần, có nút "Bỏ qua".
- [ ] **Nút "?" ở mọi trang** → sheet giải thích trang đó bằng 3–4 câu + một ảnh.
- [ ] 🔴 **Chế độ trình diễn** — nạp `seed.ts` khi bấm "Xem thử dữ liệu mẫu", **luôn kèm banner đỏ** và nút "Xoá hết, bắt đầu thật". Đây là lời giải cho mâu thuẫn giữa lỗi L1 (*bỏ dữ liệu mẫu*) và kế hoạch marketing CP4 §10 (*trình diễn tại điểm thu mua*): không chọn một, mà **tách bạch**.

### 3.8 Rà soát parity

- [ ] Đối chiếu đủ **18 dòng** ma trận ở [KH Frontend §6.3](../KE_HOACH_THIET_KE_LAI_FRONTEND.md). Mỗi ô phải ✅ ở **cả hai** cột.
- [ ] Command palette `⌘K` / nút kính lúp — dòng #15, chức năng duy nhất hoàn toàn mới trong ma trận.

---

## 4. RÀNG BUỘC RIÊNG

1. **Không thêm tính năng ngoài danh sách trên.** Ý tưởng hay → `NOTES.md`.
2. **Không viết component mới nếu `DataView`/`MasterDetail` làm được.** Nếu thấy mình đang viết lại bảng, dừng.
3. **Gộp trước, tô vẽ sau.** `PartnerListPage` và `PricingRuleEditor` phải gộp xong rồi mới chỉnh giao diện — làm ngược thì chỉnh hai lần.
4. **Không đổi `core/` để tiện cho một màn.** Cần dữ liệu mới → thêm *selector*, không sửa hàm đang có.
5. Mọi thao tác xoá đều theo bảng quy tắc ở [KH Frontend §16.1/L3](../KE_HOACH_THIET_KE_LAI_FRONTEND.md): ghi tiền và xoá nhẹ → Toast hoàn tác; xoá không khôi phục được → ConfirmDialog nêu hậu quả bằng số.

---

## 5. YÊU CẦU ĐẦU RA

- [ ] **Parity 18/18** — kiểm từng dòng, có người thứ hai đối chiếu
- [ ] Mọi chức năng đến được trong **≤2 chạm** từ Tổng quan (mobile) và **≤2 click** (desktop)
- [ ] Tài khoản mới → thấy **màn hình chào**, không phải trang trắng
- [ ] Bật chế độ trình diễn → có banner đỏ; bấm "Xoá hết" → về rỗng sạch, **không sót dữ liệu mẫu**
- [ ] Sửa và xoá được nông hộ/người mua từ danh sách
- [ ] Bấm số điện thoại → **máy gọi điện**
- [ ] Tắt một quy tắc giá rồi **bật lại được**
- [ ] Tồn kho ở 375px: **không cuộn ngang**
- [ ] Mọi trang có nút "?" giải thích
- [ ] `grep -rn "KL/SL\|Hectogram\|Backup\|SL lớn" src/` → **rỗng** (bảng từ vựng đã áp)
- [ ] Không file nào >300 dòng; bundle vẫn ≤250KB gzip

---

## 6. CẠM BẪY

| Bẫy | Hậu quả | Tránh bằng |
|---|---|---|
| Chép `SuppliersPage` thành `BuyersPage` | Hai bản lệch nhau dần, sửa lỗi phải sửa hai chỗ — đúng thứ đã xảy ra với editor quy tắc giá | Gộp `PartnerListPage` trước |
| Thêm tính năng nhỏ "cho đủ bộ" | Phá chính điểm khác biệt trong proposal | §4.1 |
| Bỏ qua onboarding vì "để cuối làm" | Cuối thì hết thời gian, mà đây là thứ quyết định người dùng có ở lại không | Làm ngay trong giai đoạn này |
| Nạp dữ liệu mẫu mà không có cờ | Lỗi L1 quay lại dưới hình dạng khác | Banner đỏ + nút xoá hết, bắt buộc |
| Rà parity qua loa | Đúng cái vấn đề ban đầu (Công nợ bị chôn) tái diễn | Đối chiếu từng dòng, hai người |
