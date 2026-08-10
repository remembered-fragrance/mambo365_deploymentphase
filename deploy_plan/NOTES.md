# NOTES — sổ ghi việc phát sinh

Chỗ duy nhất để ghi những thứ **thấy đáng làm nhưng chưa tới lượt**. Mục đích: không làm việc của giai đoạn sau, nhưng cũng không quên.

## Cách dùng

- Đang làm giai đoạn X, thấy việc thuộc giai đoạn Y > X → **ghi vào đây, không code**.
- Đầu mỗi giai đoạn, đọc lại mục của giai đoạn đó.
- Việc không thuộc giai đoạn nào → mục "Sau v1.0". Nếu nó có ngưỡng bật lại thì chuyển sang [danh mục hoãn có điều kiện §14b](../KE_HOACH_XAY_DUNG_SAN_PHAM_THAT.md).
- Xoá dòng khi đã làm xong.

Mẫu: `- [ ] (từ GĐ A) Mô tả việc — lý do — file liên quan`

---

## Cho giai đoạn B — Backend

*(trống — mọi việc trong repo đã xong; phần cần tài khoản Supabase ghi ở `supabase/VAN_HANH.md`)*

**Đã quyết ở GĐ B:** giữ `Transaction.supplierId` bắt buộc trong `core/types.ts`
và thêm cột `transactions.supplier_id text` (nullable). Mapper ghi thẳng giá trị,
không bịa. `counterparty_id uuid` mới là nguồn sự thật về đối tác.

## Cho giai đoạn C — Tầng dữ liệu

*(đã xong — mọi mục đều đã làm)*

Còn treo vì cần tài khoản Supabase và hai thiết bị thật, ghi ở
`supabase/VAN_HANH.md` và mục "Kịch bản đồng bộ" của nó: bảy kịch bản nghiệm thu
§5 (offline, tắt app giữa chừng, chống trùng, hai máy trả nợ, xoá không hồi
sinh, đa thiết bị, đổi tài khoản). Logic của cả bảy đều đã có test tự động ở
`tests/data/`, nhưng test không thay được một lần chạy thật.

## Cho giai đoạn D — App lõi

*(đã xong)*

## Cho giai đoạn E — Phần còn lại

*(đã xong — mọi mục đều đã làm)*

Còn treo vì cần thứ ngoài repo:

- [ ] Bộ ký hiệu bốn nông sản của Tuyến — `CropIcon` trong `components/ui/icons.tsx`
  vẫn là hình tạm nét đơn, cùng lưới 24px nên thay được mà không đổi bố cục.
  Các biểu tượng thêm ở giai đoạn E (hộp, nhãn, phần trăm, biểu đồ, người…) cũng
  cùng bộ tạm đó.
- [ ] Đăng nhập · đăng ký · đổi mật khẩu · sửa hồ sơ · "đưa sổ của máy vào tài
  khoản": đã viết đủ nhưng **chưa chạy lần nào**, cần tài khoản Supabase thật.

## Cho giai đoạn F — Kinh doanh

*(đã xong — cả ba mục đều đã làm ở `0008_quyen_dong_bo.sql` và `src/core/receiptQuota.ts`)*

Còn treo vì cần tài khoản Supabase và tiền thật:

- [ ] Mười mục nghiệm thu luồng tiền ở `supabase/VAN_HANH.md` §7.3 — trong đó
  hai mục **chỉ chứng minh được bằng tiền thật**: một lần chuyển khoản đi hết
  luồng, và một lần hoàn tiền trong 7 ngày.
- [ ] Điền số tài khoản thật vào `config.ts` (§7.1) — đang là chỗ điền.
- [ ] Deploy `payment-webhook` và xác nhận Deno bundle được hai file nạp từ
  `src/` (§7.2). Không bundle được thì phải chép sang `_shared/` và ghi lại đây.

## Cho giai đoạn G — Site & pháp lý

- [ ] (từ GĐ F) Trang giá trên site tĩnh phải ghi **149.000đ/tháng** và
  **1.490.000đ/năm**, khớp `config.ts`. Tiêu chí F §5 đòi hai nơi nói cùng một số.
