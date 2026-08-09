# GIAI ĐOẠN H — KIỂM & MỞ

**Buổi:** 3 (+2 tuần chạy pilot) · **Phụ thuộc:** G xong · **Người làm:** cả nhóm

---

## 1. TỔNG QUAN

Không viết tính năng mới. Ba việc: **đo**, **thử với người thật**, **mở dần**.

Nguyên tắc: **mở dần, không mở toang.** 5–10 người quen trong hai tuần, sửa theo phản hồi, rồi mới mở rộng. Với sản phẩm giữ sổ sách tiền bạc của người khác, một lần mất dữ liệu ở giai đoạn đầu là mất luôn cả cộng đồng truyền miệng — mà truyền miệng chính là kênh acquisition chính trong CP4 §10.

---

## 2. CÔNG NGHỆ

| Công cụ | Dùng để | Ghi chú |
|---|---|---|
| Lighthouse (Chrome DevTools) | Perf · A11y · Best Practices · PWA | Chạy ở chế độ mobile, mạng 4G mô phỏng |
| **Playwright** | 1 luồng E2E: đăng ký → tạo phiếu → lịch sử → ghi trả nợ | Dựng ở A, chạy trong CI |
| **Sentry** (free) | Theo dõi lỗi runtime | Bật trước khi có người dùng thật |
| Thiết bị thật | iPhone (Safari) + Android tầm trung (Chrome) | **Không dùng giả lập DevTools** — iOS Safari khác nhiều |
| Supabase Dashboard | Dung lượng, truy vấn chậm, backup | Xem hằng tuần trong tháng đầu |
| Máy ảo/thiết bị cũ | Kiểm 320px và mạng 3G | Người dùng thật không dùng máy đời mới |

---

## 3. VIỆC CẦN LÀM

### 3.1 Rà bốn nhóm criteria

Đối chiếu từng ô ở [KH sản phẩm thật §12](../KE_HOACH_XAY_DUNG_SAN_PHAM_THAT.md): kỹ thuật · sản phẩm · **kinh doanh** · pháp lý. Ghi kết quả vào bảng, không đánh dấu xong từ trí nhớ.

### 3.2 Đo kỹ thuật

- [ ] Lighthouse mobile: **Perf ≥85 · A11y ≥95 · Best Practices ≥95 · PWA installable ✅**
- [ ] JS khởi tạo **≤250KB gzip**
- [ ] Không file nào trong `src/` **>300 dòng**
- [ ] Phủ test `core/` **≥80%**
- [ ] `npx depcruise src --validate` → **0 vi phạm**
- [ ] Kiểm mọi luật cấm ở [README §3.7](README.md) bằng `grep`

### 3.3 Kiểm trên thiết bị thật

- [ ] **iOS Safari**: cài lên màn hình chính, chạy trọn luồng tạo phiếu, kiểm safe-area (tai thỏ), kiểm chia sẻ/PDF.
- [ ] **Android Chrome**: như trên + kiểm chia sẻ qua Zalo.
- [ ] **320px** (máy nhỏ/cũ): thanh dưới 5 slot không vỡ chữ.
- [ ] **2560px**: không trang nào để trống quá nhiều.
- [ ] **Chế độ máy bay**: tạo phiếu → bật mạng → không mất dữ liệu.
- [ ] **Ngoài nắng thật**: bật chế độ Ngoài trời, mang ra sân giữa trưa, đọc được không.

### 3.4 🔴 Thử với người thật — tiêu chí quyết định

> **3 người 45–60 tuổi chưa từng thấy app, tự tạo được phiếu thu mua đầu tiên trong 3 phút, không ai chỉ.**

- [ ] Ngồi cạnh, **không hướng dẫn**, chỉ ghi lại chỗ họ dừng lại và lý do.
- [ ] Ghi thời gian tới phiếu đầu tiên.
- [ ] Ghi mọi câu họ hỏi — mỗi câu hỏi là một nhãn viết chưa đủ rõ.
- [ ] Nếu **cả 3 đều vướng ở cùng một chỗ** → sửa chỗ đó rồi thử lại, không mở pilot.

### 3.5 Kiểm vận hành trước khi mở

