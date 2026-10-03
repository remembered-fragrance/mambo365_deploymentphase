# 🚀 KẾ HOẠCH TRIỂN KHAI DEPLOY THỰC TẾ — THUMUA365

> 📌 **Cập nhật 09/08/2026:** tài liệu chủ cho bản phát hành thật là [KE_HOACH_XAY_DUNG_SAN_PHAM_THAT.md](KE_HOACH_XAY_DUNG_SAN_PHAM_THAT.md). Tài liệu này giữ vai trò **đặc tả hạ tầng & schema** — §3.2–3.5 (dữ liệu, payments, xác thực, storage), §5 (hosting/CI/môi trường), §7–§8 (bảo mật, giám sát) vẫn là nguồn tham chiếu chính thức. Mục §10 (lộ trình) đã bị thay bằng lộ trình A–H của tài liệu chủ. Khi hai tài liệu mâu thuẫn, tài liệu chủ thắng.

> **Câu hỏi gốc:** deploy thành 1 web app có giao diện và hoạt động tốt trên cả PC và mobile — cần tech stack gì cho frontend, cần gì cho backend?
> **Nguồn đối chiếu:** [BAO_CAO_DU_AN.md](BAO_CAO_DU_AN.md), [KE_HOACH_IMPLEMENT_GIAI_DOAN_2.md](KE_HOACH_IMPLEMENT_GIAI_DOAN_2.md), [SPEC_TRIEN_KHAI_TINH_NANG_CON_THIEU.md](SPEC_TRIEN_KHAI_TINH_NANG_CON_THIEU.md), [BAO_CAO_REVIEW_GIAI_DOAN_2.md](BAO_CAO_REVIEW_GIAI_DOAN_2.md)
> **Ngày lập:** 21/07/2026 · **Sửa lớn:** 09/08/2026

> ⚠️ **Bản 09/08/2026 đổi mục tiêu: từ "demo học kỳ" sang "phát hành thật".** Các mục sau đã được sửa hoặc thêm vì bản cũ chỉ đúng cho demo: **§3.2** (schema thiếu `updated_at`/xoá mềm/`kind`), **§3.3** (payments phải tách bảng — bản cũ để JSONB sẽ **làm mất tiền** khi đồng bộ 2 thiết bị), **§3.4** (xác thực bằng tài khoản/SĐT/email + mật khẩu), **§5.4** (preview deploy đang trỏ vào DB thật; chưa có test nào), **§9** (chi phí không còn là 0đ), **§11**, **§12** (điều kiện phát hành thật). Đọc **§12.5** trước nếu chỉ có 2 phút.

---

## 0. HIỆN TRẠNG — VÌ SAO CẦN THÊM BACKEND

Codebase hiện tại (xem `package.json`, `src/data/`) là **100% client-side**:

| Thành phần | Cách làm hiện tại | Vấn đề khi deploy thật |
|---|---|---|
| Dữ liệu nghiệp vụ | `localStorage`, key `thumua365:data:v3:<userId>` ([storage.ts](src/data/storage.ts)) | **Chỉ tồn tại trên 1 trình duyệt/1 thiết bị.** Thương lái dùng điện thoại ngoài ruộng + máy tính ở nhà sẽ thấy 2 bộ dữ liệu khác nhau. Mất/đổi điện thoại = mất sạch dữ liệu (trừ khi tự export JSON tay). |
| Đăng nhập | `btoa()` "hash" mật khẩu, lưu trong `localStorage` ([auth.ts](src/data/auth.ts)) | **Không an toàn** — `btoa` là encode, không phải mã hoá, ai mở DevTools cũng đọc được. Không dùng được cho người dùng thật. |
| Ảnh chứng từ | IndexedDB cục bộ ([attachmentStore.ts](src/data/attachmentStore.ts)) | Ảnh chỉ xem được trên đúng thiết bị đã chụp — không đồng bộ. |
| Không có server nào cả | — | Không backup tập trung, không thể quản trị/khôi phục hộ người dùng khi họ báo lỗi, không thống kê toàn hệ thống cho team Business. |

**Kết luận:** giữ nguyên kiến trúc offline-first hiện tại là đúng cho MVP học kỳ (dev nhanh, không tốn tiền server). Nhưng để **deploy thật cho nhiều thương lái dùng đa thiết bị**, bắt buộc phải thêm 1 backend thật. Tài liệu này thiết kế backend đó sao cho **tận dụng tối đa code đã có**, không viết lại từ đầu.

---

## 1. KIẾN TRÚC TỔNG THỂ ĐỀ XUẤT

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (giữ nguyên phần lớn code hiện tại)                │
│  React 19 + Vite + Tailwind v4 + React Router 7 (đã có)      │
│  PWA (vite-plugin-pwa — đã có, cần hoàn thiện icon)          │
│  localStorage/IndexedDB → chuyển vai trò thành CACHE cục bộ  │
│  + hàng đợi đồng bộ (offline-first vẫn giữ, không bỏ)        │
└───────────────────────┬───────────────────────────────────────┘
                        │ HTTPS (Supabase client SDK)