- [ ] (từ GĐ F) Điều khoản phải nói rõ ba điều đã hứa trong app: **không tự động
  gia hạn**, **hoàn tiền trong 7 ngày**, và **hết hạn thì ngừng đồng bộ chứ
  không khoá dữ liệu**.
- [ ] (từ GĐ F) Biên nhận trong app ghi "không phải hoá đơn đỏ" — trang pháp lý
  phải nói cùng một điều, kèm ghi chú chưa có pháp nhân.

## Cho giai đoạn H — Kiểm & mở

*(trống)*

---

## Sau v1.0

- [ ] Tách bảng `attachments` (hiện dùng mảng `attachment_ids`) — ngưỡng ở §14b
- [ ] Realtime đồng bộ đa thiết bị tức thời (hiện kéo theo `updated_at`)
- [ ] Virtualization danh sách khi >200 dòng
- [ ] Phân trang phía server cho `useTransactionList` (chữ ký hook đã thiết kế sẵn)

---

## Nợ kỹ thuật đã biết

| Việc | Vì sao chấp nhận | Trả khi nào |
|---|---|---|
| `attachment_ids` là mảng thay vì bảng riêng | Đủ dùng ở quy mô nhỏ; tách bảng tốn công mà chưa có lợi ích | Khi một người dùng vượt ~2.000 phiếu có ảnh, hoặc thấy xung đột khi thêm ảnh từ 2 máy |
| `useTransactionList` lọc phía client | Dữ liệu pilot còn nhỏ | Khi một tài khoản vượt ~2.000 phiếu |
| Chưa có Realtime | Kéo theo `updated_at` đủ cho pilot | Khi người dùng phàn nàn về độ trễ đa thiết bị |
| `roundToThousand(-1500) = -1000` — số âm làm tròn về phía số lớn hơn | Hành vi có từ bản demo, nay đã có test khoá lại. Chỉ ảnh hưởng khoản **trừ bớt** lẻ dưới 1.000đ | Khi nhóm kinh doanh chốt quy ước làm tròn cho khoản trừ — quyết định nghiệp vụ, không phải lỗi kỹ thuật |
| `supplierId` vẫn nằm trong `Transaction` dù đã dùng `counterpartyId` | Cần để đọc dữ liệu v1/v2 | Khi không còn tài khoản nào mang dữ liệu trước v3 |
| Hướng dẫn bốn bước là bảng trượt, không phải mũi tên chỉ vào từng ô | Mũi tên phải bám vị trí thật của phần tử, mà bố cục đổi theo bề rộng và theo chế độ Ngoài nắng — sai một lần là hướng dẫn thành thứ gây rối | Khi có người thật thử mà không tự tạo được phiếu đầu tiên trong 3 phút |
| Ảnh minh hoạ trong sheet "?" là biểu tượng phóng to, chưa phải ảnh chụp màn hình | Ảnh thật phải chụp lại mỗi lần đổi giao diện, mà giao diện còn đổi tới lúc phát hành | Sau khi khoá giao diện ở giai đoạn H |
| Số ngày ân hạn viết ở hai nơi: `GRACE_DAYS` trong `config.ts` và `sync_grace_days()` trong migration 0008 | Không có cách nào để một hằng số nằm chung giữa Postgres và trình duyệt. Đã ghi chú chéo ở cả hai file | Khi có lần thứ ba cần cùng con số — lúc đó mới đáng dựng một chỗ sinh mã dùng chung |
| Bậc gói nhớ trong máy (`thumua365:plan:*`) nên người vừa hết hạn còn giữ hạn mức không giới hạn tới lần hỏi máy chủ kế tiếp | Chiều ngược lại tệ hơn nhiều: một lần mất sóng làm người đã trả tiền bị chặn ở phiếu thứ 31 giữa buổi cân. Phần thật sự đáng tiền là đồng bộ, và cái đó máy chủ chặn chứ không phải client | Khi có người dùng thật lợi dụng bằng cách tắt mạng cả tháng |
| Màn chờ chuyển khoản hỏi lại máy chủ 5 giây/lần thay vì dùng Realtime | Chỉ một màn cần, mà bật Realtime là nuôi thêm một đường kết nối cho cả app | Cùng ngưỡng với mục "Chưa có Realtime" ở trên |
