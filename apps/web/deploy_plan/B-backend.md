# GIAI ĐOẠN B — BACKEND

**Buổi:** 3 · **Phụ thuộc:** A xong (cổng chặn 1) · **Người làm:** Tài · **Cần từ người khác:** không

---

## 1. TỔNG QUAN

Dựng toàn bộ phía máy chủ **một lần cho đúng**. Lý do phải làm kỹ ở đây: schema sai thì giai đoạn C phải viết lại, và khi đã có dữ liệu thật thì migration trở nên đắt và rủi ro.

Ba thứ giai đoạn này quyết định và không nên đổi về sau:

1. **`payments` là bảng riêng, chỉ ghi thêm.** Nếu để dạng JSONB trong `transactions` thì hai thiết bị cùng ghi trả nợ sẽ **làm mất tiền âm thầm**. Đây là quyết định quan trọng nhất của cả giai đoạn.
2. **Xoá mềm ở mọi bảng.** Không có nó thì phiếu đã xoá sẽ "sống dậy" khi thiết bị offline đồng bộ lại.
3. **Id do client sinh (UUID).** Điều kiện cần của ghi lạc quan offline.

> Không viết code frontend nào ở giai đoạn này.

---

## 2. CÔNG NGHỆ

| Công nghệ | Dùng để | Ghi chú |
|---|---|---|
| Supabase — **hai project** | `thumua365-prod` (gói trả phí ~25 USD/tháng) · `thumua365-staging` (free) | Bắt buộc hai project: preview deploy **không bao giờ** được trỏ vào prod |
| PostgreSQL (do Supabase quản lý) | Dữ liệu nghiệp vụ | JSONB cho phần đóng băng, bảng riêng cho phần ghi thêm |
| Row Level Security | Cô lập dữ liệu theo `auth.uid()` | Ở tầng database, không ở tầng code |
| Supabase Auth (email/password) | Xác thực | Định danh linh hoạt qua `resolve_identifier()` |
| Supabase Storage | Ảnh chứng từ | Bucket `attachments`, path `/{user_id}/{id}.jpg` |
| Supabase CLI | `db push`, `gen types` | Migration nằm trong git |
| `citext` extension | `username` không phân biệt hoa thường | `create extension if not exists citext` |

---

## 3. VIỆC CẦN LÀM

### 3.1 Hai môi trường

- [ ] Tạo `thumua365-staging` (free tier) và `thumua365-prod` (gói trả phí — free tier **tạm dừng project** khi không hoạt động và **không có backup hằng ngày**, không dùng được cho sản phẩm thật).
- [ ] Vercel: biến môi trường **Preview** trỏ staging, **Production** trỏ prod.
- [ ] Chỉ đưa `anon key` vào frontend. `service_role key` chỉ nằm trong Edge Function và script quản trị.

### 3.2 Migration nằm trong git

- [ ] `supabase init`, viết schema thành `supabase/migrations/NNNN_ten.sql`, commit.
- [ ] **Cấm sửa schema bằng UI table editor trên dashboard.** Không có lịch sử, không tái lập được lên staging, không rollback được. Dashboard chỉ để *xem*.
- [ ] Mỗi migration kèm đường lùi ghi trong comment đầu file.

### 3.3 Schema

Nguồn đầy đủ: [KH deploy §3.2](../KE_HOACH_TRIEN_KHAI_DEPLOY.md). Tóm tắt bắt buộc:

**Bốn quy ước áp cho mọi bảng:**
```sql
id uuid primary key,                                  -- client sinh, KHÔNG default gen_random_uuid()
user_id uuid references auth.users(id) not null,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),        -- + trigger touch_updated_at()
deleted_at timestamptz                                -- xoá mềm, mọi truy vấn lọc `is null`
```

**Bảng:** `profiles` · `suppliers` · `buyers` · `products` · `transactions` · **`payments`** · `drafts` · `pricing_rules` · `notes` · `subscriptions` · `payment_intents`.

**Bốn điểm dễ làm sai:**

| # | Điểm | Đúng là |
|---|---|---|
| 1 | `payments` | **Bảng riêng**, khoá ngoại tới `transactions`, chỉ INSERT. `transactions` **không có** cột `amount_paid` — luôn tính `sum(payments)` |
| 2 | `drafts` | Phải có `kind text check (kind in ('purchase','sale'))` và `counterparty_id`. Thiếu `kind` chính là lỗi #4 trong báo cáo review cũ |
| 3 | `transactions` | Cần `supplier_id text` vì `Transaction.supplierId` đang là **bắt buộc** trong kiểu TS. Hoặc đổi kiểu thành optional trước — chọn một, đừng để mapper bịa giá trị |
| 4 | `lines` / `credit_terms` / `adjustments` | Giữ **JSONB** — đúng, vì chúng đóng băng theo phiếu (`freezeLineTotals`) và không sửa lẻ |

**Index:**
```sql
create index on transactions (user_id, date desc) where deleted_at is null;
create index on transactions (user_id, kind)      where deleted_at is null;
create index on payments (transaction_id)         where deleted_at is null;
```

### 3.4 RLS — bật cho mọi bảng, không sót

- [ ] Mẫu chuẩn cho bảng nghiệp vụ:
```sql
alter table X enable row level security;
create policy "read own"  on X for select using (auth.uid() = user_id);
create policy "write own" on X for insert with check (auth.uid() = user_id);
create policy "edit own"  on X for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
- [ ] Truy vấn kiểm tra không sót bảng nào — chạy trước khi coi giai đoạn là xong:
```sql
select tablename from pg_tables
where schemaname = 'public'
  and tablename not in (select tablename from pg_tables where rowsecurity);