┌───────────────────────▼───────────────────────────────────────┐
│  BACKEND-AS-A-SERVICE: Supabase                              │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐             │
│  │ Postgres DB │ │    Auth    │ │ Storage bucket│             │
│  │ (dữ liệu    │ │ (đăng nhập │ │ (ảnh chứng từ  │             │
│  │  nghiệp vụ) │ │  thật)     │ │  thay IndexedDB)│            │
│  └────────────┘ └────────────┘ └──────────────┘             │
│  Row Level Security = cô lập dữ liệu theo user (giữ đúng      │
│  triết lý "mỗi tài khoản 1 bộ dữ liệu riêng" đang có)        │
└─────────────────────────────────────────────────────────────┘
```

**Nguyên tắc thiết kế:** frontend đổi ít nhất có thể, backend chọn giải pháp tốn ít công sức vận hành nhất cho một nhóm sinh viên/nhóm dev nhỏ.

---

## 2. FRONTEND — TECH STACK

### 2.1 Giữ nguyên (đã đúng, không cần đổi)

| Đã có | Lý do giữ |
|---|---|
| React 19 + TypeScript | Đã ổn định, toàn bộ domain logic (`calc.ts`, `selectors.ts`...) viết thuần TS, tái dùng được 100% |
| Vite 8 | Build nhanh, dev server tốt, hỗ trợ PWA plugin sẵn |
| Tailwind CSS v4 | Đã responsive mobile-first (`Layout.tsx` có sidebar desktop + bottom nav mobile) |
| React Router 7 (`BrowserRouter`) | Giữ nguyên, chỉ cần cấu hình SPA fallback đúng ở host (mục 5.2) |
| `vite-plugin-pwa` | Đã cấu hình trong `vite.config.ts`, chỉ thiếu icon PNG thật (192/512px) — xem lỗi #1 trong [BAO_CAO_REVIEW_GIAI_DOAN_2.md](BAO_CAO_REVIEW_GIAI_DOAN_2.md) |
| jsPDF + html2canvas + xlsx | Xuất PDF/PNG/Excel phía client — không cần chuyển lên server, giữ nguyên |

### 2.2 Cần thêm

| Thêm mới | Mục đích |
|---|---|
| `@supabase/supabase-js` | SDK gọi thẳng Postgres/Auth/Storage từ React, không cần viết API riêng cho CRUD cơ bản |
| Icon PWA 192×192, 512×512 (PNG, xuất từ `iconapp.jpg`) | Hoàn thiện cấu hình PWA đã có, để cài lên màn hình chính thật sự hoạt động |
| `_redirects` (Cloudflare Pages) hoặc cấu hình rewrite tương đương ở host | Bắt buộc cho SPA dùng `BrowserRouter` — thiếu bước này thì F5 ở `/history` sẽ ra lỗi 404 trên production |
| (Tuỳ chọn, Phase 2) `@capacitor/core` + `@capacitor/android` | Đóng gói thành APK đưa lên Play Store — theo đúng lộ trình PWA→Capacitor đã chốt ở Workstream B, **không bắt buộc cho việc "deploy web"** |

### 2.3 Vì sao KHÔNG cần Next.js/SSR

App này là dashboard nghiệp vụ sau đăng nhập (không cần SEO công khai, không cần render phía server cho tốc độ tải trang đầu vì đây không phải trang landing công khai). Chuyển sang Next.js sẽ tốn công viết lại routing/build mà không mang lại lợi ích tương xứng. **Giữ SPA thuần (Vite) là lựa chọn đúng.**

---

## 3. BACKEND — TECH STACK

### 3.1 So sánh 3 phương án

| Phương án | Công sức xây dựng | Chi phí vận hành | Phù hợp |
|---|---|---|---|
| **A. Supabase (Postgres + Auth + Storage)** — ✅ **chọn** | Thấp — dùng SDK gọi thẳng, không cần viết server | Free tier đủ cho pilot/demo | Nhóm nhỏ, cần ra mắt nhanh, đã quen SQL cơ bản |
| B. Firebase (Firestore + Auth + Storage) | Thấp, tương tự A | Free tier tương tự | Nếu nhóm thích NoSQL/thân quen Google ecosystem hơn |
| C. Tự viết Node.js/NestJS + PostgreSQL (Prisma) + hosting riêng | Cao — phải viết API, xác thực JWT, migration tay | Tốn thêm 1 server chạy 24/7 | Khi cần logic nghiệp vụ phức tạp phía server (vd: tính thuế thật, tích hợp hệ thống ngoài) — **chưa cần ở giai đoạn này** |

**Chọn phương án A (Supabase)** vì lý do khớp trực tiếp với kiến trúc đang có:

1. **Postgres quan hệ** phù hợp với các bảng đã có sẵn khái niệm rõ ràng (Supplier, Buyer, Product) — trong khi `Transaction.lines`/`payments`/`creditTerms`/`adjustments` vốn đã được thiết kế là **mảng đóng băng theo phiếu** (`freezeLineTotals` — triết lý "phiếu đã hoàn thành là bất biến") nên lưu dạng cột `JSONB` là hợp lý, không cần chuẩn hoá thành nhiều bảng con.
2. **Auth có sẵn** thay thế hoàn toàn kiểu hash `btoa()` không an toàn trong `auth.ts` hiện tại. Cách dùng cụ thể (đăng nhập bằng tên tài khoản / SĐT / email + mật khẩu) ở **§3.4** — không dùng thẳng email/password mặc định.
3. **Storage bucket** thay thế IndexedDB cho ảnh chứng từ — giải quyết đúng vấn đề "ảnh không đồng bộ đa thiết bị" nêu ở mục 0.
4. **Row Level Security (RLS)** ánh xạ 1-1 với nguyên tắc đang áp dụng bằng tay (`thumua365:data:v3:<userId>` — mỗi user 1 key riêng): chỉ cần policy `auth.uid() = user_id` là có cô lập dữ liệu tương đương, do Postgres đảm bảo ở tầng database chứ không phải quy ước ở tầng code như hiện tại.
5. **Sinh TypeScript type tự động** từ schema (`supabase gen types typescript`) — hợp với codebase đã rất chặt kiểu.
6. Không cần tự vận hành server nào — giảm tải cho nhóm dev nhỏ.

> ⚠️ Lưu ý: hạn mức free tier (băng thông DB, dung lượng storage, chính sách tạm ngưng dự án sau X ngày không hoạt động...) thay đổi theo thời gian — kiểm tra lại trang chính thức của Supabase trước khi triển khai thật, đừng dựa cứng vào con số cụ thể.

### 3.2 Thiết kế schema Postgres

> **Bản sửa 09/08/2026.** Bản đầu tiên của mục này thiếu 5 thứ khiến không dùng được cho sản phẩm thật: `updated_at` (trong khi §11 lại chốt chống xung đột theo `updated_at`), xoá mềm, `kind` cho `drafts`, và — nghiêm trọng nhất — để `payments` dạng JSONB (xem §3.3). Dưới đây là bản đã sửa.

**Bốn quy ước áp dụng cho MỌI bảng:**

```sql
-- 1. Mọi bảng đều có bộ cột hạ tầng này
--    created_at / updated_at : phục vụ đồng bộ và chống xung đột (§11)
--    deleted_at              : XOÁ MỀM — bắt buộc, xem giải thích bên dưới
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