- [ ] 🔴 **Thử phục hồi backup một lần** — tạo dữ liệu, xoá, phục hồi từ backup Supabase. Backup chưa từng phục hồi thì chưa phải backup.
- [ ] Thử rollback frontend trên Vercel (một cú bấm) và ghi lại các bước.
- [ ] Thử script đặt lại mật khẩu thủ công và script kích hoạt gói thủ công.
- [ ] Bật Sentry, xác nhận nhận được lỗi thử.
- [ ] Xác nhận **preview deploy đang trỏ staging**, không phải prod.
- [ ] `git grep -i "service_role"` → không lộ giá trị thật.

### 3.6 Mở pilot

- [ ] **5–10 người quen** (bắt đầu từ 3 người đã phỏng vấn ở CP2).
- [ ] Mỗi người: cài giúp tại chỗ, tạo phiếu đầu tiên cùng họ, để lại số Zalo.
- [ ] **Hai tuần** chạy thật. Theo dõi hằng ngày tuần đầu: Sentry · dung lượng Supabase · số phiếu tạo/người.
- [ ] Thu phản hồi qua Zalo và banner khảo sát có sẵn.
- [ ] Sửa lỗi chặn ngay; ý tưởng tính năng → `NOTES.md`, **không làm trong pilot**.
- [ ] 🔴 **Thu được tiền thật từ một người không phải người quen** — tiêu chí duy nhất chứng minh mô hình chạy.

### 3.7 Chốt và chuẩn bị bước sau

- [ ] Rà [danh mục hoãn có điều kiện §14b](../KE_HOACH_XAY_DUNG_SAN_PHAM_THAT.md): hạng mục nào đã chạm ngưỡng bật lại?
  - **Máy in nhiệt**: hỏi 10 người dùng — nếu **≥4 người** nói cần in phiếu giấy → làm ở bản kế tiếp.
  - Đặt lại mật khẩu >5 lần/tuần → tính OTP-SMS.
  - >10 khách trả phí/tháng → bật đối soát tự động.
- [ ] Viết tổng kết pilot: giữ được bao nhiêu người sau 2 tuần, phiếu/người/ngày, số lỗi, số yêu cầu hỗ trợ.

---

## 4. RÀNG BUỘC RIÊNG

1. **Không thêm tính năng trong giai đoạn này.** Kể cả khi người dùng pilot xin. Ghi lại, làm ở bản sau.
2. **Không mở rộng khi chưa đủ 15 ô ở §12.1** — đây là cổng chặn 3.
3. **Không tự đánh dấu "xong" từ trí nhớ.** Mỗi ô criteria phải có bằng chứng: ảnh chụp, log, hoặc kết quả lệnh.
4. **Không sửa nóng thẳng lên production.** Kể cả trong pilot: sửa → staging → kiểm → mới lên prod.
5. Không hứa với người dùng pilot những gì chưa có.

---

## 5. YÊU CẦU ĐẦU RA

- [ ] Bảng criteria 4 nhóm: **mọi ô đã tick, có bằng chứng kèm theo**
- [ ] Lighthouse đạt ngưỡng, có ảnh chụp
- [ ] Chạy được trên iPhone thật và Android thật, đã cài lên màn hình chính
- [ ] **3/3 người 45–60 tuổi tự tạo được phiếu đầu tiên trong 3 phút**
- [ ] **Đã phục hồi backup thành công một lần**
- [ ] 5–10 người dùng pilot chạy đủ **hai tuần**, còn ít nhất **quá nửa** vẫn dùng ở tuần thứ hai
- [ ] **Đã thu được tiền thật từ một người không quen biết**
- [ ] Tổng kết pilot đã viết, danh mục hoãn đã rà lại

---

## 6. CẠM BẪY

| Bẫy | Hậu quả | Tránh bằng |
|---|---|---|
| Chỉ kiểm trên DevTools mobile | iOS Safari khác nhiều: safe-area, service worker, chia sẻ file | Thiết bị thật, bắt buộc |
| Bỏ qua bước thử với người lớn tuổi | Phát hiện app khó dùng khi đã mở rộng — lúc đó sửa đắt gấp nhiều lần | 3 người, ngồi cạnh, không chỉ |
| Backup chưa từng thử phục hồi | Ngày cần đến thì mới biết nó không dùng được | §3.5 |
| Mở toang ngay 50 người | Một lỗi mất dữ liệu là mất cả cộng đồng truyền miệng | 5–10 người trước, hai tuần |
| Sửa tính năng theo yêu cầu trong pilot | Không bao giờ kết thúc được pilot | Ghi vào `NOTES.md` |
| Coi "người quen chịu trả tiền" là kiểm chứng | Người quen trả vì nể, không phải vì sản phẩm | Tiêu chí là **người không quen** |
