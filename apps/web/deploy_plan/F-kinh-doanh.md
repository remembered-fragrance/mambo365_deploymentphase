# GIAI ĐOẠN F — KINH DOANH & THU TIỀN

**Buổi:** 4 · **Phụ thuộc:** E xong **và cổng chặn 2 đã vượt** · **Người làm:** Tài · **Cần từ nhóm:** kết quả kiểm chứng giá (Nguyên), xác nhận hạn mức (Linh)

---

## 1. TỔNG QUAN

Biến sản phẩm thành thứ **thu được tiền**. Ba việc: phân tầng Free/Premium, nhận thanh toán, và hai nguồn thu phụ mà proposal cam kết.

> ## 🚧 CỔNG CHẶN 2 — đọc trước khi mở editor
> Đưa bảng giá **149.000đ/tháng** cho **10 người dùng thật** xem, đếm số người nói "sẽ trả".
> **Dưới 3 người → dừng, xem lại mô hình. Không xây tiếp giai đoạn này.**
> Việc này không tốn code và làm được song song từ giai đoạn A. Xây xong mới biết không ai trả tiền là cách đắt nhất để học.

Mô hình bám đúng proposal CP4 §9 và §11.1 — **không tự ý đổi giá hay hạn mức**, mô hình tài chính P&L xây trên các con số này.

---

## 2. CÔNG NGHỆ

| Công nghệ | Dùng để | Ghi chú |
|---|---|---|
| Bảng `subscriptions` · `payment_intents` | Trạng thái gói và lần thanh toán | Đã tạo ở giai đoạn B |
| Hàm SQL `has_active_sync()` | Chặn tính năng trả phí **ở tầng database** | Viết ở B, **gắn vào policy ở đây** |
| **Supabase Edge Function** (Deno) | `payment-webhook` nhận biến động số dư | Nơi duy nhất dùng `service_role` |
| **VietQR** | Sinh mã QR chuyển khoản | Dựng URL ảnh QR theo chuẩn, không cần thư viện |
| **Casso** hoặc **SePay** | Đọc biến động số dư ngân hàng → gọi webhook | 50–100k/tháng. **Được phép hoãn** — 10 khách đầu kích hoạt tay |
| `xlsx` (nạp động) | Nhập file Excel cho dịch vụ setup | Đã có sẵn, thêm chiều đọc |

---

## 3. VIỆC CẦN LÀM

### 3.1 Phân tầng Free / Premium

Theo đúng CP4 §9:

| | Free | Premium |
|---|---|---|
| Ghi phiếu thu mua | **≤30 phiếu/tháng** | Không giới hạn |
| Quản lý người bán | Cơ bản | Đầy đủ (lịch sử, tổng giá trị, dư nợ) |
| Tổng quan | Cơ bản (chi hôm nay, số phiếu) | Phân tích đầy đủ (biểu đồ, theo nông sản) |
| Công nợ · Xuất Excel/PDF · Đồng bộ · Sao lưu tự động | ❌ | ✅ |
| Số thiết bị | 1 | Không giới hạn |

- [ ] **Hai cách chặn khác nhau — không nhầm lẫn:**

| Loại | Chặn ở đâu | Vì sao |
|---|---|---|
| Hạn mức 30 phiếu/tháng | **Client** | Free chạy hoàn toàn trên máy người dùng; ai vọc DevTools để ghi thêm phiếu **trên máy của chính họ** thì ta không mất gì. Không đáng bỏ công chống |
| Đồng bộ · công nợ đám mây · sao lưu | **Database** — policy dùng `has_active_sync()` | Có chạm máy chủ. Chặn bằng JavaScript ở đây là chặn giả |

