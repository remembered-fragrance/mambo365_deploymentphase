# Vận hành backend — THUMUA365

Schema nằm trong `migrations/`, đánh số tăng dần, **commit vào git**.

> 🔴 **Cấm sửa schema bằng table editor trên dashboard.** Không có lịch sử, không
> tái lập được lên staging, không rollback được. Dashboard chỉ để *xem*.
> Mỗi migration có ghi đường lùi ở comment đầu file.

## 1. Hai môi trường — bắt buộc

| Project | Gói | Dùng cho |
|---|---|---|
| `thumua365-staging` | free | Preview deploy của Vercel, thử migration |
| `thumua365-prod` | trả phí (~25 USD/tháng) | Người dùng thật |

Free tier **tạm dừng project khi không hoạt động** và **không có backup hằng
ngày** — không dùng được cho sản phẩm thật. Preview deploy **không bao giờ**
được trỏ vào prod.

Vercel: biến môi trường **Preview** → staging, **Production** → prod.
Frontend chỉ nhận `anon key`. `service_role key` chỉ nằm trong Edge Function và
script quản trị chạy trên máy.

## 2. Đưa schema lên

```bash
supabase link --project-ref <ref-staging>
supabase db push
```

Thử trên staging trước. Chỉ khi staging chạy đúng mới link sang prod và push.

Sau mỗi lần push, so hai môi trường:

```bash
supabase db diff --linked
```

## 3. Cấu hình Auth (dashboard → Authentication → Providers/Settings)

Những mục này **không** nằm trong migration, phải đặt tay ở cả hai project.
Giá trị đối chiếu ghi trong `config.toml`.

- [ ] **Tắt** "Confirm email". Người chỉ có SĐT dùng email nội bộ
      `+84…@id.thumua365.vn` — tên miền ta sở hữu và không gửi thư tới.
- [ ] Mật khẩu tối thiểu **6 ký tự**, **không** bắt chữ hoa / ký tự đặc biệt.
- [ ] Bật refresh token rotation, JWT 1 giờ — phiên dài để người dùng gần như
      không phải gõ lại mật khẩu.
- [ ] Bật rate limit đăng nhập.
- [ ] **Tắt** phone/SMS provider (OTP-SMS tạm hoãn, quyết định 09/08/2026).

## 4. Sinh kiểu TypeScript

```bash
SUPABASE_PROJECT_ID=<ref-staging> npm run db:types
```

Ra `src/data/database.types.ts`. **Không sửa tay file này.**
Kiểu sinh từ database **không được rò rỉ ra ngoài `src/data/`** — `core/`,
`features/`, `components/` chỉ biết kiểu trong `core/types.ts`. Mapper là chỗ
duy nhất hai thế giới gặp nhau.

## 5. Nghiệm thu — chạy trước khi coi giai đoạn B là xong

| # | Kiểm | Cách |
|---|---|---|
| 1 | Không bảng nào thiếu RLS | Chạy `checks/rls-coverage.sql`, truy vấn đầu trả về **0 dòng** |
| 2 | Không bảng nào thiếu xoá mềm | Cùng file, truy vấn thứ hai trả về **0 dòng** |
| 3 | Định danh linh hoạt | Cùng file, truy vấn thứ ba: ba cách gõ ra **cùng một email**, `khong-ton-tai` ra **NULL** |
| 4 | Cô lập dữ liệu giữa hai tài khoản | Đăng nhập tài khoản A, gọi thẳng REST API đọc `transactions` của B → **rỗng**, không phải lỗi 500 |
| 5 | Cô lập ảnh chứng từ | A không tải được file trong thư mục của B |
| 6 | Migration tái lập được | Chạy toàn bộ migration lên một project trống → schema giống hệt |
| 7 | Kiểu sinh ra compile sạch | `npm run db:types && npm run typecheck` |
| 8 | Staging và prod giống nhau | `supabase db diff` không ra khác biệt |
| 9 | Không lộ khoá | `git grep -i "service_role"` chỉ ra file cấu hình/script, không ra giá trị thật |

### Test chéo hai tài khoản (mục 4)

```bash
# Lấy access_token của tài khoản A rồi đọc dữ liệu của B
curl "https://<ref>.supabase.co/rest/v1/transactions?user_id=eq.<id-cua-B>" \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <access-token-cua-A>"
# Phải trả về []  — KHÔNG phải 500, KHÔNG phải dữ liệu của B
```

## 6. Kịch bản đồng bộ — chạy tay trên thiết bị thật

Logic của cả bảy kịch bản đều đã có test tự động (`tests/data/queue.test.ts`,
`tests/data/mergeChanges.test.ts`), nhưng test không thay được một lần chạy thật
trên điện thoại có sóng chập chờn. Ghi lại kết quả từng dòng.

| # | Kịch bản | Phải ra |
|---|---|---|
| 1 | Tắt mạng, tạo 3 phiếu, bật mạng | Lên đủ 3, không trùng, không mất |
| 2 | Tắt mạng, tạo 2 phiếu, **đóng hẳn app**, mở lại, bật mạng | Cả 2 vẫn lên |
| 3 | Bấm "Hoàn thành" hai lần liên tiếp khi mạng chậm | **Chỉ một** phiếu |
| 4 | Máy A offline ghi trả 3tr · máy B online ghi trả 5tr · A online lại | Cả hai khoản còn, tổng đúng 8tr |
| 5 | Máy A xoá phiếu · máy B offline sửa đúng phiếu đó rồi online | Phiếu **vẫn xoá** |
| 6 | Tạo phiếu trên điện thoại | Thấy trên máy tính trong vòng 5 giây |
| 7 | Đăng xuất, đăng nhập tài khoản khác | **Không** thấy dữ liệu tài khoản trước |

