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

- [ ] (từ GĐ B) Gắn `has_active_sync()` vào policy ghi của các bảng nghiệp vụ — hàm viết ở B nhưng **chưa gắn**, vì gắn sớm thì giai đoạn C không ghi được gì.
- [ ] (từ GĐ E) Bảng `payments` cần policy cho **xoá mềm**: nút "Hoàn tác" của
  màn Công nợ đẩy lên một thao tác `soft-delete` trên `payments`, mà migration
  `0005_rls` cố tình không có policy DELETE. Kiểm lại xem thao tác này đi qua
  đường `update deleted_at` có được RLS cho phép không.
- [ ] (từ GĐ E) Giới hạn 30 phiếu/tháng của gói Free chưa có chỗ nào chặn —
  `FREE_RECEIPTS_PER_MONTH` trong `config.ts` mới chỉ là con số.

## Cho giai đoạn G — Site & pháp lý

*(trống)*

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
