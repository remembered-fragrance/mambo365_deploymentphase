# GIAI ĐOẠN C — TẦNG DỮ LIỆU

**Buổi:** 4 · **Phụ thuộc:** A và B xong · **Người làm:** Tài · **Cần từ người khác:** không

---

## 1. TỔNG QUAN

Nối `core/` với Supabase, giữ nguyên trải nghiệm offline-first. Đây là **giai đoạn rủi ro nhất của cả dự án**: mọi thao tác đọc/ghi đều đi qua code viết ở đây, và lỗi ở tầng này biểu hiện thành "mất phiếu", "sai tiền", "phiếu trùng" — những thứ người dùng phát hiện trước mình.

Nguyên tắc chi phối:

> **Ghi cục bộ trước, đẩy lên sau. Hàng đợi phải sống sót qua việc tắt app. Không thao tác nào được thực hiện hai lần.**

Chữ ký của 22 action trong `StoreValue` **không đổi** so với bản demo. Nhờ vậy giai đoạn D–E chỉ việc dùng, không phải biết dữ liệu đến từ đâu.

---

## 2. CÔNG NGHỆ

| Công nghệ | Dùng để | Ghi chú |
|---|---|---|
| `@supabase/supabase-js` | Postgres · Auth · Storage · Realtime | Một instance duy nhất trong `data/client.ts` |
| `idb` ^8.0 | IndexedDB: cache + **hàng đợi** + blob ảnh | Đã có sẵn từ bản demo |
| `crypto.randomUUID()` | Id thao tác và id bản ghi | Chống trùng |
| `navigator.onLine` + sự kiện `online`/`offline` | Kích hoạt xả hàng đợi | Không tin tuyệt đối — vẫn phải bắt lỗi mạng |
| Supabase Realtime *(tuỳ chọn)* | Nhận thay đổi từ thiết bị khác | Chỉ bật nếu còn thời gian; không bắt buộc cho v1.0 |
| vitest | Test hàng đợi và mapper | Có thể test không cần trình duyệt |

---

## 3. VIỆC CẦN LÀM

### 3.1 Cấu trúc `src/data/`

```
data/
├── client.ts            Khởi tạo Supabase, đọc env
├── database.types.ts    Sinh tự động, KHÔNG sửa tay
├── mappers.ts           camelCase ↔ snake_case, một chỗ duy nhất
├── cache.ts             Đọc/ghi IndexedDB (bản sao cục bộ của AppData)
├── queue.ts             Hàng đợi thao tác chờ đẩy lên
├── sync.ts              Vòng đồng bộ: xả hàng đợi, kéo về, xử lý lỗi
├── auth.ts              Đăng ký/đăng nhập qua resolve_identifier
├── attachments.ts       IndexedDB ⇄ Supabase Storage
├── store.tsx            StoreProvider — giữ nguyên chữ ký action
├── useStore.ts          Context + kiểu StoreValue
└── hooks/
    ├── useTransactionList.ts   Lọc + phân trang
    └── useAttachmentUrl.ts     Một hook che hai nguồn ảnh
```

### 3.2 Mapper — chỗ duy nhất hai thế giới gặp nhau

- [ ] Mỗi thực thể có `toRow()` và `fromRow()`. Không có `as any`, không trải `...row`.
- [ ] `transactions.fromRow` gom `payments[]` từ bảng con và **tính lại `amountPaid = sum(payments)`** — không đọc từ cột.
- [ ] Ngày giờ: database `timestamptz`, ứng dụng chuỗi ISO. Chuyển đổi tại mapper, không rải `new Date()` khắp nơi.
- [ ] Test mapper: `fromRow(toRow(x))` bằng `x` cho cả 11 thực thể.

### 3.3 Hàng đợi offline — phần khó nhất