## 7. Thu tiền (giai đoạn F)

### 7.1 Trước khi mở bán — điền số thật

- [ ] `src/config.ts`: `BANK_BIN` · `BANK_ACCOUNT_NUMBER` · `BANK_ACCOUNT_NAME` ·
      `BANK_NAME` đang là **chỗ điền**. Thay bằng tài khoản thật rồi tự quét thử
      mã QR bằng chính app ngân hàng — không tin vào việc URL trông đúng.
- [ ] `SUPPORT_ZALO` phải là số có người trực. Màn thanh toán chỉ nó ba lần.

### 7.2 Triển khai Edge Function

```bash
supabase secrets set PAYMENT_WEBHOOK_SECRET=<chuỗi ngẫu nhiên dài>
supabase functions deploy payment-webhook
```

Rồi khai URL đó ở Casso/SePay, kèm đúng bí mật vừa đặt.

> ⚠️ Hàm này nạp `../../../src/core/transferCode.ts` và `../../../src/config.ts`
> — cùng một bản với app, để mã sinh ra và mã đọc lại không bao giờ lệch. Cả
> hai file đó **không import gì**, nên Deno chạy được. Lần deploy đầu tiên phải
> xem log xác nhận nó bundle được; nếu không, chép hai file sang
> `supabase/functions/_shared/` **và ghi ngay một dòng vào NOTES.md** rằng từ
> đó có hai bản phải sửa cùng lúc.

### 7.3 Nghiệm thu luồng tiền — làm đủ, đây là phần đụng vào tiền

| # | Kiểm | Phải ra |
|---|---|---|
| 1 | Người lạ tự đi hết: thấy giá → nâng cấp → quét QR → chuyển khoản | Gói tự mở, không ai can thiệp |
| 2 | Gọi webhook **3 lần** cùng một `bank_tx_id` | Chỉ gia hạn **một** lần |
| 3 | Gọi webhook **không có chữ ký** hoặc sai | HTTP **401**, không đổi gì |
| 4 | Chuyển **thiếu tiền** so với ý định thanh toán | Không mở gói, giao dịch nằm ở `skipped` |
| 5 | Chuyển khoản **sai nội dung** rồi chạy `admin-activate.ts` | Mở được gói, và chạy lần hai báo "đã xử lý rồi" |
| 6 | Hoàn tiền trong 7 ngày | Đã thử **một lần** thật |
| 7 | Người dùng Free gọi thẳng REST API ghi vào `transactions` | Database **từ chối** (42501) |
| 8 | Client ghi khống `status='active'` vào `subscriptions` bằng anon key | Database **từ chối** |
| 9 | Hết hạn gói | Ngừng đẩy lên, nhưng **vẫn đọc, vẫn xuất file, vẫn dùng một máy** |
| 10 | `checks/rls-coverage.sql` — hai truy vấn mới cuối file | Cả hai trả về **0 dòng** |

Kiểm mục 2 và 3 bằng curl:

```bash
# Sai chữ ký → 401
curl -X POST "https://<ref>.functions.supabase.co/payment-webhook" \
  -H "content-type: application/json" \
  -d '{"id":"TEST1","amount":149000,"description":"TM365 K7M2P9"}'

# Đúng chữ ký, gọi ba lần → chỉ một lần gia hạn
for i in 1 2 3; do
  curl -X POST "https://<ref>.functions.supabase.co/payment-webhook" \
    -H "content-type: application/json" -H "secure-token: <bí-mật>" \
    -d '{"id":"TEST1","amount":149000,"description":"TM365 K7M2P9"}'
done
```

### 7.4 Kích hoạt gói bằng tay

Dùng khi tiền đã vào mà nội dung chuyển khoản gõ sai. Đọc quy tắc xác minh
trong `../scripts/admin-activate.ts` trước khi chạy.

```bash
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  npx tsx scripts/admin-activate.ts 0905112233 149000 <mã-giao-dịch-ngân-hàng>
```

Mã giao dịch ngân hàng là **bắt buộc**: nó vào `bank_transactions` làm khoá
chống trùng, nên webhook về sau cũng không cộng thêm một kỳ nữa.

## 8. Đặt lại mật khẩu thủ công

Chỉ dành cho người dùng **không khai email**. Đọc quy tắc xác minh danh tính
ghi ngay trong `../scripts/admin-reset-password.ts` trước khi chạy — làm đủ,
không rút gọn.

```bash
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  npx tsx scripts/admin-reset-password.ts 0905112233 <mật-khẩu-mới>
```

**Đây là trần khả năng mở rộng, phải theo dõi bằng số.** Khi vượt ~200 người
dùng hoạt động, hoặc khi số yêu cầu đặt lại vượt 5 lần/tuần → bật OTP-SMS. Đó
là ngưỡng chuyển giai đoạn, không phải "làm khi rảnh".