-- 2. Mọi bảng bật RLS + policy "chỉ dữ liệu của mình"
-- 3. Mọi truy vấn đọc đều lọc deleted_at is null
-- 4. id do CLIENT sinh (UUID v4) — không dùng default gen_random_uuid()
--    Lý do: ghi lạc quan offline cần biết id ngay, không đợi server trả về
```

> **Vì sao bắt buộc xoá mềm:** máy A xoá phiếu khi đang online; máy B đang offline sửa đúng phiếu đó rồi mới lên mạng. Với xoá cứng, bản ghi từ máy B sẽ **tạo lại phiếu đã xoá** — người dùng thấy phiếu "sống dậy" và không hiểu vì sao. Với `deleted_at`, máy B thấy phiếu đã bị đánh dấu xoá và bỏ qua.

```sql
-- Người dùng: Supabase Auth quản lý auth.users, ta chỉ thêm bảng hồ sơ
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username citext unique,          -- tên đăng nhập (tuỳ chọn) — xem §3.4
  phone text unique,               -- đã chuẩn hoá dạng +84…
  recovery_email text,             -- email tuỳ chọn, chỉ để lấy lại mật khẩu
  business_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null, phone text, location text, note text
);

create table buyers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null, phone text, location text, note text
);

create table products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null, unit text, formula_type text,
  is_suggested boolean, is_active boolean, crop text,
  last_price_per_unit numeric, "group" text,
  quality_grades text[], track_inventory boolean
);

