# GIAI ĐOẠN G — SITE GIỚI THIỆU & PHÁP LÝ

**Buổi:** 2 · **Phụ thuộc:** F xong · **Người làm:** Tài (nội dung: Nguyên & Linh) · **Cần từ nhóm:** nội dung landing, số Zalo hỗ trợ, tên chủ thể chịu trách nhiệm

---

## 1. TỔNG QUAN

Hai việc, cả hai đều **chặn phát hành**:

1. **Site tĩnh công khai** ở `thumua365.vn` — chỗ khách tìm thấy sản phẩm và chỗ đặt tài liệu pháp lý. App nằm riêng ở `app.thumua365.vn`.
2. **Tài liệu pháp lý** — app lưu **họ tên, số điện thoại, địa chỉ của người thứ ba** (nông hộ, người mua) do người dùng nhập. Đây là dữ liệu cá nhân theo **Nghị định 13/2023/NĐ-CP**. Hiện repo chưa có một dòng nào về việc này.

> Điều nguy hiểm không phải văn phong nghiệp dư, mà là **viết một đằng hệ thống làm một nẻo**. Mọi câu trong hai trang pháp lý phải mô tả đúng những gì kiến trúc thật sự làm.

---

## 2. CÔNG NGHỆ

| Công nghệ | Dùng để | Ghi chú |
|---|---|---|
| HTML + CSS tĩnh trong `site/` | Landing + pháp lý + hướng dẫn | **Không framework.** 4 trang tĩnh không cần build |
| Vercel — project thứ hai | Deploy `site/` với root là `/site` | Cùng repo, hai project |
| Token màu "Sổ Vựa" | Đồng bộ nhận diện với app | Chép giá trị từ `index.css`, không tự chọn màu khác |
| DNS | `thumua365.vn` → site · `app.thumua365.vn` → app | HTTPS tự động |

Không dùng: CMS, Astro/Next, thư viện animation, Google Analytics (chưa cần, và thêm là phải khai báo trong chính sách quyền riêng tư).

---

## 3. VIỆC CẦN LÀM

### 3.1 `site/index.html` — trang giới thiệu

- [ ] Trên màn đầu: nói rõ **cho ai** và **giải quyết gì**, không nói công nghệ. Dùng chính câu định vị của CP4: *"Sổ thu mua điện tử — làm theo cách thương lái đã quen, không bắt đổi thói quen."*
- [ ] Ảnh chụp màn hình thật (Tổng quan · Tạo phiếu · Biên nhận), không mockup 3D.
- [ ] **Bảng giá công khai**: Free (30 phiếu/tháng, một máy) · Premium **149.000đ/tháng**, dùng thử 30 ngày. Ghi rõ **hết hạn không khoá dữ liệu**.
- [ ] Nút "Dùng thử miễn phí" → `app.thumua365.vn`.
- [ ] Chân trang: liên kết Điều khoản · Quyền riêng tư · Hướng dẫn · Zalo hỗ trợ.
- [ ] Không ảnh stock nông dân cười; không thẻ khách hàng bịa.

### 3.2 `site/quyen-rieng-tu.html`

Nội dung tối thiểu — mỗi mục phải khớp hệ thống thật:

| Mục | Phải nêu |
|---|---|
| Thu thập gì | **Của người dùng:** tên, SĐT, email (nếu khai), tên vựa. **Của bên thứ ba do người dùng nhập:** tên, SĐT, địa chỉ nông hộ/người mua |
| Dùng làm gì | Chỉ để vận hành chức năng ghi chép và đồng bộ. **Không bán, không chia sẻ, không dùng cho quảng cáo** |
| Lưu ở đâu | Supabase (ghi rõ vùng máy chủ) + trên chính thiết bị người dùng |
| Lưu bao lâu | Đến khi người dùng xoá tài khoản; xoá vĩnh viễn trong 30 ngày kể cả trong bản sao lưu |
| Ai truy cập được | Chỉ chính người dùng — bảo đảm bằng RLS ở tầng database. Quản trị viên chỉ truy cập khi người dùng yêu cầu hỗ trợ, có ghi nhận |
| Quyền của người dùng | Xem · sửa · **xuất ra file** · **xoá toàn bộ** · rút lại đồng ý |
| Phân định trách nhiệm | **Người dùng** quyết định nhập dữ liệu nông hộ và chịu trách nhiệm về việc đó; **THUMUA365** là bên xử lý theo yêu cầu của người dùng |
| Liên hệ | Tên, SĐT/Zalo, email tiếp nhận yêu cầu về dữ liệu |

### 3.3 `site/dieu-khoan.html`

