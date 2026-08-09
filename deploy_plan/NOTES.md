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

- [ ] 🔴 (từ GĐ D) **Màn đăng nhập / đăng ký.** Tầng dữ liệu đã có `signIn` · `signUp` · `signOut` trong `useStore`, chỉ thiếu màn hình. Chưa có màn thì app dùng "tài khoản của máy này" (`data/deviceAccount.ts`) — sổ vẫn ghi và vẫn còn sau khi tắt app, nhưng không đồng bộ đi đâu. Làm màn đăng nhập xong phải có đường **nhập sổ của máy vào tài khoản** để người dùng thử trước không mất dữ liệu.
- [ ] 🔴 (từ GĐ D) Hai ô trên thanh dưới đang để **mờ**: `Công nợ` và `Thêm`. Vị trí đã giữ chỗ (`bar: 3` và `bar: 4` trong `features/shared/navItems.ts`), chỉ việc bỏ `disabled` khi màn hình có thật.
- [ ] (từ GĐ D) Nối `onExportBackup` thật vào `<ErrorBoundary>` — cần `useStore` ở ngoài `<StoreProvider>` nên phải làm bằng một hàm đăng ký, không phải hook.
- [ ] (từ GĐ D) Vẽ `status.pendingCount` và `syncState: 'conflict'` lên danh sách phiếu. Thao tác kẹt sau 5 lần thử vẫn nằm trong hàng đợi và **phải hiện cho người dùng**; hiện mới chỉ có `<SyncBadge>` ở header.
- [ ] (từ GĐ D) `AttachmentPicker` — `data/attachments.ts` và `useAttachmentUrl` đã xong ở giai đoạn C nhưng **chưa có màn nào gọi**. Phiếu chưa đính ảnh được.
- [ ] (từ GĐ D) Hẹn ngày trả (`creditTerms`) chưa có ô nhập; kiểu và mapper đã có sẵn.
- [ ] (từ GĐ D) `MasterDetail` đã dựng nhưng danh sách Phiếu còn điều hướng sang trang riêng ở mọi bề rộng. Bật pane chi tiết ở ≥1440px khi làm màn Công nợ (cùng một khuôn).
- [ ] (từ GĐ A) Dựng lại `seed.ts` cho **chế độ trình diễn**: nút "Dùng thử với dữ liệu mẫu" + banner "Đang xem dữ liệu mẫu — [Xoá hết và bắt đầu thật]". Giai đoạn A đã bỏ hẳn seed tự động (L1); không được nhét lại vào đường đọc dữ liệu.
- [ ] (từ GĐ D) Bộ ký hiệu bốn nông sản của Tuyến — `CropIcon` trong `components/ui/icons.tsx` đang là hình tạm nét đơn, cùng lưới 24px nên thay được mà không đổi bố cục.

## Cho giai đoạn F — Kinh doanh

- [ ] (từ GĐ B) Gắn `has_active_sync()` vào policy ghi của các bảng nghiệp vụ — hàm viết ở B nhưng **chưa gắn**, vì gắn sớm thì giai đoạn C không ghi được gì.

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