-- Trung tâm: mỗi phiếu 1 dòng.
-- lines / credit_terms / adjustments giữ JSONB — ĐÚNG, vì chúng được "đóng băng"
-- theo phiếu (freezeLineTotals) và không bao giờ sửa lẻ sau khi phiếu hoàn thành.
-- NHƯNG payments thì KHÔNG (xem §3.3) — đã tách thành bảng riêng.
create table transactions (
  id uuid primary key,                    -- client sinh UUID
  user_id uuid references auth.users(id) not null,
  date timestamptz not null,
  kind text not null check (kind in ('purchase','sale')),
  counterparty_id uuid,
  supplier_id text,                       -- field deprecated nhưng Transaction.supplierId đang là bắt buộc
  supplier_name text not null,
  lines jsonb not null,
  credit_terms jsonb,
  adjustments jsonb,
  attachment_ids text[],
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on transactions (user_id, date desc) where deleted_at is null;
create index on transactions (user_id, kind)      where deleted_at is null;

-- ⭐ payments TÁCH RIÊNG, chỉ ghi thêm (append-only) — xem §3.3
create table payments (
  id uuid primary key,
  transaction_id uuid references transactions(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  date timestamptz not null,
  amount numeric not null,
  note text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz                  -- huỷ một lần trả = xoá mềm, không sửa số
);
create index on payments (transaction_id) where deleted_at is null;

create table drafts (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  status text,
  kind text check (kind in ('purchase','sale')),   -- THIẾU ở bản đầu → gây lỗi #4 trong báo cáo review
  counterparty_id uuid,
  supplier_id text, supplier_name text,
  lines jsonb, amount_paid numeric, note text,
  attachment_ids text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table pricing_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text, kind text, product_id uuid,
  fixed_amount numeric, percent_of_total numeric,
  min_weight_kg numeric, applies_on_pickup boolean, active boolean
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  body text, pinned boolean, done boolean,
  created_at timestamptz, updated_at timestamptz
);

-- Row Level Security — bật cho MỌI bảng trên
alter table transactions enable row level security;
create policy "own rows only" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- lặp lại policy tương tự cho suppliers, buyers, products, drafts, pricing_rules, notes, profiles
```

*(Áp dụng cùng 1 mẫu RLS policy cho tất cả bảng còn lại — không liệt kê lặp lại cho ngắn gọn.)*

### 3.3 ⭐ Vì sao `payments` bắt buộc phải tách khỏi JSONB

Đây là sửa đổi quan trọng nhất so với bản đầu, và là điều kiện để sản phẩm **không làm mất tiền của người dùng**.

Bản đầu để `payments jsonb not null default '[]'` cùng hàng với `lines`. Lập luận "đóng băng theo phiếu" **đúng với `lines`** (cân xong là bất biến) nhưng **sai với `payments`**: `recordPayment` ghi thêm vào mảng này **nhiều lần trong nhiều tháng** sau khi phiếu đã hoàn thành ([storage.ts:532](src/data/storage.ts:532)).

**Kịch bản mất tiền có thật:**

```
Phiếu #A: nợ 10 triệu.
  09:00  Điện thoại (offline)  → ghi trả 3 triệu   → payments = [3tr]
  09:05  Máy tính ở nhà        → ghi trả 5 triệu   → payments = [5tr]  ⇢ đẩy lên server
  09:30  Điện thoại có mạng lại → đẩy cả HÀNG      → payments = [3tr]  ⇢ ghi đè
  Kết quả: khoản 5 triệu BIẾN MẤT. Sổ nợ sai. Không ai biết.
```

Nguyên nhân: "ghi sau thắng" (§11) so sánh và ghi đè **cả hàng**, mà cả mảng `payments` nằm trong hàng đó. Với `lines` thì không sao (không ai sửa), với `payments` thì mất dữ liệu tài chính **âm thầm**.

Tách thành bảng riêng thì hai lần trả là **hai dòng INSERT độc lập** — chúng tự hoà vào nhau, không cái nào đè cái nào. Đây là lý do duy nhất và đủ để tách.

**Hệ quả kèm theo:**
- Bỏ cột `amount_paid` khỏi `transactions` → luôn tính bằng `sum(payments)`. Bất biến `amountPaid = sum(payments)` mà codebase đang giữ ([types.ts:211](src/domain/types.ts:211)) từ chỗ là *quy ước trong code* trở thành *ràng buộc do database bảo đảm*. Tốt hơn hẳn.
- Tầng `data/` khi đọc phải `select *, payments(*)` rồi map ngược về `Transaction.payments[]` — **UI và `domain/` không đổi một dòng nào**.
- Tương tự, `attachment_ids` là mảng do người dùng thêm dần ⇒ về lâu dài cũng nên tách bảng `attachments`. Ở pilot chấp nhận giữ mảng, nhưng **phải ghi vào nợ kỹ thuật**.

### 3.4 ⭐ Thiết kế xác thực — tài khoản / SĐT / email + mật khẩu

> **Quyết định 09/08/2026:** OTP-SMS **tạm hoãn**. Bản phát hành đầu dùng định danh linh hoạt + mật khẩu.

**Vấn đề kỹ thuật:** Supabase Auth chỉ nhận **email** hoặc **phone** làm định danh đăng nhập. Nó không có khái niệm "tên tài khoản", và đăng nhập bằng `phone` ở Supabase mặc định đi kèm luồng xác minh SMS — thứ ta đang hoãn.

**Giải pháp: một lớp dịch định danh.**

```
Người dùng gõ:  "vua_ba_tam"  |  "0905112233"  |  "co@gmail.com"
                        ↓
        RPC resolve_identifier(text) → email nội bộ
                        ↓
        supabase.auth.signInWithPassword({ email, password })
```

**a) Email nội bộ.** Mỗi tài khoản luôn có một email trong `auth.users`:
- Người dùng khai email thật → dùng chính email đó.
- Chỉ khai SĐT → sinh email nội bộ `+84905112233@id.thumua365.vn` (tên miền ta sở hữu, không gửi thư tới). Tắt xác nhận email trong cấu hình Auth.

**b) Hàm dịch — `security definer`, không lộ dữ liệu:**

```sql
create or replace function resolve_identifier(raw text)
returns text language plpgsql security definer set search_path = public as $$
declare v_email text; v_key text := lower(trim(raw));
begin
  -- chuẩn hoá SĐT: 0905112233 / 0905 112 233 / +84905112233 → +84905112233
  if v_key ~ '^[0-9 .+()-]+$' then v_key := normalize_phone(v_key); end if;

  select u.email into v_email
  from profiles p join auth.users u on u.id = p.id
  where p.username = v_key or p.phone = v_key or lower(u.email) = v_key
     or lower(p.recovery_email) = v_key;

  return v_email;   -- NULL nếu không có
end $$;
```

**c) Ba chốt bảo mật bắt buộc** (thiếu là thành lỗ hổng):

| Rủi ro | Chốt |
|---|---|
| Dò tài khoản tồn tại (account enumeration) | Client **luôn** hiện một thông báo duy nhất *"Tài khoản hoặc mật khẩu không đúng"*, kể cả khi `resolve_identifier` trả NULL |
| Dò hàng loạt | Bật rate limit của Supabase cho hàm RPC + khoá tạm 15 phút sau 10 lần sai |
| Hàm chạy quyền cao (`security definer`) bị lạm dụng | `set search_path = public`, chỉ `grant execute` cho role `anon`, hàm **chỉ trả về email nội bộ**, không trả tên/SĐT/bất cứ gì khác |

**d) Chuẩn hoá SĐT là bắt buộc, không phải tuỳ chọn.** `0905112233` và `+84 905 112 233` phải là **một** tài khoản. Chuẩn hoá về `+84…` khi ghi, có `unique` trên cột `phone`. Nếu bỏ qua, người dùng sẽ vô tình tạo hai tài khoản với hai bộ dữ liệu khác nhau và **không hiểu vì sao mất phiếu** — lỗi này cực khó hỗ trợ từ xa.

**e) Quên mật khẩu — giới hạn phải chấp nhận và phải nói rõ:**

| Người dùng có | Cách lấy lại mật khẩu | Đánh giá |
|---|---|---|
| Email thật (khai lúc đăng ký hoặc bổ sung sau) | Tự động qua Supabase `resetPasswordForEmail` | ✅ Tự phục vụ |
| **Chỉ có SĐT** | **Không có cách tự động.** Phải liên hệ Zalo hỗ trợ, xác minh danh tính (tên vựa + vài giao dịch gần nhất), quản trị viên đặt lại bằng script `service_role` | ⚠️ Thủ công |

**Đây là trần khả năng mở rộng, phải theo dõi bằng số:** khả thi ở vài chục người dùng. **Khi vượt ~200 người dùng hoạt động, hoặc khi số yêu cầu đặt lại mật khẩu vượt 5 lần/tuần, thì bật OTP-SMS** — đó là ngưỡng chuyển giai đoạn, không phải "làm khi rảnh".

**Giảm nhẹ ngay từ đầu (bắt buộc):**
- Sau khi đăng ký, hiện nhắc **"Thêm email để tự lấy lại mật khẩu"** — bỏ qua được, nhưng nhắc lại mỗi 7 ngày cho tới khi có.
- Phiên đăng nhập dài (refresh token), **"Ghi nhớ đăng nhập" bật sẵn** → người dùng gần như không phải gõ lại mật khẩu, giảm mạnh nhu cầu đặt lại.
- Giữ nguyên chức năng **Xuất file backup** đã có ([ProfilePage.tsx:47](src/pages/ProfilePage.tsx:47)) và nhắc dùng định kỳ → kể cả trường hợp xấu nhất mất tài khoản, dữ liệu vẫn còn.

**f) Chính sách mật khẩu:** tối thiểu 6 ký tự, **cho phép toàn số**. Không bắt chữ hoa / ký tự đặc biệt — với tệp người dùng này, quy tắc phức tạp dẫn tới viết mật khẩu ra giấy dán lên tường, an toàn thực tế **giảm** chứ không tăng. Bù lại bằng rate limit và phiên dài.

### 3.5 Storage bucket cho chứng từ

- Tạo bucket `attachments`, cấu trúc path `/{user_id}/{attachment_id}.jpg` — khớp policy RLS theo `user_id` ở path.
- Hàm nén ảnh hiện có (`compressImage.ts`) **giữ nguyên** — chỉ đổi đích lưu từ `putAttachment` (IndexedDB) sang `supabase.storage.from('attachments').upload(...)`.
- IndexedDB vẫn giữ vai trò **cache cục bộ** để xem ảnh nhanh không cần tải lại khi offline (xem mục 4).

---

## 4. CHIẾN LƯỢC ĐỒNG BỘ DỮ LIỆU (LOCAL-FIRST + CLOUD SYNC)

Không bỏ offline-first — đây là điểm mạnh cốt lõi của app (thương lái làm việc ngoài ruộng, mạng chập chờn, đã có yêu cầu rõ trong `THUMUA365_KeHoachPhatTrien.docx`). Thiết kế lại vai trò:

| Trước | Sau |
|---|---|
| localStorage = nguồn dữ liệu duy nhất | localStorage/IndexedDB = **cache + hàng đợi offline** |
| — | Postgres (Supabase) = **nguồn sự thật (source of truth)**, đồng bộ 2 chiều khi có mạng |

**Luồng hoạt động:**
1. Mọi thao tác (tạo phiếu, trả nợ...) ghi vào cache cục bộ **trước** (giữ nguyên UX tức thời hiện có — auto-save 700ms không đổi).
2. Đồng thời đẩy lên Supabase nếu online; nếu offline, đánh dấu "chưa đồng bộ" và gửi lại khi có mạng (lắng nghe sự kiện `online`/service worker background sync).
3. Khi mở app trên thiết bị khác, tải dữ liệu mới nhất từ Supabase về cache cục bộ.

### 4.1 Tận dụng code đã có cho việc migrate dữ liệu cũ

Tính năng **Export/Import JSON** đã xây ở `ProfilePage.tsx` (Workstream J) chính là bước đệm hoàn hảo:
- Khi user đăng nhập lần đầu sau khi có backend, hiện màn hình "Đồng bộ dữ liệu lên đám mây" — đọc dữ liệu local hiện có (đúng luồng `exportAttachmentsBase64` + `data` hiện tại) và đẩy lên Supabase làm dữ liệu khởi tạo.
- Không cần viết thêm luồng export/import mới — chỉ đổi đích ghi.

### 4.2 Không cần viết lại `domain/`

Toàn bộ logic thuần (`calc.ts`, `selectors.ts`, `filters.ts`, `inventory.ts`, `pricing.ts`, `taxReport.ts`...) **không đụng tới** — các hàm này nhận `AppData` làm input, không quan tâm dữ liệu đến từ localStorage hay Supabase. Chỉ tầng `data/storage.ts` (repository) cần viết lại phần đọc/ghi để gọi Supabase thay vì `localStorage.getItem/setItem`.

---

## 5. HOSTING & CI/CD CHO FRONTEND

### 5.1 Chọn nền tảng: Vercel hoặc Cloudflare Pages

| | Vercel | Cloudflare Pages |
|---|---|---|
| Độ dễ dùng | Rất dễ, kết nối GitHub là xong | Dễ, tương tự |
| CDN toàn cầu | Có | Có, mạng lưới rộng hơn |
| HTTPS + custom domain | Tự động, miễn phí | Tự động, miễn phí |
| Preview deploy mỗi PR | Có | Có |
| Free tier | Đủ cho pilot | Đủ cho pilot, hạn mức băng thông rộng hơn |

**Chọn 1 trong 2 đều được** — khuyến nghị Vercel vì tài liệu/cộng đồng phổ biến hơn cho nhóm sinh viên mới triển khai lần đầu.

### 5.2 Cấu hình bắt buộc: SPA fallback

App dùng `BrowserRouter` (không phải hash router) — F5 hoặc mở thẳng URL `/history`, `/receipt/:id` sẽ trả 404 nếu host không redirect về `index.html`.
- **Vercel:** tự động nhận diện Vite SPA, không cần cấu hình thêm (hoặc thêm `vercel.json` với rewrite `"/(.*)" → "/index.html"` nếu cần chắc chắn).
- **Cloudflare Pages:** tạo file `public/_redirects` với nội dung `/* /index.html 200`.

### 5.3 Biến môi trường

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Đây là **public key** (an toàn để lộ ra frontend — bảo mật thật sự nằm ở RLS policy phía Postgres), khai báo trong phần Environment Variables của Vercel/Cloudflare, không hardcode trong code.

### 5.4 CI/CD — bản sửa cho sản phẩm thật

> Bản đầu viết "không cần GitHub Actions, preview deploy là đủ". Câu đó **đúng cho đồ án, sai cho sản phẩm có người dùng thật**. Hai lý do:

**🔴 (a) Preview deploy đang trỏ vào database THẬT.** Chỉ có một project Supabase, nên mọi bản preview của mọi PR đều đọc/ghi vào đúng cơ sở dữ liệu mà khách hàng đang dùng. Một PR đang thử nghiệm luồng "xoá dữ liệu" là **xoá dữ liệu thật của người ta**.

- **Bắt buộc:** hai project Supabase — `thumua365-prod` và `thumua365-staging`. Preview deploy dùng biến môi trường của staging (Vercel cho phép đặt env riêng cho Preview và Production). Đây là việc **bắt buộc trước khi có người dùng thật đầu tiên**, không phải tối ưu.

**🔴 (b) Repo hiện không có test và không có CI.** `package.json` chỉ có `dev/build/lint/preview` — **không có test runner nào**, không có thư mục `.github/`. Với một sản phẩm tính tiền cho người khác, tối thiểu cần:

| Mức | Nội dung | Vì sao là mức tối thiểu |
|---|---|---|
| **Bắt buộc** | Unit test cho `domain/calc.ts`, `inventory.ts`, `pricing.ts`, `taxReport.ts` (Vitest) | Đây là nơi tính tiền và tính tồn kho. Sai ở đây = sai sổ của người dùng. Chúng là hàm thuần, **rất dễ test** — không có lý do gì để không có |
| **Bắt buộc** | Test round-trip migration của `normalize()` trong `storage.ts` | Đọc dữ liệu v1/v2/v3 không được làm mất field |
| **Nên có** | GitHub Actions chạy `lint` + `build` + `test` trên mỗi PR | Chặn merge bản hỏng |
| **Nên có** | 1 test E2E (Playwright) cho luồng: đăng nhập → tạo phiếu → thấy trong lịch sử | Luồng chết là chết sản phẩm |

**(c) Migration schema phải nằm trong git.** Bản đầu gợi ý "Supabase có UI table editor kéo-thả, không bắt buộc viết SQL tay" (§11) — tiện cho học nghề, nhưng **với sản phẩm thật thì cấm**: sửa schema bằng cách bấm chuột trên dashboard nghĩa là không có lịch sử thay đổi, không tái lập được lên staging, không rollback được. Dùng `supabase/migrations/*.sql` commit vào repo, áp bằng `supabase db push`.

### 5.5 Cập nhật phiên bản cho người đang dùng

`registerType: 'autoUpdate'` ([vite.config.ts:12](vite.config.ts)) tự tải bản mới nền, nhưng **tab đang mở vẫn chạy code cũ**. Khi đã có backend, một client cũ nói chuyện với schema mới là nguồn lỗi khó tái hiện.

- Hiện dải thông báo **"Đã có bản mới — Tải lại"** khi service worker báo có bản cập nhật (`vite-plugin-pwa` cung cấp sẵn hook `onNeedRefresh`).
- Gửi kèm số phiên bản trong mỗi request; nếu server thấy client quá cũ so với schema thì trả mã riêng để client bắt buộc tải lại.

---

## 6. ĐẢM BẢO HOẠT ĐỘNG TỐT TRÊN PC VÀ MOBILE

### 6.1 Đã có sẵn (không cần làm lại)

- `Layout.tsx`: sidebar cố định trên desktop (`lg:flex`), bottom nav nổi trên mobile — đã responsive đúng chuẩn mobile-first.
- Chế độ Ngoài trời (`outdoor mode`) — tăng cỡ chữ/tương phản/kích thước nút cho thao tác ngón tay.
- `Numpad.tsx` — bàn phím số lớn thay thế bàn phím vật lý khi thao tác 1 tay trên di động.
- `<meta name="viewport">` đã đúng chuẩn trong `index.html`.
- PWA manifest (`vite-plugin-pwa`) cho phép "Thêm vào màn hình chính" trên Android/iOS Safari.

### 6.2 Cần bổ sung trước khi công bố rộng

| Việc | Vì sao |
|---|---|
| Icon PWA PNG 192/512px thật (đang thiếu — lỗi #1 trong báo cáo review) | Không có icon → không cài được lên màn hình chính, Lighthouse fail "installable" |
| Test thật trên iOS Safari (không chỉ Chrome DevTools mobile emulation) | iOS Safari có nhiều khác biệt PWA (không hỗ trợ vài API service worker, safe-area-inset khác) |
| Test luồng in/PDF/chia sẻ (`navigator.share`) trên Android Chrome thật + iOS Safari thật | `receiptExport.ts` có fallback chain nhưng cần xác nhận hành vi thật trên thiết bị, không chỉ giả lập |
| Lighthouse audit (Performance + PWA + Accessibility) trước khi launch | Đo lường khách quan thay vì đoán |

### 6.3 (Phase 2, không bắt buộc) Đóng gói app native

Nếu sau này muốn lên Google Play Store thật sự (icon riêng trong drawer ứng dụng, không chỉ "thêm vào màn hình chính"):
- Dùng **Capacitor** (`npx cap add android`) bọc quanh bản build Vite hiện có — không viết lại code, chỉ thêm 1 project Android wrapper.
- Đã có kế hoạch chi tiết ở Workstream B trong [KE_HOACH_IMPLEMENT_GIAI_DOAN_2.md](KE_HOACH_IMPLEMENT_GIAI_DOAN_2.md) §2 — không lặp lại ở đây.

---

## 7. BẢO MẬT

| Rủi ro | Biện pháp |
|---|---|
| Lộ dữ liệu người dùng khác | RLS policy `auth.uid() = user_id` bắt buộc trên **mọi** bảng — không được bỏ sót bảng nào (kiểm tra bằng cách thử query bằng 2 tài khoản khác nhau trước khi launch) |
| Mật khẩu yếu/lộ | Giao hoàn toàn cho Supabase Auth (bcrypt/argon2 phía server, không tự implement) |
| Service role key bị lộ ra frontend | Chỉ dùng `anon key` ở client; `service_role key` (nếu có dùng cho tác vụ admin) chỉ đặt trong biến môi trường server-side/Edge Function, không bao giờ đưa vào bundle frontend |
| Upload file độc hại giả danh ảnh | Giới hạn `accept="image/*"` (đã có ở FE) + cấu hình Storage bucket giới hạn MIME type & kích thước phía Supabase (không chỉ tin tưởng validate ở client) |
| CORS | Supabase tự quản lý theo domain đã whitelist trong dashboard project |

---

## 8. GIÁM SÁT & VẬN HÀNH (mức tối thiểu cho pilot)

| Việc | Công cụ đề xuất | Mức độ |
|---|---|---|
| Theo dõi lỗi runtime frontend | Sentry (free tier) | Nên có trước khi launch cho nhiều người dùng thật |
| Backup database | Supabase tự động backup hằng ngày (tuỳ gói) — kiểm tra chính sách hiện hành | Bắt buộc xác nhận trước khi có dữ liệu thật quan trọng |
| Uptime dashboard/API | Trang trạng thái Supabase có sẵn | Đủ dùng, không cần tự xây |
| Log truy vấn chậm | Supabase Dashboard → Database → Query Performance | Xem khi có báo cáo app chậm |

---

## 9. ƯỚC TÍNH CHI PHÍ (PILOT/DEMO)

> **Bản sửa 09/08/2026.** Bảng cũ ghi "tổng gần như 0đ" — **đúng cho bản demo, không đúng cho phát hành thật**. Hai con số bị bỏ sót: gói Supabase trả phí (vì free tier **tạm dừng project sau một thời gian không hoạt động**, và **không có backup hằng ngày** — cả hai đều không chấp nhận được khi giữ sổ sách của người khác), và project staging thứ hai.

| Hạng mục | Bản demo | **Phát hành thật** |
|---|---|---|
| Hosting frontend (Vercel/Cloudflare Pages) | 0đ | 0đ — free tier vẫn đủ |
| Supabase **production** | 0đ (free) | **~25 USD/tháng** — cần gói trả phí để project không bị tạm dừng và có backup hằng ngày |
| Supabase **staging** | — | 0đ — free tier là đủ (§5.4a) |
| Tên miền `thumua365.vn` | tuỳ chọn | **~200.000–500.000đ/năm** — bắt buộc, không thể phát hành thật trên tên miền phụ của host |
| Sentry theo dõi lỗi | 0đ | 0đ — free tier đủ |
| SMS OTP | — | **0đ ở giai đoạn này** (đã hoãn — §3.4). Khi bật: ~300–800đ/tin, chủ yếu lúc đăng ký và đặt lại mật khẩu |
| **Tổng** | **~0đ** | **≈ 700.000–800.000đ/tháng** (25 USD) + tên miền theo năm |

Chi phí tăng thêm khi mở rộng: dung lượng ảnh chứng từ trong Storage là hạng mục lớn nhất — mỗi phiếu tối đa 5 ảnh đã nén ([compressImage.ts](src/utils/compressImage.ts)). Theo dõi dashboard sử dụng hằng tháng.

> Con số này nhỏ, nhưng phải **biết trước và chấp nhận** — vì nó là chi phí **định kỳ**: ngày ngừng trả tiền là ngày sổ sách của người dùng ngừng đồng bộ. Nếu chưa có nguồn thu, cần tính trước sẽ duy trì bằng gì trong bao lâu.

---

## 10. LỘ TRÌNH TRIỂN KHAI TỪNG BƯỚC

```
Bước 1 — Chuẩn bị frontend độc lập với backend (làm ngay, không phụ thuộc)
  • Phase 0 của KH Frontend: 4 lỗi CHẶN (§16.1) + id UUID + token màu
  • Viết unit test cho domain/calc, inventory, pricing, taxReport  ← mục 5.4b
  • Deploy bản HIỆN TẠI (vẫn localStorage-only) lên Vercel để có link demo ngay
    → Có sản phẩm chạy thật trên PC/mobile để trình bày TRƯỚC khi làm backend

Bước 2 — Dựng backend Supabase
  • Tạo HAI project: thumua365-prod và thumua365-staging  ← mục 5.4a
  • Viết schema thành file supabase/migrations/*.sql, commit vào git  ← mục 5.4c
  • Chạy schema (mục 3.2), bật RLS cho mọi bảng, kiểm tra bằng truy vấn liệt kê
  • Tạo Storage bucket "attachments" + policy theo user_id
  • Cấu hình Auth: hàm resolve_identifier + chính sách mật khẩu  ← mục 3.4

Bước 3 — Viết lại tầng data/ (không đụng domain/)
  • Thay auth.ts → gọi supabase.auth
  • Thay storage.ts (đọc/ghi) → gọi Supabase client, giữ nguyên chữ ký hàm
    (addTransaction, recordPayment... signature không đổi → UI không phải sửa)
  • Giữ localStorage/IndexedDB làm cache — thêm cờ "đã đồng bộ" mỗi bản ghi

Bước 4 — Luồng migrate dữ liệu cũ
  • Tái dùng Export/Import JSON đã có ở ProfilePage
  • Màn hình "Đồng bộ lên đám mây" khi đăng nhập lần đầu sau khi có backend

Bước 5 — Test đa thiết bị thật
  • Tạo phiếu trên điện thoại → xác nhận thấy trên PC
  • Test offline: tắt mạng, tạo phiếu, bật mạng lại → xác nhận đồng bộ đúng
  • Lighthouse + test iOS Safari thật

Bước 6 — Chuẩn bị phát hành (KHÔNG bỏ qua)  ← mục 12
  • Trang Điều khoản + Chính sách quyền riêng tư, checkbox đồng ý khi đăng ký
  • Nút xoá tài khoản + toàn bộ dữ liệu
  • Bỏ tài khoản demo khỏi bản production
  • Kênh hỗ trợ Zalo hiển thị trong app; thử phục hồi backup MỘT LẦN
  • Rà đủ 15 ô ở mục 12.1

Bước 7 — Mở dần, không mở toang
  • 5–10 người dùng thật quen biết, dùng 2 tuần, sửa theo phản hồi
  • Bật Sentry, theo dõi dashboard Supabase hằng tuần
  • Thu thập phản hồi qua banner khảo sát đã có (S1)
  • Đủ ổn định mới mở rộng
```

---

## 11. RỦI RO & PHƯƠNG ÁN

| Rủi ro | Biện pháp |
|---|---|
| Xung đột khi sửa cùng 1 phiếu từ 2 thiết bị | "Ghi sau thắng" theo `updated_at` — **chỉ áp dụng cho các trường vô hướng** (ghi chú, tên đối tác). **Không bao giờ áp dụng cho tiền:** `payments` là bảng riêng chỉ ghi thêm (§3.3), nên hai lần trả từ hai máy tự hoà vào nhau thay vì đè nhau |
| Free tier Supabase tạm ngưng project sau thời gian không hoạt động | **Dùng gói trả phí cho production** (§9). Đây không còn là rủi ro cần "theo dõi" mà là chi phí bắt buộc phải trả |
| Sửa schema bằng tay trên dashboard → không rollback được, staging lệch production | Mọi thay đổi schema đi qua `supabase/migrations/*.sql` trong git (§5.4c). **UI table editor chỉ dùng để xem, không dùng để sửa** |
| Quên bật RLS cho 1 bảng → lộ dữ liệu | Checklist §12; test chéo 2 tài khoản; thêm truy vấn kiểm tra tự động liệt kê mọi bảng `public` chưa bật RLS |
| Người dùng chỉ có SĐT quên mật khẩu, không tự lấy lại được | Chấp nhận ở pilot, hỗ trợ tay qua Zalo (§3.4e). **Ngưỡng chuyển giai đoạn: >200 người dùng hoạt động hoặc >5 yêu cầu/tuần → bật OTP-SMS** |
| Preview deploy ghi vào database thật | Hai project Supabase, env riêng cho Preview (§5.4a) |
| Không có test cho phần tính tiền | Unit test `domain/` là hạng mục bắt buộc trước launch (§5.4b) |

---

## 12. ⭐ ĐIỀU KIỆN PHÁT HÀNH THẬT (Definition of Done)

> Mục này thêm ngày 09/08/2026 khi chuyển mục tiêu từ *"có bản demo chạy được"* sang *"phát hành cho người dùng thật trả tiền/tin tưởng giao sổ sách"*. Mỗi ô là **có / chưa**, không có "gần xong".

### 12.1 Chặn phát hành — không có thì không được mở cho người ngoài

| # | Hạng mục | Ở đâu |
|---|---|---|
| 1 | Không gieo dữ liệu mẫu cho tài khoản thật | [KH Frontend §16.1/L1](KE_HOACH_THIET_KE_LAI_FRONTEND.md) |
| 2 | Một cách hiểu số duy nhất toàn app (dấu phẩy/ngăn nghìn) | KH Frontend §16.1/L2 |
| 3 | Mọi hành động ghi tiền / xoá đều có xác nhận hoặc hoàn tác | KH Frontend §16.1/L3 |
| 4 | Đăng nhập bằng tài khoản/SĐT/email + mật khẩu, SĐT đã chuẩn hoá | §3.4 |
| 5 | RLS bật trên **mọi** bảng, đã test chéo 2 tài khoản thật | §7 |
| 6 | `payments` là bảng riêng, không phải JSONB | §3.3 |
| 7 | Xoá mềm (`deleted_at`) + `updated_at` trên mọi bảng | §3.2 |
| 8 | Hai project Supabase (prod / staging), preview **không** trỏ vào prod | §5.4a |
| 9 | Schema quản lý bằng file migration trong git | §5.4c |
| 10 | Unit test cho `domain/calc·inventory·pricing·taxReport` + test migration `normalize()` | §5.4b |
| 11 | Backup: xác nhận đã bật, **và đã thử phục hồi một lần** | §8 |
| 12 | Bỏ tài khoản/mật khẩu demo khỏi bản production | [AuthPages.tsx:14,48](src/pages/AuthPages.tsx:14) |
| 13 | Điều khoản sử dụng + Chính sách quyền riêng tư (§12.3) | mới |
| 14 | Kênh hỗ trợ có người trực (Zalo/điện thoại) hiển thị trong app | §12.4 |
| 15 | Người dùng tự xoá được tài khoản và toàn bộ dữ liệu của mình | §12.3 |

### 12.2 Nên có trước khi mở rộng (không chặn bản đầu)

Sentry · dải "Đã có bản mới, tải lại" (§5.5) · E2E test luồng chính · hướng dẫn cài PWA lên màn hình chính · tách bảng `attachments`.

### 12.3 Pháp lý & dữ liệu cá nhân — hạng mục đang thiếu hoàn toàn

App lưu **họ tên, số điện thoại, địa chỉ của người thứ ba** (nông hộ, người mua) — những người **không phải người dùng app** và chưa từng đồng ý gì. Đây là dữ liệu cá nhân theo **Nghị định 13/2023/NĐ-CP**. Hiện chưa có tài liệu nào trong repo đề cập.

| Việc | Nội dung tối thiểu |
|---|---|
| **Chính sách quyền riêng tư** (trang công khai, link trong app + trong Tài khoản) | Thu thập gì · dùng làm gì · lưu ở đâu (Supabase, vùng nào) · lưu bao lâu · chia sẻ với ai (không chia sẻ) · quyền của người dùng · cách liên hệ |
| **Điều khoản sử dụng** | Nêu rõ **app là công cụ ghi chép, không phải chứng từ kế toán hợp pháp**, không thay thế tư vấn thuế — nối tiếp disclaimer đã có ở [ReportsPage](src/pages/ReportsPage.tsx:63) |
| **Đồng ý khi đăng ký** | Checkbox (không tick sẵn) "Tôi đồng ý với Điều khoản và Chính sách quyền riêng tư" |
| **Trách nhiệm của người dùng với dữ liệu bên thứ ba** | Ghi trong Điều khoản: người dùng chịu trách nhiệm về việc nhập thông tin nông hộ/người mua |
| **Xoá tài khoản** | Nút trong Tài khoản → xoá `auth.users` + cascade toàn bộ dữ liệu + file trong Storage. Không được chỉ "vô hiệu hoá" |
| **Xuất dữ liệu** | ✅ đã có ([ProfilePage.tsx:47](src/pages/ProfilePage.tsx:47)) — giữ và nêu trong chính sách |

> Không cần thuê luật sư cho pilot, nhưng **không được bỏ trắng**. Một trang tĩnh viết thật thà, đúng những gì hệ thống làm, là đủ ở giai đoạn này — và là điều kiện bắt buộc nếu sau này đưa lên Google Play.

### 12.4 Vận hành tối thiểu

| Việc | Mức tối thiểu |
|---|---|
| Kênh hỗ trợ | Số Zalo hiển thị trong Tài khoản; cam kết thời gian phản hồi thực tế (vd "trong ngày làm việc") — **đừng hứa 24/7 nếu chỉ có một người** |
| Quy trình đặt lại mật khẩu thủ công | Script dùng `service_role` + quy tắc xác minh danh tính (tên vựa + 2 giao dịch gần nhất). Ghi lại mỗi lần đặt lại |
| Theo dõi | Kiểm tra dashboard Supabase (dung lượng, lỗi) + Sentry mỗi tuần trong tháng đầu |
| Khi có sự cố | Biết trước: cách khôi phục từ backup, cách rollback bản frontend (Vercel giữ mọi bản deploy — rollback là một cú bấm), cách thông báo cho người dùng |
| Ghi nhận phiên bản | Hiện số phiên bản trong Tài khoản để hỗ trợ từ xa biết người dùng đang chạy bản nào |

### 12.5 Kết luận về tính khả thi

**Kiến trúc là khả thi và đúng hướng cho sản phẩm thật.** Ba lý do:

1. Toàn bộ logic nghiệp vụ nằm trong `domain/` thuần TypeScript, không phụ thuộc nơi lưu dữ liệu — nên việc thay localStorage bằng Postgres **không đụng tới phần dễ sai nhất**.
2. Hợp đồng `StoreValue` là một ranh giới sạch giữa UI và tầng dữ liệu — đây là điều kiện kỹ thuật để thay backend mà không viết lại giao diện ([KH Frontend §12](KE_HOACH_THIET_KE_LAI_FRONTEND.md)).
3. Supabase + Vercel là lựa chọn đúng tầm: đủ mạnh cho hàng nghìn người dùng, đủ đơn giản cho một người vận hành.

**Nhưng chưa sẵn sàng phát hành ngay hôm nay** — thiếu 15 hạng mục ở §12.1. Trong đó ba nhóm là việc thật sự phải làm chứ không phải thủ tục: **sửa 4 lỗi dữ liệu ở frontend**, **dựng đúng schema (payments/xoá mềm/updated_at) ngay từ đầu**, và **có test cho phần tính tiền**. Ba nhóm này nếu bỏ qua thì không "nợ" được — chúng làm sai sổ của người dùng, mà sai sổ tiền thì không sửa lại được bằng bản cập nhật sau.

**Thứ tự đề nghị:** Phase 0 frontend (4 lỗi chặn) → viết test `domain/` → dựng schema + hai project Supabase → chuyển tầng `data/` → Phase 1–2 frontend → trang pháp lý + kênh hỗ trợ → mở cho 5–10 người dùng thật quen biết trước, hai tuần, rồi mới mở rộng.

---

*Tài liệu này bổ sung "chiều triển khai hạ tầng" cho các tài liệu Giai đoạn 2 đã có — không thay đổi lộ trình tính năng đã lập, chỉ trả lời câu hỏi "deploy ra sao để chạy tốt trên PC và mobile với nhiều người dùng thật".*
*Bản sửa 09/08/2026: bổ sung §3.3 (payments), §3.4 (xác thực), §5.4–5.5, §12 (điều kiện phát hành thật); cập nhật §3.2, §9, §11 theo mục tiêu phát hành thật thay vì demo học kỳ.*