-- phải trả về 0 dòng
```

### 3.5 Hàm phía database

- [ ] `touch_updated_at()` + trigger cho mọi bảng.
- [ ] `normalize_phone(text) → text` — `0905112233` · `0905 112 233` · `+84905112233` → `+84905112233`.
- [ ] `resolve_identifier(raw text) → text` — `security definer`, `set search_path = public`, chỉ `grant execute to anon`, **chỉ trả về email nội bộ**, không trả tên/SĐT. Chi tiết ở [KH deploy §3.4](../KE_HOACH_TRIEN_KHAI_DEPLOY.md).
- [ ] `has_active_sync(uid uuid) → boolean` — dùng trong policy ghi của các bảng nghiệp vụ ở giai đoạn F. Viết sẵn ở đây, **chưa gắn vào policy**.

### 3.6 Auth

- [ ] Tắt xác nhận email (người chỉ có SĐT dùng email nội bộ `+84…@id.thumua365.vn`).
- [ ] Mật khẩu tối thiểu **6 ký tự, cho phép toàn số**. Không bắt chữ hoa/ký tự đặc biệt — với tệp người dùng này, quy tắc phức tạp dẫn tới viết mật khẩu ra giấy, an toàn thực tế *giảm*.
- [ ] Bật rate limit; đặt phiên đăng nhập dài (refresh token) để người dùng gần như không phải gõ lại mật khẩu.
- [ ] Script quản trị `scripts/admin-reset-password.ts` dùng `service_role` — kèm quy tắc xác minh danh tính (tên vựa + 2 giao dịch gần nhất) ghi ngay trong file.

### 3.7 Storage

- [ ] Bucket `attachments`, **private**. Path `/{user_id}/{attachment_id}.jpg`.
- [ ] Policy chỉ cho đọc/ghi khi `auth.uid()::text = (storage.foldername(name))[1]`.
- [ ] Giới hạn MIME `image/*` và dung lượng ở **phía Supabase** — không chỉ tin `accept="image/*"` ở client.

### 3.8 Sinh kiểu TypeScript

- [ ] `supabase gen types typescript --project-id <staging> > src/data/database.types.ts`.
- [ ] Thêm script `npm run db:types`. **Không sửa tay file này.**

---

## 4. RÀNG BUỘC RIÊNG

1. **Kiểu TS sinh từ database không được rò rỉ ra ngoài `src/data/`.** `core/`, `features/`, `components/` chỉ biết kiểu trong `core/types.ts`. Mapper là chỗ duy nhất hai thế giới gặp nhau.
2. **Không thêm cột "để sau này dùng".** Cột thừa trong schema đắt hơn code thừa vì phải migrate mới bỏ được.
3. **Không dùng Supabase Edge Function cho nghiệp vụ CRUD.** SDK gọi thẳng là đủ. Edge Function chỉ dành cho webhook thanh toán (giai đoạn F).
4. **Không viết trigger chứa logic nghiệp vụ.** Logic nghiệp vụ nằm ở `core/`, một chỗ duy nhất. Trigger chỉ làm việc hạ tầng (`updated_at`).
5. Không tạo bảng cho tính năng của giai đoạn sau ngoài `subscriptions`/`payment_intents` — hai bảng này tạo trước vì chúng ảnh hưởng policy.

---

## 5. YÊU CẦU ĐẦU RA

- [ ] Truy vấn ở §3.4 trả về **0 dòng** (không bảng nào thiếu RLS)
- [ ] **Test chéo hai tài khoản:** đăng nhập bằng anon key của A, gọi thẳng REST API đọc `transactions` của B → **trả về rỗng**, không lỗi 500
- [ ] Tương tự với Storage: A không tải được file trong thư mục của B
- [ ] `resolve_identifier('0905112233')`, `('0905 112 233')`, `('+84905112233')` → **cùng một email**
- [ ] `resolve_identifier('khong-ton-tai')` → `NULL`, và không lộ thông tin gì khác
- [ ] Chạy lại toàn bộ migration lên một project trống → schema giống hệt (tái lập được)
- [ ] `supabase gen types` chạy được, file sinh ra compile sạch
- [ ] Staging và prod có schema **giống nhau** (so bằng `supabase db diff`)
- [ ] Không có `service_role key` nào trong repo — `git grep -i "service_role"` chỉ ra file cấu hình Edge Function/script, không ra giá trị thật

---

## 6. CẠM BẪY

| Bẫy | Hậu quả | Tránh bằng |
|---|---|---|
| Để `payments` dạng JSONB cho nhanh | **Mất tiền của người dùng** khi hai máy cùng ghi trả nợ | §3.3 điểm 1 — không thoả hiệp |
| Quên `deleted_at` ở một bảng | Bản ghi đã xoá sống dậy khi đồng bộ | Kiểm bằng truy vấn liệt kê cột |
| Sửa nhanh một cột trên dashboard | Staging lệch prod, không rollback được | Chỉ qua migration file |
| Dùng `default gen_random_uuid()` | Client không biết id trước khi gửi → không ghi lạc quan được | Id do client sinh |
| Quên bật RLS đúng một bảng | Lộ toàn bộ dữ liệu bảng đó cho mọi người dùng | Truy vấn kiểm ở §3.4, chạy mỗi lần thêm bảng |
| Gắn `has_active_sync()` vào policy ngay bây giờ | Giai đoạn C không ghi được gì vì chưa ai có gói | Viết hàm, gắn ở giai đoạn F |