- [ ] Mỗi thao tác ghi sinh một bản ghi hàng đợi:
```ts
interface QueuedOp {
  readonly id: string;          // UUID — khoá chống trùng
  readonly kind: 'insert' | 'update' | 'softDelete';
  readonly table: string;
  readonly payload: unknown;
  readonly createdAt: string;
  readonly tries: number;
  readonly lastError?: string;
}
```
- [ ] **Ghi vào IndexedDB, không giữ trong bộ nhớ.** Đóng app khi đang offline không được mất thao tác.
- [ ] Xả hàng đợi theo **thứ tự tạo**, tuần tự, không song song — tránh việc con chạy trước việc cha (payment trước transaction).
- [ ] Thất bại: thử lại có giãn cách (1s · 5s · 30s · 5 phút), tối đa 5 lần rồi đánh dấu `conflict` và **báo cho người dùng**, không im lặng.
- [ ] Server bỏ qua nếu `id` đã tồn tại (`on conflict (id) do nothing` cho insert). Bấm hai lần vì mạng chậm **không được** thành hai phiếu.

### 3.4 Xung đột

| Loại dữ liệu | Quy tắc |
|---|---|
| Trường vô hướng (ghi chú, tên đối tác, `date`) | Ghi sau thắng theo `updated_at` |
| **Tiền (`payments`)** | **Không bao giờ ghi đè.** Mỗi lần trả là một INSERT độc lập — hai máy cùng ghi thì cả hai đều còn |
| `lines` / `adjustments` | Đóng băng theo phiếu, không sửa sau khi hoàn thành ⇒ không phát sinh xung đột |
| Xoá | Xoá mềm thắng: đã có `deleted_at` thì bản cập nhật đến sau không hồi sinh bản ghi |

### 3.5 Trạng thái hiển thị cho người dùng

- [ ] Điền giá trị thật vào `status` đã dựng ở giai đoạn A: `loading` · `error` · `lastSyncedAt` · `pendingCount`.
- [ ] Gán `syncState: 'pending'` cho bản ghi chưa đẩy được; `'synced'` khi xong; `'conflict'` khi hết lần thử.
- [ ] Không chặn giao diện khi đang đồng bộ. Người dùng vẫn tạo phiếu bình thường.

### 3.6 Đọc dữ liệu

- [ ] `useTransactionList(filters)` trả `{ rows, total, loadMore, isLoadingMore }`. Giai đoạn này lọc phía client trên cache; chữ ký thiết kế sẵn để sau chuyển sang `.range()` phía server **mà không đổi giao diện**.
- [ ] Mở app: đọc cache hiện ngay, đồng thời kéo dữ liệu mới nền. **Không để màn trắng chờ mạng.**
- [ ] Kéo về theo `updated_at > lastSyncedAt` chứ không tải lại toàn bộ.

### 3.7 Ảnh chứng từ

- [ ] `useAttachmentUrl(id)` trả `{ url, status }`. Thứ tự: IndexedDB trước → không có thì lấy signed URL từ Storage → cache lại.
- [ ] Hook **tự thu hồi** `URL.createObjectURL` khi unmount. Bản demo có hai chỗ xử lý khác nhau và một chỗ rò rỉ — không lặp lại.
- [ ] Nén ảnh giữ nguyên `compressImage.ts`, chỉ đổi đích lưu.

### 3.8 Xác thực

- [ ] `signIn(identifier, password)`: gọi RPC `resolve_identifier` → `signInWithPassword`. **Lỗi luôn cùng một thông báo** dù sai tài khoản hay sai mật khẩu.
- [ ] `signUp`: bắt buộc tên + SĐT + mật khẩu; email tuỳ chọn. Chuẩn hoá SĐT trước khi gửi.
- [ ] Đổi tài khoản → **xoá sạch cache của tài khoản cũ**. Cache theo `userId`, không dùng chung.

### 3.9 Nhập dữ liệu cũ

- [ ] `importData(payload)` — bọc luồng nhập backup JSON. Bản demo gọi thẳng `localStorage.setItem` từ trang hồ sơ; ở bản mới **giao diện không được đụng vào lưu trữ**.

---

## 4. RÀNG BUỘC RIÊNG