- [ ] Gắn `has_active_sync()` vào policy **ghi** của các bảng nghiệp vụ. **Policy đọc luôn mở** — dữ liệu là của người dùng, không giữ làm con tin.
- [ ] Hai kỳ hạn: **149.000đ/tháng** và **1.490.000đ/năm** (giảm ~17%, tặng 2 tháng). Đẩy gói năm — nông nghiệp theo mùa vụ, chủ vựa có tiền vào mùa và quen trả một lần.
- [ ] Dùng thử **30 ngày** đầy đủ Premium khi đăng ký (`trial_end`).
- [ ] Hết hạn → `status: 'grace'` 7 ngày (vẫn đồng bộ, có banner) → `'expired'` (ngừng đồng bộ, **vẫn đọc/xuất/dùng một máy**).

### 3.2 Màn hình phần kinh doanh (`src/billing/`)

- [ ] Thẻ trạng thái gói trong Tài khoản: gói hiện tại, ngày hết hạn, lịch sử thanh toán.
- [ ] Màn so sánh Free/Premium — dùng chính bảng trên, viết bằng lời người dùng.
- [ ] 🔴 **Màn chạm hạn mức** — điểm chuyển đổi quan trọng nhất của cả sản phẩm. Phải nói bằng con số của chính họ:
  > *"Tháng này bác đã ghi 30 phiếu. Nâng cấp để ghi không giới hạn, xem công nợ và giữ dữ liệu trên đám mây."*
  Không dùng bảng tính năng khô khan.
- [ ] Màn QR thanh toán: mã QR + số tài khoản + số tiền + **nội dung chuyển khoản** dạng `TM365 <mã 6 ký tự>`, kèm ảnh minh hoạ chỗ điền nội dung trong app ngân hàng.
- [ ] Banner nhắc còn *n* ngày dùng thử; banner hết hạn (**nhắc nhở, không chặn**).

### 3.3 Luồng thanh toán

```
Bấm "Nâng cấp"
 → tạo payment_intent, sinh mã 6 ký tự
 → hiện QR VietQR (số TK · số tiền · nội dung "TM365 K7M2P9")
 → người dùng chuyển khoản
 → Casso/SePay đọc biến động → gọi Edge Function payment-webhook
 → xác thực chữ ký · tìm mã trong nội dung · khớp số tiền
   · kiểm tra bank_tx_id chưa dùng · gia hạn current_period_end
 → app nhận realtime → "Đã kích hoạt gói đến 09/09/2026"
```

- [ ] 🔴 **Idempotent theo `bank_tx_id`** — webhook có thể gọi lại nhiều lần, không được cộng tiền hai lần.
- [ ] 🔴 **Xác thực chữ ký/secret** của Casso/SePay — thiếu là ai cũng gọi được endpoint để tự gia hạn miễn phí.
- [ ] Secret **chỉ nằm trong Edge Function**, không bao giờ trong bundle.
- [ ] 🔴 **Đường thoát thủ công** — gõ sai nội dung chuyển khoản là chuyện **thường xuyên** với tệp người dùng này. Script `scripts/admin-activate.ts` dùng `service_role`, có ghi nhật ký. Đây **không phải phương án dự phòng làm sau** — làm ngay từ ngày đầu.
- [ ] Biên nhận trong app (lịch sử thanh toán + ngày hết hạn) — ghi rõ **đây là biên nhận, không phải hoá đơn đỏ**.

### 3.4 Hai nguồn thu còn lại (CP4 §11.1)

- [ ] 🔴 **Nhập dữ liệu từ Excel/CSV** — phục vụ *"Initial System Setup Service"* có thu phí. Nhập danh sách nông hộ và phiếu cũ. Bản demo chỉ nhập được file JSON do chính app xuất ra.
  - Mẫu file tải về sẵn, xem trước trước khi nhập, báo lỗi theo dòng, **không nhập một phần rồi bỏ dở**.
- [ ] 🔴 **Mã giới thiệu** — CP4 §10 xếp Referral Program là kênh acquisition chính. Mỗi người dùng một mã, ai đăng ký qua mã nào thì ghi nhận. Phần thưởng để nhóm quyết sau; **cơ chế ghi nhận phải có ngay**.
- [ ] **B2B Partnership**: CP4 đặt mốc **2028** — không xây gì. Chỉ giữ schema đa người dùng sạch, không nhét dữ liệu quảng cáo vào bảng nghiệp vụ.