| Mục | Phải nêu |
|---|---|
| Bản chất dịch vụ | **Công cụ ghi chép, không phải chứng từ kế toán hợp pháp, không thay thế tư vấn thuế** — nối tiếp cảnh báo đã có trong màn Báo cáo |
| Trách nhiệm dữ liệu bên thứ ba | Người dùng chịu trách nhiệm khi nhập thông tin nông hộ/người mua |
| Giá & thanh toán | Công khai, kỳ hạn, **không tự động gia hạn** (chuyển khoản thủ công nên vốn không tự trừ tiền — nêu như một điểm cộng) |
| **Hoàn tiền** | 100% trong **7 ngày** kể từ lần thanh toán, không cần lý do. Sau đó không hoàn phần đã dùng |
| Khi hết hạn | **Không khoá dữ liệu.** Ngừng đồng bộ, vẫn đọc/xuất/dùng một máy |
| Giới hạn trách nhiệm | Không chịu trách nhiệm cho thiệt hại kinh doanh phát sinh từ sai sót nhập liệu của người dùng; nỗ lực hợp lý về tính sẵn sàng, không cam kết 100% |
| Chấm dứt | Người dùng xoá tài khoản bất kỳ lúc nào; bên cung cấp ngừng dịch vụ phải báo trước tối thiểu 30 ngày và **hỗ trợ xuất toàn bộ dữ liệu** |

### 3.4 `site/huong-dan.html`

- [ ] Cách cài lên màn hình chính: **Android Chrome** và **iOS Safari** riêng biệt, có ảnh từng bước. iOS khác hẳn và là chỗ người dùng bỏ cuộc nhiều nhất.
- [ ] Video 60 giây tạo phiếu đầu tiên (nhúng, không tự phát).
- [ ] Câu hỏi thường gặp: mất mạng có dùng được không · đổi điện thoại có mất dữ liệu không · quên mật khẩu thì sao.

### 3.5 Trong app

- [ ] 🔴 **Checkbox đồng ý khi đăng ký** — **không tick sẵn**: *"Tôi đồng ý với [Điều khoản] và [Chính sách quyền riêng tư]"*.
- [ ] 🔴 **Nút xoá tài khoản và toàn bộ dữ liệu** trong Tài khoản: xoá `auth.users` + cascade mọi bảng + file trong Storage. **Không được chỉ vô hiệu hoá.** Xác nhận bằng cách gõ lại tên vựa.
- [ ] Liên kết pháp lý trong Tài khoản.
- [ ] 🔴 **Bỏ tài khoản/mật khẩu demo** khỏi bản production (giữ khi `import.meta.env.DEV`).
- [ ] Số Zalo hỗ trợ + cam kết thời gian phản hồi **thật** ("trong ngày làm việc") — đừng hứa 24/7 khi chỉ có một người.
- [ ] Nhật ký khi quản trị viên truy cập dữ liệu người dùng để hỗ trợ.

---

## 4. RÀNG BUỘC RIÊNG

1. **Không hứa điều hệ thống không làm được.** Mỗi câu trong hai trang pháp lý phải đối chiếu với kiến trúc thật.
2. **Không thêm công cụ theo dõi** (Analytics, pixel quảng cáo, heatmap) ở giai đoạn này — thêm là phải khai báo và xin đồng ý.
3. **Không dùng framework cho `site/`.** Bốn trang tĩnh. Thêm build là thêm chỗ hỏng.
4. **Site và app dùng chung bảng màu** — chép giá trị từ `index.css`, không tự chọn màu khác.
5. Không sao chép điều khoản của sản phẩm khác. Viết thật thà theo hệ thống của mình.

---

## 5. YÊU CẦU ĐẦU RA

- [ ] Bốn trang tĩnh đã xuất bản, nội dung **khớp hành vi thật của hệ thống**
- [ ] Checkbox đồng ý khi đăng ký, **không tick sẵn**, không tick thì không đăng ký được
- [ ] Nút xoá tài khoản: bấm → xác nhận → **dữ liệu sạch hoàn toàn**, kiểm cả bảng lẫn Storage bằng tài khoản thử
- [ ] `git grep -n "demo@thumua365"` → chỉ còn trong nhánh `import.meta.env.DEV`
- [ ] Liên kết pháp lý mở được từ trong app và từ chân trang site
- [ ] Site đạt Lighthouse Perf ≥90 (trang tĩnh, không lý do gì thấp hơn)
- [ ] Giá trên site và trong app **giống nhau**: 149.000đ/tháng
- [ ] Hướng dẫn cài PWA thử được trên **iPhone thật** và **Android thật**

---

## 6. CẠM BẪY

| Bẫy | Hậu quả | Tránh bằng |
|---|---|---|
| Chép điều khoản của sản phẩm khác | Cam kết những thứ hệ thống không làm được | Viết theo kiến trúc thật |
| "Xoá tài khoản" chỉ đánh dấu vô hiệu hoá | Trái với chính sách vừa công bố | Xoá thật, kiểm bằng tài khoản thử |
| Quên xoá tài khoản demo | Ai cũng đăng nhập được vào bản production | `git grep` trước khi deploy |
| Bỏ trang pháp lý vì "pilot nhỏ" | Chặn đường lên Google Play sau này, và rủi ro theo NĐ 13/2023 | Làm ngay, đơn giản nhưng có |
| Hứa hỗ trợ 24/7 | Không giữ được lời, mất uy tín ngay từ khách đầu tiên | Ghi thời gian phản hồi thật |