1. **Không đổi chữ ký của 22 action trong `StoreValue`.** So sánh với bản demo trước khi kết thúc giai đoạn.
2. **Không chuyển action sang `async`.** Ghi cục bộ đồng bộ, trả kết quả ngay, đẩy lên nền. Đổi sang Promise là buộc giai đoạn D phải sửa lại toàn bộ chỗ gọi.
3. **Không import `supabase` ở ngoài `src/data/`.** Kiểm bằng lint.
4. **Không tự viết lại logic nghiệp vụ ở tầng này.** Cần tính toán → gọi hàm trong `core/`. Nếu thấy mình đang viết công thức trong `data/`, dừng lại.
5. **Không tối ưu sớm.** Chưa dùng Realtime, chưa dùng phân trang phía server, chưa dùng virtualization. Đúng chữ ký hook là đủ để sau này đổi.
6. Không im lặng nuốt lỗi. Mọi `catch` phải hoặc thử lại, hoặc đẩy vào `status.error`.

---

## 5. YÊU CẦU ĐẦU RA

**Kịch bản bắt buộc phải qua** (làm tay, ghi lại kết quả):

- [ ] **Offline cơ bản** — tắt mạng, tạo 3 phiếu, bật mạng → lên đủ 3, **không trùng, không mất**
- [ ] **Tắt app giữa chừng** — tắt mạng, tạo 2 phiếu, **đóng hẳn app**, mở lại, bật mạng → cả 2 vẫn lên
- [ ] **Chống trùng** — bấm "Hoàn thành" hai lần liên tiếp khi mạng chậm → **chỉ một phiếu**
- [ ] **Hai máy trả nợ** — máy A offline ghi trả 3tr, máy B online ghi trả 5tr, A online lại → **cả hai khoản đều còn**, tổng đúng 8tr
- [ ] **Xoá không hồi sinh** — máy A xoá phiếu, máy B offline sửa đúng phiếu đó rồi online → phiếu **vẫn xoá**
- [ ] **Đa thiết bị** — tạo phiếu trên điện thoại → thấy trên máy tính trong vòng 5 giây
- [ ] **Đổi tài khoản** — đăng xuất, đăng nhập tài khoản khác → **không thấy dữ liệu của tài khoản trước**

**Kiểm bằng lệnh:**

- [ ] `git diff --stat <commit-A> -- src/data/useStore.ts` → chữ ký 22 action không đổi
- [ ] `grep -rn "supabase" src/core src/features src/components` → **rỗng**
- [ ] `grep -rn "localStorage" src/features src/components` → **rỗng**
- [ ] `npm run test` — thêm test mapper round-trip và test hàng đợi, vẫn xanh
- [ ] Bật cờ giả lập `status.loading = true` → **không màn nào crash**

---

## 6. CẠM BẪY

| Bẫy | Hậu quả | Tránh bằng |
|---|---|---|
| Hàng đợi giữ trong bộ nhớ React | Đóng app là mất thao tác — đúng lúc người dùng cần nhất | §3.3, IndexedDB |
| Xả hàng đợi song song | Payment lên trước transaction → khoá ngoại lỗi, dữ liệu rơi | Tuần tự theo `createdAt` |
| Nuốt lỗi mạng bằng `catch {}` | Người dùng tưởng đã lưu, thực tế mất | Mọi catch → thử lại hoặc `status.error` |
| Ghi đè cả hàng khi đồng bộ | Mất khoản trả nợ từ máy khác | §3.4 — payments không bao giờ ghi đè |
| Kéo toàn bộ dữ liệu mỗi lần mở app | Chậm dần theo thời gian, tốn băng thông | Kéo theo `updated_at` |
| Cache dùng chung giữa các tài khoản | Người dùng thấy dữ liệu của người khác trên cùng máy | Cache theo `userId`, xoá khi đăng xuất |
| Đổi action sang `async` "cho đúng chuẩn" | Giai đoạn D phải sửa lại mọi chỗ gọi | Ràng buộc §4.2 |