---

## 4. RÀNG BUỘC RIÊNG

1. **Không đổi giá, không đổi hạn mức 30 phiếu** mà không qua Linh — P&L trong CP4 xây trên 149.000đ.
2. **Không khoá dữ liệu khi hết hạn.** Đọc, xuất file, dùng một máy phải luôn được. Đây là ràng buộc đạo đức *và* quyết định kinh doanh: giữ dữ liệu làm con tin sẽ giết sản phẩm trong một cộng đồng truyền miệng.
3. **Không tự viết cổng thanh toán.** Chưa có pháp nhân thì chỉ VietQR + đối soát.
4. **Không dùng `service_role` ở bất kỳ đâu ngoài Edge Function và script quản trị.**
5. **Không xây B2B, không xây gói doanh nghiệp, không xây trang quản trị.** Chưa tới lượt.
6. Không tự động gia hạn — chuyển khoản thủ công nên vốn không tự trừ tiền. Đây là **điểm cộng**, nói rõ trong Điều khoản.

---

## 5. YÊU CẦU ĐẦU RA

**Luồng tiền:**
- [ ] Người lạ tự đi hết: **thấy giá → bấm nâng cấp → quét QR → chuyển khoản → gói kích hoạt tự động**, không ai can thiệp
- [ ] Gọi webhook **3 lần** cùng một giao dịch → chỉ gia hạn **một** lần
- [ ] Gọi webhook **không có chữ ký hợp lệ** → bị từ chối
- [ ] Chuyển khoản sai nội dung → đường thoát thủ công **đã thử thành công một lần**
- [ ] Hoàn tiền trong 7 ngày → **đã thử một lần**

**Phân tầng:**
- [ ] Bản Free chặn đúng ở **phiếu thứ 31** trong tháng, kèm màn nâng cấp giải thích rõ
- [ ] Người dùng Free gọi thẳng REST API để ghi vào bảng nghiệp vụ → **database từ chối**
- [ ] Ghi khống `plan='sync'` từ client bằng anon key → **database từ chối**
- [ ] Hết hạn gói → ngừng đồng bộ nhưng **vẫn đọc, vẫn xuất file, vẫn dùng một máy**
- [ ] Giá hiển thị trong app và trên trang giá đều là **149.000đ/tháng**

**Hai nguồn thu phụ:**
- [ ] Nhập được file Excel danh sách nông hộ + phiếu cũ; file sai định dạng báo lỗi theo dòng, không nhập nửa vời
- [ ] A mời B bằng mã, B đăng ký → hệ thống ghi nhận đúng

---

## 6. CẠM BẪY

| Bẫy | Hậu quả | Tránh bằng |
|---|---|---|
| Bỏ qua cổng chặn 2 | Xây 4 buổi rồi phát hiện không ai trả tiền | Hỏi 10 người trước |
| Webhook không idempotent | Một lần chuyển khoản gia hạn 3 tháng | Khoá theo `bank_tx_id` |
| Webhook không xác thực chữ ký | Ai cũng tự gia hạn miễn phí | Verify secret |
| Chặn tính năng trả phí bằng JavaScript | Mở DevTools là qua | `has_active_sync()` trong policy |
| Quên đường thoát thủ công | Khách đã trả tiền mà không dùng được → mất khách và mất uy tín | Làm ngay ngày đầu |
| Chặn cả đọc khi hết hạn | Mất khách vĩnh viễn, tiếng xấu lan nhanh | Policy đọc luôn mở |
| Hạn mức Free đặt quá thấp | Người dùng bỏ đi trước khi kịp thấy giá trị | Giữ 30 phiếu/tháng |
| Để `service_role` lọt vào bundle | Toàn bộ dữ liệu mọi người dùng bị lộ | Chỉ trong Edge Function; kiểm `git grep` |
