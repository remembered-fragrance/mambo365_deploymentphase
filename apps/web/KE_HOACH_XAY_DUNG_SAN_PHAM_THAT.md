# 🏗️ KẾ HOẠCH XÂY DỰNG SẢN PHẨM THẬT — THUMUA365 v1.0

> **Mục tiêu:** dựng lại từ base thành một sản phẩm **phát hành thật và thu được tiền**, chỉ tái sử dụng code khi việc tái sử dụng thực sự có lợi.
> **Ngày lập:** 09/08/2026
> **Thay thế cho:** vai trò "tài liệu thi công" của [KE_HOACH_TRIEN_KHAI_DEPLOY.md](KE_HOACH_TRIEN_KHAI_DEPLOY.md) (vẫn giữ làm tài liệu hạ tầng tham chiếu) và [KE_HOACH_THIET_KE_LAI_FRONTEND.md](KE_HOACH_THIET_KE_LAI_FRONTEND.md) (vẫn giữ nguyên hiệu lực cho toàn bộ phần giao diện — tài liệu này **không lặp lại**, chỉ dẫn chiếu).

---

## 0. QUYẾT ĐỊNH ĐÃ CHỐT

| # | Quyết định | Ngày |
|---|---|---|
| 1 | **Dựng lại từ base**, không vá bản demo. Tái sử dụng có chọn lọc (§2) | 09/08 |
| 2 | **Vite SPA** cho app (`app.thumua365.vn`) + **site tĩnh riêng** cho giới thiệu & pháp lý (`thumua365.vn`) + **Supabase Edge Function** cho webhook thanh toán | 09/08 |
| 3 | Đăng nhập bằng **tài khoản / SĐT / email + mật khẩu**. OTP-SMS hoãn, có ngưỡng bật lại | 09/08 |
| 4 | **Chưa có pháp nhân** → pilot thu tiền bằng **VietQR về tài khoản cá nhân**, đối soát bán tự động. Có ngưỡng bắt buộc chuyển đổi (§7.4) | 09/08 |
| 5 | Chi phí vận hành giữ ở mức **cân bằng**: ~25 USD/tháng Supabase Pro + tên miền. Không thêm dịch vụ trả phí nào khác cho tới khi có doanh thu | 09/08 |
| 6 | **Người dùng free không tốn chi phí máy chủ** — mô hình giá được thiết kế để chi phí bám sát doanh thu (§7.1) | 09/08 |
| 7 | **Bám theo proposal CP4 đã duyệt** (§15): Freemium có hạn mức, giá **149.000đ/tháng**, ba nguồn thu, bảy module MVP, câu định vị "app đổi theo thương lái, không bắt thương lái đổi" | 09/08 |
| 8 | **Hướng thẩm mỹ "Sổ Vựa"** — Tuyến đã duyệt bảng màu (Giấy `#EDEAE3` · Mực `#1A1714` · Xanh rừng `#14663C`). Chi tiết: [KH Frontend §17b](KE_HOACH_THIET_KE_LAI_FRONTEND.md) | 09/08 |
| 9 | **Cân nhiều khách cùng lúc VÀO v1.0** — xác nhận nghiệp vụ có thật. Thanh chip "Đang cân", không phát sinh schema ([KH Frontend §7.3.0](KE_HOACH_THIET_KE_LAI_FRONTEND.md)) | 09/08 |
| 10 | **Máy in nhiệt HOÃN** — cập nhật sau một thời gian triển khai. Điều kiện bật lại và phần chuẩn bị sẵn: §14b | 09/08 |

---

## 1. NGUYÊN TẮC "DỰNG TỪ BASE"

Dựng lại **không có nghĩa là gõ lại mọi thứ**. Nguyên tắc phân xử:

> **Viết lại những gì thể hiện *quyết định thiết kế đã sai*. Giữ lại những gì thể hiện *hiểu biết nghiệp vụ đã đúng*.**

- Tầng giao diện và tầng dữ liệu của bản demo được xây trên hai giả định giờ đã sai — "chỉ có một thiết bị" và "chỉ có một hình thái trình bày". Sửa chúng tốn công hơn viết mới, và sửa xong vẫn mang theo nợ cũ. → **Viết mới.**
- Tầng nghiệp vụ (`domain/`) không mang giả định nào cả. Nó chứa thứ khó nhất và tốn nhiều thời gian nhất để có được: **công thức cân đúng cho từng loại nông sản, quy tắc đóng băng phiếu, cách tính tồn kho theo khối lượng vật lý, báo cáo thuế**. Viết lại phần này là rủi ro thuần tuý, không đổi lấy lợi ích nào. → **Giữ nguyên, bổ sung test.**

Kết quả: tái dùng **~30% số dòng code** nhưng giữ được **~90% giá trị nghiệp vụ**.

---

## 2. MA TRẬN TÁI SỬ DỤNG

| Đường dẫn cũ | Quyết định | Lý do |
|---|---|---|
| `src/domain/**` — **10/14 file thuần** | ✅ **Bê nguyên** + viết test → `src/core/` | Thuần TypeScript, không phụ thuộc React hay nơi lưu dữ liệu. Đây là tài sản thật của dự án |
| `src/domain/` — 3 file **không thuần** (`export.ts`, `receiptExport.ts`, `receiptExportDom.ts`) + 1 file **lẫn** (`taxReport.ts`) | ♻️ **Tách sang `src/export/`** | Chúng import `xlsx`/`jspdf`/`html2canvas` và chạm `document`/`navigator`. Để lẫn trong `core/` thì không test độc lập được và bundle phình. Chi tiết: [deploy_plan/A §3.3](deploy_plan/A-nen-mong.md) |
| `src/utils/compressImage.ts` | ✅ Bê nguyên | Đã đúng việc |
| `src/utils/parseNumber.ts` | ♻️ Giữ, **sửa** thành quy ước số duy nhất toàn app | Lỗi L2 ở [KH Frontend §16.1](KE_HOACH_THIET_KE_LAI_FRONTEND.md) |
| `src/components/Numpad.tsx` | ♻️ Giữ **logic**, dựng lại giao diện theo token mới | Lợi thế cạnh tranh — không được làm hỏng |
| `src/components/BottomSheet.tsx`, `icons.tsx`, `CropIcon.tsx` | ♻️ Giữ, chỉnh nhẹ | Không mang giả định sai |
| `src/data/seed.ts` | ♻️ Giữ, **chỉ dùng cho tài khoản demo** | Lỗi L1 |
| `src/data/**` (còn lại) | ❌ **Viết mới** | Chính là tầng đổi sang Supabase + hàng đợi offline |
| `src/pages/**` | ❌ **Viết mới** | Chính là phần thiết kế lại |
| `src/components/**` (Layout, nav, …) | ❌ **Viết mới** | App shell mới (KH Frontend §5) |
| `vite.config.ts`, `index.html` | ♻️ Sửa | Bỏ `user-scalable=no`, self-host font, PWA |
| `public/icon-*.png` | ✅ Giữ | Đã có |

**Ràng buộc khi bê `domain/` sang:** không được sửa một dòng logic nào trong lúc di chuyển. Chuyển trước, viết test phủ, **rồi mới** sửa nếu cần. Trộn hai việc là cách chắc chắn nhất để làm sai tiền mà không biết.

---

## 3. KIẾN TRÚC & CẤU TRÚC REPO

```
thumua365/
├── src/                        # Vite SPA → app.thumua365.vn
│   ├── domain/                 # ⬅ tái dùng. CẤM import React, CẤM import data/
│   ├── data/                   # Supabase + cache cục bộ + hàng đợi đồng bộ
│   ├── components/             # layout · ui · data · feedback  (KH Frontend §8)
│   ├── pages/
│   ├── billing/                # trạng thái gói, màn hình nâng cấp, QR thanh toán
│   └── utils/
├── site/                       # HTML/CSS tĩnh → thumua365.vn
│   ├── index.html              # giới thiệu sản phẩm + bảng giá
│   ├── dieu-khoan.html
│   ├── quyen-rieng-tu.html
│   └── huong-dan.html          # cách cài lên màn hình chính, video 60s
├── supabase/
│   ├── migrations/*.sql        # ⬅ nguồn sự thật của schema, nằm trong git
│   └── functions/
│       ├── payment-webhook/    # nhận biến động số dư → gia hạn gói
│       └── admin-reset-password/
├── tests/
│   ├── domain/                 # BẮT BUỘC — nơi tính tiền
│   └── e2e/
└── .github/workflows/ci.yml
```

**Hai project Vercel, một repo:** `app` (root `/`) và `web` (root `/site`). Không dùng monorepo tooling — với một người làm thì npm workspaces/Turborepo là chi phí không đổi lấy gì.

**Ba môi trường:**

| | Frontend | Supabase |
|---|---|---|
| Local | `npm run dev` | project `staging` |
| Preview (mỗi PR) | Vercel Preview | project `staging` ⬅ **không bao giờ trỏ vào prod** |
| Production | `app.thumua365.vn` | project `prod` (gói trả phí) |

---

## 4. MÔ HÌNH DỮ LIỆU

Dùng schema đã sửa ở [KE_HOACH_TRIEN_KHAI_DEPLOY.md §3.2–3.3](KE_HOACH_TRIEN_KHAI_DEPLOY.md), **cộng thêm** hai bảng cho phần kinh doanh:

```sql
-- Gói dịch vụ của từng người dùng
create table subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan   text not null default 'free'   check (plan   in ('free','sync')),
  status text not null default 'active' check (status in ('active','grace','expired')),
  trial_end          timestamptz,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- Mỗi lần người dùng bấm "Nâng cấp" sinh một mã chờ thanh toán
create table payment_intents (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  code   text unique not null,          -- 6 ký tự, đưa vào nội dung chuyển khoản
  amount numeric not null,
  months int not null,
  status text not null default 'pending' check (status in ('pending','paid','expired')),
  bank_tx_id text unique,               -- id giao dịch ngân hàng — bảo đảm không cộng tiền 2 lần
  created_at timestamptz not null default now(),
  paid_at    timestamptz
);
```

### 4.1 Chặn tính năng trả phí ở tầng database, không phải ở tầng giao diện

Chặn bằng JavaScript thì mở DevTools là qua được. Chặn đúng chỗ:

```sql
create or replace function has_active_sync(uid uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from subscriptions s
    where s.user_id = uid
      and (s.plan = 'sync' and s.status in ('active','grace')
           or now() < coalesce(s.trial_end, 'epoch'::timestamptz))
  );
$$;

-- ĐỌC: luôn cho phép (dữ liệu là của người dùng, không giữ làm con tin)
create policy "read own" on transactions for select
  using (auth.uid() = user_id);

-- GHI: chỉ khi gói còn hiệu lực
create policy "write when subscribed" on transactions for insert
  with check (auth.uid() = user_id and has_active_sync(auth.uid()));
```

> **Nguyên tắc đạo đức, đồng thời là quyết định kinh doanh:** hết hạn gói thì **ngừng đồng bộ, không khoá dữ liệu**. Người dùng vẫn đọc được, vẫn tải về máy được, vẫn xuất file được, vẫn dùng app ở chế độ một máy. Giữ dữ liệu làm con tin sẽ giết sản phẩm trong một cộng đồng mà người ta truyền miệng nhau — mà đây đúng là cộng đồng như vậy.

---

## 5. XÁC THỰC

Theo [KE_HOACH_TRIEN_KHAI_DEPLOY.md §3.4](KE_HOACH_TRIEN_KHAI_DEPLOY.md): một ô nhập nhận **tài khoản / SĐT / email**, dịch qua `resolve_identifier()` phía DB rồi gọi `signInWithPassword`.

Nhắc lại ba điểm dễ làm sai:
1. **Chuẩn hoá SĐT về `+84…` khi ghi**, có `unique`. Bỏ qua điểm này thì `0905112233` và `+84 905 112 233` thành hai tài khoản với hai bộ dữ liệu.
2. **Thông báo lỗi luôn giống nhau** dù sai tài khoản hay sai mật khẩu — chống dò tài khoản.
3. **Nhắc bổ sung email** mỗi 7 ngày cho tới khi người dùng có, vì không có email thì không tự lấy lại mật khẩu được.

---

## 6. ĐỒNG BỘ OFFLINE-FIRST

Giữ triết lý local-first. Ba điểm bắt buộc:

| Điểm | Yêu cầu |
|---|---|
| **Hàng đợi phải bền** | Ghi vào IndexedDB, **không** giữ trong bộ nhớ. Đóng app khi đang offline không được mất thao tác đã làm |
| **Chống trùng** | Mỗi thao tác có UUID do client sinh; server bỏ qua nếu id đã tồn tại. Bấm hai lần vì mạng chậm không được thành hai phiếu |
| **Xung đột** | "Ghi sau thắng" theo `updated_at` **chỉ cho trường vô hướng**. Tiền thì không bao giờ — `payments` là bảng append-only ([§3.3](KE_HOACH_TRIEN_KHAI_DEPLOY.md)) |

Trạng thái hiển thị cho người dùng: `SyncBadge` ở topbar/header — *Đã đồng bộ · Đang gửi (n) · Ngoại tuyến · Lỗi*.

---

## 7. MÔ HÌNH KINH DOANH & THU TIỀN

### 7.1 Mô hình: Freemium theo proposal CP4 đã duyệt

Proposal §9 chốt **Freemium SaaS**. Phân tầng dưới đây bám đúng danh sách trong proposal, chỉ cụ thể hoá thành con số dùng được:

| | **Free Plan** (theo CP4) | **Premium Plan** (theo CP4) |
|---|---|---|
| Ghi phiếu thu mua | ⚠️ **Tối đa 30 phiếu/tháng** ("Limited procurement records") | ✅ **Không giới hạn** |
| Quản lý người bán | ✅ Cơ bản ("Basic customer management") | ✅ Đầy đủ + lịch sử, tổng giá trị, dư nợ |
| Tổng quan | ✅ Cơ bản: chi hôm nay, số phiếu | ✅ **Phân tích đầy đủ**: biểu đồ, theo nông sản, xu hướng |
| **Quản lý công nợ** | ❌ | ✅ ("Debt management") |
| **Xuất Excel / PDF** | ❌ | ✅ ("Excel & PDF exports") |
| **Đồng bộ đám mây** | ❌ — dữ liệu trên máy | ✅ ("Cloud synchronization") |
| **Sao lưu tự động** | ❌ — tự xuất file | ✅ ("Automatic backup") |
| Số thiết bị | 1 | Không giới hạn |
| Hỗ trợ | Cộng đồng | Zalo ưu tiên |

**Vì sao mô hình này khớp với kiến trúc:** bản Free chạy hoàn toàn trên máy người dùng ⇒ **chi phí máy chủ bằng 0**. Chỉ người trả tiền mới tiêu tài nguyên Supabase. Chi phí bám sát doanh thu, không có nguy cơ "đông người dùng free làm cháy hoá đơn" — đúng với khẳng định về scalability ở proposal §9.

**Hai điểm cụ thể hoá, kèm lý do:**

1. **Hạn mức Free = 30 phiếu/tháng.** Proposal chỉ ghi "Limited" mà không nêu số. Chọn 30 vì chính proposal §3 nói khách hàng mục tiêu xử lý **"hàng trăm giao dịch mỗi tháng"** — 30 phiếu đủ để một chủ vựa dùng thử nghiêm túc trong 1–2 tuần và thấy giá trị, nhưng **không đủ để vận hành thật**. Đó chính là định nghĩa của một hạn mức chuyển đổi tốt: không chặn người ta *đánh giá*, chỉ chặn người ta *vận hành miễn phí*. Nếu đặt quá thấp (5–10 phiếu) thì họ bỏ đi trước khi kịp hiểu sản phẩm.
2. **Cách chặn khác nhau giữa hai loại tính năng:**
   - Hạn mức phiếu ở bản Free chạy **hoàn toàn trên máy** ⇒ chặn ở client là đủ. Ai đó vọc DevTools để ghi thêm phiếu **trên máy của chính họ** thì ta không mất gì (không tốn máy chủ) — không đáng bỏ công chống.
   - Đồng bộ / công nợ đám mây / backup **có chạm máy chủ** ⇒ **bắt buộc chặn ở tầng database** bằng `has_active_sync()` (§4.1). Chặn bằng JavaScript ở đây là chặn giả.

### 7.2 Giá — theo mô hình tài chính CP4

| Gói | Giá | Nguồn |
|---|---|---|
| Dùng thử | **30 ngày** đầy đủ Premium | Đề xuất thêm — proposal không nêu, nhưng cần để khách vượt qua hạn mức 30 phiếu và thấy giá trị đồng bộ |
| **Theo tháng** | **149.000đ/tháng** | Proposal §11.1 — mô hình tài chính 2027–2029 xây trên đúng con số này |
| Theo năm | **1.490.000đ/năm** (giảm ~17%, tặng 2 tháng) | Đề xuất thêm — nông nghiệp theo mùa vụ, chủ vựa có tiền vào mùa và quen trả một lần |

Proposal §9 nêu khoảng **99.000–199.000đ/tháng**, §11.1 chốt **149.000đ** cho mô hình doanh thu. **Lấy 149.000đ** để sản phẩm và báo cáo tài chính không lệch nhau. Khoảng 99–199k vẫn giữ làm biên độ thử nghiệm giá về sau.

**Hai loại điểm hoà vốn — đừng nhầm lẫn:**

| | Nghĩa là gì | Con số |
|---|---|---|
| **Hoà vốn hạ tầng** | Đủ trả tiền máy chủ + tên miền (~700.000đ/tháng) | **5 khách trả theo tháng** ⬅ mốc đầu tiên cần đạt, hoàn toàn trong tầm |
| **Hoà vốn công ty** | Bù cả lương, marketing theo mô hình CP4 §11.3 | **Năm 2028** — 2027 lỗ kế hoạch 95,8 triệu |

Mốc thứ nhất là mốc kỹ thuật của bạn: **sau 5 khách, sản phẩm tự nuôi được hạ tầng và không còn đốt tiền túi.** Mốc thứ hai là mốc của mô hình tài chính khi đã có lương và ngân sách marketing.

### 7.2b Hai nguồn thu còn lại trong proposal — có ảnh hưởng tới sản phẩm

Proposal §11.1 nêu **ba** nguồn thu. Kế hoạch cũ của tôi chỉ có một. Hai nguồn còn lại kéo theo yêu cầu sản phẩm:

| Nguồn thu | Trạng thái | Sản phẩm phải có gì |
|---|---|---|
| **Premium Subscription** | Lõi, làm ngay | §7.1–7.3 |
| **Initial System Setup Service** — cấu hình tài khoản + chuyển dữ liệu cũ cho khách mới | Làm ở giai đoạn F | 🔴 **Nhập dữ liệu từ Excel/CSV** (danh sách nông hộ, phiếu cũ) — hiện chỉ nhập được file JSON do chính app xuất ra ([ProfilePage.tsx:70](src/pages/ProfilePage.tsx:70)). Cần công cụ nhập bảng tính cho đội hỗ trợ dùng khi làm dịch vụ này |
| **B2B Partnership** — quảng cáo, listing, hợp tác doanh nghiệp | **Từ 2028**, ngoài phạm vi v1.0 | Không xây gì. Chỉ **không được chặn đường**: giữ schema đa người dùng sạch, đừng nhét dữ liệu quảng cáo vào bảng nghiệp vụ |

> Dịch vụ setup có tính thu phí là lời giải rất hợp cho tệp người dùng này: họ **cần** người cầm tay chỉ việc, và thu tiền cho việc đó thì trung thực hơn là giả vờ sản phẩm tự phục vụ được 100%.

### 7.3 Luồng thu tiền (chưa có pháp nhân)

```
Người dùng bấm "Nâng cấp"
   → App tạo payment_intent, sinh mã 6 ký tự  (vd: K7M2P9)
   → Hiện QR VietQR: số tài khoản · số tiền · nội dung "TM365 K7M2P9"
   → Người dùng quét bằng app ngân hàng, chuyển khoản
   → Casso/SePay đọc biến động số dư → gọi Edge Function payment-webhook
   → Function: xác thực chữ ký · tìm mã trong nội dung · khớp số tiền
              · kiểm tra bank_tx_id chưa dùng · gia hạn current_period_end
   → App nhận realtime, hiện "Đã kích hoạt gói Đồng Bộ đến 09/09/2026"
```

| Yêu cầu kỹ thuật | Vì sao |
|---|---|
| **Idempotent theo `bank_tx_id`** | Webhook có thể gọi lại nhiều lần — không được cộng tiền hai lần |
| **Xác thực chữ ký/secret** của Casso/SePay | Không thì ai cũng gọi được endpoint để tự gia hạn miễn phí |
| **Secret chỉ nằm trong Edge Function** | Không bao giờ trong bundle frontend |
| **Đường thoát thủ công** | Nội dung chuyển khoản gõ sai là chuyện **thường xuyên** với tệp người dùng này. Phải có: người dùng gửi ảnh biên lai qua Zalo → admin kích hoạt tay bằng script. Thiếu đường này là mất khách đã chịu trả tiền |
| **Biên nhận trong app** | Hiện lịch sử thanh toán + ngày hết hạn trong Tài khoản. Đây là *biên nhận*, **không phải hoá đơn đỏ** — phải ghi rõ |

Chi phí Casso/SePay: gói nhỏ nhất khoảng 50.000–100.000đ/tháng. Chấp nhận được, và **được phép hoãn**: 10 khách đầu tiên hoàn toàn có thể kích hoạt tay, không cần dịch vụ nào.

### 7.4 ⚠️ Trần của cách thu tiền này — biết trước để không bị kẹt

Thu vào tài khoản cá nhân làm được ngay, nhưng có ba giới hạn thật:

| Giới hạn | Hệ quả |
|---|---|
| **Không xuất được hoá đơn** | Khách là công ty/hộ kinh doanh cần hoá đơn để hạch toán sẽ **không mua được**. Với thương lái cá thể thì phần lớn không cần — chấp nhận được ở pilot, nhưng nó chặn một phân khúc |
| **Nghĩa vụ thuế cá nhân** | Nhận tiền đều đặn từ nhiều người vào tài khoản cá nhân là hoạt động kinh doanh, phát sinh nghĩa vụ kê khai |
| **Không có tư cách ký hợp đồng** | Không bán được cho hợp tác xã, doanh nghiệp thu mua lớn |

**Ngưỡng bắt buộc chuyển sang hộ kinh doanh — chọn cái nào đến trước:**
- Doanh thu năm chạm khoảng **200 triệu đồng** (theo quy định hiện hành thì đây là mốc hộ/cá nhân kinh doanh bắt đầu phát sinh nghĩa vụ thuế GTGT/TNCN); **hoặc**
- Có khách đầu tiên yêu cầu hoá đơn; **hoặc**
- Vượt ~50 người dùng trả phí.

> 📌 **Đối chiếu với mô hình tài chính CP4:** proposal §11.1 dự phóng doanh thu **331,6 triệu ngay trong năm 2027** — tức là **vượt ngưỡng 200 triệu ngay năm đầu tiên có doanh thu**. Nói cách khác, theo chính kế hoạch tài chính đã duyệt thì việc đăng ký pháp nhân **không phải chuyện của tương lai xa mà là việc của năm 2027**. Thu qua tài khoản cá nhân chỉ là cầu nối cho giai đoạn pilot vài chục khách đầu tiên. Nên coi đăng ký hộ kinh doanh là một hạng mục có lịch, không phải một khả năng.

> ⚠️ Tôi không phải kế toán và các con số/quy định thuế thay đổi theo thời gian. **Trước khi dựa vào mốc trên để ra quyết định, hãy hỏi một kế toán hoặc chi cục thuế địa phương.** Điều chắc chắn đúng là: cách thu tiền này có trần, và nên đăng ký hộ kinh doanh *trước khi* chạm trần chứ không phải sau.

**Việc cần làm khi chuyển đổi (chuẩn bị trước, làm sau):** đăng ký hộ kinh doanh → mã số thuế → tài khoản ngân hàng doanh nghiệp → hoá đơn điện tử → ký hợp đồng cổng thanh toán (VNPay/MoMo). Kiến trúc §4 **không phải sửa gì** — chỉ đổi tài khoản nhận và thêm bước phát hành hoá đơn sau khi `payment_intent` chuyển `paid`.

---

## 8. PHÁP LÝ & TUÂN THỦ

Đây là hạng mục **chưa từng có** trong repo và là điều kiện chặn phát hành. Bốn tài liệu phải viết, đặt ở `site/`, có link trong app.

### 8.1 Chính sách quyền riêng tư — `site/quyen-rieng-tu.html`

App lưu **họ tên, số điện thoại, địa chỉ của nông hộ và người mua** — những người **không phải người dùng app** và chưa từng đồng ý gì. Đây là dữ liệu cá nhân theo **Nghị định 13/2023/NĐ-CP**.

Nội dung tối thiểu:

| Mục | Nội dung |
|---|---|
| Thu thập gì | Của người dùng: tên, SĐT, email (nếu khai), tên vựa. Của bên thứ ba do người dùng nhập: tên, SĐT, địa chỉ nông hộ/người mua |
| Dùng làm gì | Chỉ để vận hành chức năng ghi chép và đồng bộ. **Không bán, không chia sẻ, không dùng cho quảng cáo** |
| Lưu ở đâu | Supabase (ghi rõ vùng máy chủ, vd Singapore) + trên chính thiết bị của người dùng |
| Lưu bao lâu | Đến khi người dùng xoá tài khoản; xoá xong xoá vĩnh viễn trong vòng 30 ngày kể cả trong bản backup |
| Ai truy cập được | Chỉ chính người dùng (bảo đảm bằng RLS ở tầng database). Quản trị viên chỉ truy cập khi người dùng yêu cầu hỗ trợ và có ghi nhận |
| Quyền của người dùng | Xem · sửa · **xuất ra file** · **xoá toàn bộ** · rút lại đồng ý |
| Phân định trách nhiệm | **Người dùng** là bên quyết định nhập dữ liệu nông hộ và chịu trách nhiệm về việc đó; **THUMUA365** là bên xử lý theo yêu cầu của người dùng |
| Liên hệ | Tên, SĐT/Zalo, email tiếp nhận yêu cầu về dữ liệu |

### 8.2 Điều khoản sử dụng — `site/dieu-khoan.html`

| Mục | Điểm bắt buộc nêu |
|---|---|
| Bản chất dịch vụ | **App là công cụ ghi chép, không phải chứng từ kế toán hợp pháp, không thay thế tư vấn thuế.** Nối tiếp cảnh báo đã có ở [ReportsPage](src/pages/ReportsPage.tsx:63) |
| Trách nhiệm dữ liệu bên thứ ba | Người dùng chịu trách nhiệm về việc nhập thông tin nông hộ/người mua |
| Giá & thanh toán | Giá công khai, kỳ hạn, **không tự động gia hạn** (chuyển khoản thủ công nên vốn không tự trừ tiền — đây là điểm cộng, nói rõ ra) |
| **Hoàn tiền** | Hoàn 100% trong **7 ngày** đầu kể từ lần thanh toán, không cần lý do. Sau đó không hoàn phần đã dùng |
| Khi hết hạn | **Không khoá dữ liệu.** Ngừng đồng bộ, vẫn đọc/xuất/dùng một máy được (§4.1) |
| Giới hạn trách nhiệm | Không chịu trách nhiệm cho thiệt hại kinh doanh phát sinh từ sai sót nhập liệu của người dùng; cam kết nỗ lực hợp lý về tính sẵn sàng, không cam kết 100% |
| Chấm dứt | Người dùng xoá tài khoản bất kỳ lúc nào; bên cung cấp có thể ngừng dịch vụ với thông báo trước tối thiểu 30 ngày và **hỗ trợ xuất toàn bộ dữ liệu** |

### 8.3 Trong app

| Việc | Chi tiết |
|---|---|
| 🔴 Checkbox đồng ý khi đăng ký | **Không tick sẵn.** "Tôi đồng ý với [Điều khoản] và [Chính sách quyền riêng tư]" |
| 🔴 Nút **Xoá tài khoản và toàn bộ dữ liệu** | Trong Tài khoản. Xoá `auth.users` + cascade mọi bảng + file trong Storage. **Không được chỉ vô hiệu hoá.** Xác nhận bằng cách gõ lại tên vựa |
| 🔴 Xuất dữ liệu | ✅ đã có ([ProfilePage.tsx:47](src/pages/ProfilePage.tsx:47)) — giữ, nêu trong chính sách |
| 🔴 Link pháp lý | Trong Tài khoản + chân trang site |
| 🟡 Nhật ký truy cập hỗ trợ | Khi admin cần xem dữ liệu để hỗ trợ, ghi lại ai/khi nào/vì sao |

> Không cần thuê luật sư cho pilot. Một trang viết thật thà, **mô tả đúng những gì hệ thống thật sự làm**, là đủ ở giai đoạn này — và bắt buộc nếu sau này đưa lên Google Play. Điều nguy hiểm không phải là văn phong không chuyên nghiệp, mà là **viết một đằng hệ thống làm một nẻo**.

---

## 9. GIAO DIỆN

Toàn bộ theo [KE_HOACH_THIET_KE_LAI_FRONTEND.md](KE_HOACH_THIET_KE_LAI_FRONTEND.md) — không lặp lại ở đây. Vì dựng từ base nên **không còn "sửa lỗi", chỉ còn "làm đúng ngay từ đầu"**:

- §4 token màu, §17 bảng màu & 3 theme → viết vào `index.css` **trước khi** viết component đầu tiên
- §8 thư viện component → dựng trước khi viết trang đầu tiên
- §6 điều hướng & ma trận parity 18 dòng → chốt trước khi viết trang
- §16 từ vựng → tạo `src/i18n/labels.ts` ngay từ file đầu tiên, **không bao giờ viết chuỗi tiếng Việt thẳng vào JSX**
- §16.1 bốn lỗi L1–L4 → không tồn tại trong bản mới (không gieo seed, một quy ước số, có xác nhận/hoàn tác, đăng nhập linh hoạt)

**Thêm mới cho phần kinh doanh** (`src/billing/`): thẻ trạng thái gói trong Tài khoản · màn hình so sánh Free/Premium · màn hình QR thanh toán + hướng dẫn chuyển khoản có ảnh minh hoạ · banner nhắc còn *n* ngày dùng thử · banner hết hạn (nhắc nhở, **không chặn**) · **màn hình chạm hạn mức 30 phiếu** · **mã giới thiệu** (§15.3) · **chế độ trình diễn** có banner cảnh báo.

> Màn hình chạm hạn mức là điểm chuyển đổi quan trọng nhất của cả sản phẩm. Nó phải nói bằng lời của người dùng — *"Tháng này bác đã ghi 30 phiếu. Nâng cấp để ghi không giới hạn, xem công nợ và giữ dữ liệu trên đám mây"* — kèm con số cụ thể của chính họ, không phải bảng tính năng khô khan.

---

## 10. CHẤT LƯỢNG

| Hạng mục | Mức tối thiểu để phát hành |
|---|---|
| **Unit test `domain/`** | **Bắt buộc.** `calc` (4 công thức × biên) · `inventory` (dùng KL vật lý) · `pricing` · `taxReport` · round-trip `normalize()` v1→v3. Vitest |
| Test tầng `data/` | Hàng đợi offline: mất mạng giữa chừng · gửi lại · chống trùng |
| E2E | 1 luồng: đăng ký → tạo phiếu mua → thấy trong lịch sử → ghi trả nợ. Playwright |
| CI | GitHub Actions: `lint` + `typecheck` + `test` + `build` trên mỗi PR. Chặn merge nếu đỏ |
| Ràng buộc kiến trúc (kiểm tự động) | `domain/` không import React và không import `data/`; `pages/`+`components/` không import `data/storage` hay `localStorage`; không `alert/confirm/prompt`; không `parseFloat` ngoài `utils/` |

---

## 11. VẬN HÀNH

| Việc | Mức tối thiểu |
|---|---|
| Hỗ trợ | Zalo hiển thị trong app. Cam kết thời gian phản hồi **thật** ("trong ngày làm việc") — đừng hứa 24/7 khi chỉ có một người |
| Đặt lại mật khẩu thủ công | Script `service_role` + quy tắc xác minh (tên vựa + 2 giao dịch gần nhất). Ghi nhật ký mỗi lần |
| Kích hoạt gói thủ công | Script tương tự, cho trường hợp chuyển khoản sai nội dung |
| Theo dõi | Sentry (free) + dashboard Supabase, xem hằng tuần trong tháng đầu |
| Backup | Supabase tự động (gói trả phí) + **đã thử phục hồi ít nhất một lần trước khi phát hành** |
| Rollback | Vercel giữ mọi bản deploy — rollback frontend là một cú bấm. Migration DB phải viết kèm đường lùi |
| Phiên bản | Hiện số phiên bản trong Tài khoản để hỗ trợ từ xa |

---

## 12. CRITERIA ĐẦU RA & RÀNG BUỘC

### 12.1 Ràng buộc kỹ thuật (đúng/sai, kiểm được bằng lệnh)

- [ ] `domain/` không import React, không import `data/` — kiểm tự động trong CI
- [ ] `pages/` và `components/` không import `data/storage` hay `localStorage` trực tiếp
- [ ] Mọi bảng: có RLS · có `created_at`/`updated_at` · có `deleted_at` · id UUID do client sinh
- [ ] Mọi thay đổi schema nằm trong `supabase/migrations/*.sql` đã commit
- [ ] Bundle JS khởi tạo ≤ **250KB gzip**
- [ ] Trong bundle frontend chỉ có `anon key`; không có `service_role`, không có secret webhook
- [ ] `grep -rn "alert(\|confirm(\|prompt(" src/` → 0
- [ ] `grep -rn "slate-" src/` → 0 (đã dùng token màu)
- [ ] Không chuỗi tiếng Việt viết thẳng trong JSX — tất cả qua `i18n/labels.ts`
- [ ] Lighthouse mobile: Performance ≥ 85 · Accessibility ≥ 95 · PWA installable ✅
- [ ] Mọi cặp chữ/nền ≥ 4,5:1; chế độ Ngoài trời ≥ 7:1

### 12.2 Criteria sản phẩm

- [ ] 18/18 ô trong ma trận parity ([KH Frontend §6.3](KE_HOACH_THIET_KE_LAI_FRONTEND.md)) đều ✅ trên cả PC và mobile
- [ ] Tài khoản mới: **0 giao dịch, 0 nông hộ**, thấy màn hình chào
- [ ] Cùng một chuỗi số cho cùng một kết quả ở mọi ô nhập trong app
- [ ] Không hành động ghi tiền/xoá nào thực hiện được bằng một chạm không quay lại được
- [ ] Đăng ký + đăng nhập được **không cần email**
- [ ] Tạo phiếu trên điện thoại → thấy trên máy tính trong vòng 5 giây khi có mạng
- [ ] Tắt mạng → tạo 3 phiếu → bật mạng → **cả 3 lên đủ, không trùng, không mất**
- [ ] Hai máy cùng ghi trả nợ trên một phiếu khi offline → bật mạng → **cả hai khoản đều còn**
- [ ] **Thử với người thật:** 3 người 45–60 tuổi chưa từng thấy app, tự tạo được phiếu đầu tiên trong 3 phút, không ai chỉ

### 12.3 Criteria kinh doanh — "kiếm tiền được" nghĩa là gì

- [ ] Người dùng tự đi hết luồng: **thấy giá → bấm nâng cấp → quét QR → chuyển khoản → gói kích hoạt tự động**, không cần ai can thiệp
- [ ] Webhook idempotent: gọi lại 3 lần cùng một giao dịch → chỉ gia hạn **một** lần
- [ ] Gọi webhook không có chữ ký hợp lệ → bị từ chối
- [ ] Chuyển khoản sai nội dung → có đường thoát thủ công **đã thử thành công một lần**
- [ ] Hết hạn gói → ngừng đồng bộ nhưng **vẫn đọc, vẫn xuất file, vẫn dùng một máy được**
- [ ] Ghi khống `plan='sync'` từ client → **bị database từ chối** (kiểm bằng cách gọi thẳng API với anon key)
- [ ] Có trang giá công khai + Điều khoản + Chính sách quyền riêng tư, link được từ trong app
- [ ] Có chính sách hoàn tiền 7 ngày và **đã thử hoàn một lần**
- [ ] Lịch sử thanh toán + ngày hết hạn hiển thị trong Tài khoản
- [ ] **Đã thu được tiền thật từ một người không phải người quen** — đây là tiêu chí duy nhất chứng minh mô hình chạy

### 12.4 Criteria pháp lý

- [ ] Hai trang pháp lý đã xuất bản, nội dung **khớp với hành vi thật của hệ thống**
- [ ] Checkbox đồng ý khi đăng ký, không tick sẵn
- [ ] Nút xoá tài khoản + toàn bộ dữ liệu, **đã thử và xác nhận sạch** (kể cả file trong Storage)
- [ ] Bỏ tài khoản/mật khẩu demo khỏi bản production

---

## 13. LỘ TRÌNH

| Giai đoạn | Nội dung | Ước lượng | Chốt được gì |
|---|---|---|---|
| **A — Nền** | Dựng repo mới · bê `domain/` sang · **viết test `domain/`** · CI · token màu + `labels.ts` · thư viện component | **4–5 buổi** | Có nền không nợ kỹ thuật, và có bằng chứng phần tính tiền đúng |
| **B — Backend** | Hai project Supabase · migration files · schema đầy đủ (kể cả `payments`, `subscriptions`) · RLS + test chéo 2 tài khoản · `resolve_identifier` · Storage bucket | **3 buổi** | Backend đúng ngay từ đầu, không phải migrate lần hai |
| **C — Tầng data** | Client Supabase · cache cục bộ · hàng đợi offline bền · mapper camel↔snake · `useTransactionList` | **4 buổi** | Đồng bộ chạy thật, test được các kịch bản mất mạng |
| **D — App** | App shell · điều hướng · 4 màn cốt lõi (Tổng quan · Phiếu · Tạo phiếu · Chi tiết) · **thanh chip "Đang cân" cho nhiều khách cùng lúc** (KH Frontend §7.3.0) · biên nhận theo khổ 80mm | **7 buổi** | **Bản dùng được** |
| **E — Phần còn lại** | Công nợ · tồn kho · đối tác · mặt hàng & giá · báo cáo · tiện ích · tài khoản · onboarding | **4–5 buổi** | Đủ tính năng |
| **F — Kinh doanh** | `subscriptions` + `payment_intents` · phân tầng Free/Premium + hạn mức 30 phiếu · màn hình nâng cấp + QR · Edge Function webhook · script kích hoạt tay · **mã giới thiệu** · **nhập Excel cho dịch vụ setup** (§15.3) | **4 buổi** | **Thu được tiền** |
| **G — Site & pháp lý** | `site/`: landing + bảng giá + 2 trang pháp lý + hướng dẫn cài · link trong app · nút xoá tài khoản | **2 buổi** | Đủ điều kiện phát hành |
| **H — Kiểm & mở** | Rà 4 nhóm criteria §12 · Lighthouse · test iOS/Android thật · thử với 3 người lớn tuổi · thử phục hồi backup · mở cho 5–10 người quen 2 tuần | **3 buổi** | **Phát hành** |

**Tổng: 31–36 buổi.** So với phương án vá bản demo (~18–21 buổi + mang theo nợ cũ + vẫn phải làm B/C/F/G), chênh lệch thực tế nhỏ hơn con số nhìn thấy.

**Thứ tự không được đảo:** A trước B (test `domain/` là lưới an toàn cho mọi thứ sau đó) · B trước C (schema sai thì tầng data viết lại) · D+E trước F (chưa có sản phẩm thì bán cái gì) · G trước H.

---

## 14. RỦI RO

| Rủi ro | Mức | Xử lý |
|---|---|---|
| Dựng lại rồi bỏ dở giữa chừng, mất cả bản demo đang chạy | **Cao** | Repo mới là nhánh/thư mục riêng; **bản demo vẫn deploy và vẫn chạy** cho tới khi bản mới qua đủ criteria §12 |
| Bê `domain/` sang kèm sửa "cho tiện" → sai tiền âm thầm | **Cao** | Chuyển nguyên trạng → test phủ → mới sửa. Ba bước, ba commit riêng |
| Không ai chịu trả tiền | **Cao** | Hỏi giá **trước khi** xây phần F: đưa bảng giá cho 10 người dùng thật xem, đếm số người nói "sẽ trả". Dưới 3 thì phải xem lại mô hình chứ không phải xây tiếp |
| Đối soát tự động không chạy, khách trả tiền mà không được kích hoạt | Trung bình | Đường thoát thủ công **có ngay từ ngày đầu**, không phải phương án dự phòng làm sau |
| Chi phí vượt mức cân bằng | Thấp | Free không tốn máy chủ (§7.1). Theo dõi dashboard hằng tháng; ảnh chứng từ là hạng mục tăng nhanh nhất |
| Một mình làm 30 buổi, kiệt sức | Trung bình | Mỗi giai đoạn A–H là một mốc **tự nó có giá trị**, dừng ở đâu cũng không mất trắng |

---

## 14b. DANH MỤC HOÃN CÓ ĐIỀU KIỆN

> Mọi thứ bị hoãn đều phải có **điều kiện bật lại đo được**, nếu không nó sẽ bị quên. Đây là danh sách duy nhất — không hoãn thứ gì mà không ghi vào đây.

| Hạng mục | Vì sao hoãn | 🔔 Điều kiện bật lại | Chuẩn bị sẵn để không phải làm lại |
|---|---|---|---|
| **Máy in nhiệt** | Chưa rõ tỉ lệ chủ vựa thật sự dùng máy in; phần cứng làm phức tạp v1.0. *(Chốt 09/08: cập nhật sau khi triển khai một thời gian)* | Sau **1–2 tháng pilot**, hỏi 10 người dùng thật: nếu **≥4 người** nói cần in phiếu giấy đưa nông hộ → làm ngay ở bản tiếp theo | ① Biên nhận thiết kế theo khổ **80mm, đen trắng thuần, một cột** ngay từ đầu ② Hai nút kết thúc đặt tên để thêm "& in" mà không đổi bố cục (KH Frontend §7.3.1) |
| **Đăng nhập OTP-SMS** | Có chi phí tin nhắn; chưa cần ở quy mô pilot | **>200 người dùng hoạt động**, hoặc **>5 yêu cầu đặt lại mật khẩu/tuần** | Lớp `resolve_identifier()` đã tách sẵn — thêm phone OTP là thêm một nhánh, không đổi kiến trúc (§3.4) |
| **Pháp nhân + hoá đơn điện tử** | Chưa có hộ kinh doanh | Doanh thu năm chạm **~200 triệu**, **hoặc** khách đầu tiên đòi hoá đơn, **hoặc** **>50 người trả phí**. Mô hình tài chính CP4 dự phóng 331,6tr **ngay 2027** ⇒ thực tế là việc của 2027 | `payment_intents` đã tách khỏi logic nhận tiền — đổi tài khoản nhận và thêm bước phát hành hoá đơn, không đụng schema (§7.4) |
| **Đối soát tự động Casso/SePay** | 50–100k/tháng, chưa đáng khi ít khách | **>10 khách trả phí/tháng** (kích hoạt tay bắt đầu tốn thời gian) | Edge Function `payment-webhook` viết sẵn từ giai đoạn F; ban đầu chỉ chạy đường thủ công |
| **Tách bảng `attachments`** | Mảng `attachment_ids` đủ dùng ở quy mô nhỏ | Khi một người dùng vượt **~2.000 phiếu có ảnh** hoặc bắt đầu thấy xung đột khi thêm ảnh từ 2 máy | Đã ghi vào nợ kỹ thuật (§3.3) |
| **B2B Partnership** | CP4 đặt mốc **2028** | Theo lộ trình CP4 §11.1 | Không nhét dữ liệu quảng cáo vào bảng nghiệp vụ (§7.2b) |
| **Capacitor / Google Play** | PWA đủ cho pilot | Khi cài PWA trở thành rào cản thật — đo bằng số người bỏ cuộc ở bước "thêm vào màn hình chính" | Không có gì trong kiến trúc chặn việc bọc Capacitor |

---

## 15. ĐỐI CHIẾU VỚI PROPOSAL CP4 (đã duyệt)

> Nguồn: `CP4.docx` — EXE101_SU26_MKT1906, nhóm THUMUA365, GVHD Trần Chiều An. Quyết định: **Persevere**.
> Khi tài liệu kỹ thuật mâu thuẫn với proposal về **định vị, mô hình kinh doanh, giá, phạm vi cam kết** → **proposal thắng**. Về **cách thực thi kỹ thuật** → tài liệu kỹ thuật thắng.

### 15.1 Bảy module MVP trong proposal → route trong sản phẩm

| CP4 §5.2 | Route | Trạng thái |
|---|---|---|
| Module 1 — Business Dashboard | `/` | ✅ có, thiết kế lại (KH Frontend §7.1) |
| Module 2 — Procurement Management | `/new`, `/history`, `/drafts`, `/receipt/:id` | ✅ có — **module lõi**, ưu tiên cao nhất |
| Module 3 — Seller Management | `/suppliers` | ✅ có |
| Module 4 — Debt Management | `/debts` | ✅ có → **chuyển thành tính năng Premium** (§7.1) |
| Module 5 — Analytics & Reporting | trong `/` + `/reports` | ✅ có |
| Module 6 — Utility Tools (máy tính, ghi chú) | `/utilities` | ✅ có |
| Module 7 — Data Export (Excel, PDF) | trong `/history`, `/reports` | ✅ có → **chuyển thành tính năng Premium** (§7.1) |

**Đã xây thêm ngoài 7 module của proposal:** phiếu bán (`/sales`), người mua (`/buyers`), tồn kho (`/inventory`), quy tắc giá (`/pricing`), báo cáo thuế (`/reports`).

> ⚠️ **Điểm cần giữ kỷ luật.** Proposal §5.3 và §6 nói rất rõ điểm khác biệt của sản phẩm là **"Instead of providing dozens of unnecessary features, the platform is intentionally designed around the procurement workflow"**. Sản phẩm đang trôi ngược hướng đó. Cách xử lý: **giữ các tính năng đã xây** (chúng có giá trị thật và đã tốn công), nhưng **kiến trúc thông tin phải làm cho thu mua nổi bật không thể nhầm lẫn** — đúng như [KH Frontend §6](KE_HOACH_THIET_KE_LAI_FRONTEND.md) đã thiết kế: thu mua chiếm nút FAB và 2 slot đầu của thanh dưới, các thứ còn lại lùi về nhóm phụ. **Không thêm tính năng lớn nào nữa trước khi phát hành v1.0.**

### 15.2 Những chỗ kế hoạch cũ của tôi lệch với proposal — đã sửa

| Hạng mục | Kế hoạch cũ của tôi | **Proposal (đã duyệt)** | Chốt |
|---|---|---|---|
| Giới hạn bản Free | Không giới hạn số phiếu | "Limited procurement records" | ✅ **Theo proposal** — 30 phiếu/tháng, có lập luận ở §7.1 |
| Công nợ | Free | Premium | ✅ **Theo proposal** |
| Xuất Excel/PDF | Free | Premium | ✅ **Theo proposal** |
| Giá | 99.000đ/tháng | **149.000đ** (mô hình tài chính §11.1) | ✅ **149.000đ** |
| Gói năm | 890.000đ | không nêu | Giữ đề xuất, chỉnh thành 1.490.000đ cho khớp giá tháng |
| Nguồn thu | 1 (subscription) | **3** (+ setup service, + B2B 2028) | ✅ **Bổ sung** — §7.2b |
| Dùng thử 30 ngày | Có | không nêu | Giữ — cần thiết để khách vượt hạn mức 30 phiếu |

**Chỗ kế hoạch kỹ thuật và proposal khớp nhau sẵn:** cloud sync + automatic backup là tính năng Premium (§9 proposal) ↔ kiến trúc "free chạy local, premium chạm máy chủ" (§7.1) — hai bên độc lập đi tới cùng một kết luận. Đây là dấu hiệu tốt: mô hình giá không phải gán ghép mà mọc ra từ chính hình dạng của sản phẩm.

### 15.3 Yêu cầu sản phẩm MỚI phát sinh từ proposal

Ba thứ proposal cam kết mà kế hoạch kỹ thuật chưa có:

| # | Yêu cầu | Nguồn | Làm ở |
|---|---|---|---|
| 1 | 🔴 **Nhập dữ liệu từ Excel/CSV** — danh sách nông hộ và phiếu cũ | §11.1 "data migration for new traders" là một nguồn thu | Giai đoạn F |
| 2 | 🔴 **Chương trình giới thiệu (referral)** — mã giới thiệu, theo dõi ai mời ai, thưởng | §10 liệt kê "Referral Program" là một kênh acquisition chính | Giai đoạn F |
| 3 | 🟡 **Chế độ trình diễn (demo mode)** — bật dữ liệu mẫu để giới thiệu tại chỗ, tách bạch hoàn toàn với dữ liệu thật | §10 "Direct Demonstrations at procurement sites" | Giai đoạn A (gắn với lỗi L1 — dữ liệu mẫu chỉ dành cho demo) |

Yêu cầu #3 giải quyết đẹp một mâu thuẫn: lỗi **L1** bảo *"bỏ dữ liệu mẫu"*, còn kế hoạch marketing lại *cần* dữ liệu mẫu để đi trình diễn. Lời giải không phải chọn một, mà là **tách bạch**: tài khoản thật luôn rỗng; dữ liệu mẫu chỉ nạp khi bấm "Xem thử dữ liệu mẫu", luôn kèm banner đỏ và nút "Xoá hết, bắt đầu thật".

### 15.4 Định vị & thương hiệu — ràng buộc cho mọi quyết định thiết kế

Proposal §2 chốt câu định vị:

> *"The digital procurement logbook built by understanding traders, not forcing traders to change."*

Đây không phải khẩu hiệu marketing suông — nó là **tiêu chí phân xử** cho mọi tranh cãi thiết kế, và nó xác nhận toàn bộ [KH Frontend §16](KE_HOACH_THIET_KE_LAI_FRONTEND.md) (bảng từ vựng, Numpad làm mặc định, hiển thị dần, hướng dẫn lần đầu). Mỗi khi phân vân, hỏi: *cái này bắt chủ vựa đổi thói quen, hay app đổi theo họ?*

### 15.5 Bối cảnh đội ngũ — hai điều chỉnh về cách làm việc

Proposal §8 cho thấy đây **không phải dự án một người**:

| Thành viên | Vai trò | Ảnh hưởng tới kế hoạch này |
|---|---|---|
| Mai Quang Tuyến | **UI/UX Designer** — logo, giao diện, nhận diện thị giác | 🔴 **Toàn bộ §17 (màu sắc & theme) của KH Frontend là đề xuất kỹ thuật, không phải quyết định.** Đổi hệ màu và nhận diện là phần việc của Tuyến — phải trao đổi và thống nhất trước khi đưa vào `index.css`, không tự quyết |
| Nguyễn Lê Hữu Khôi | Prototype Developer (front-end) | Có thể chia việc ở giai đoạn D–E; ranh giới component trong KH Frontend §8 giúp hai người làm song song không đụng nhau |
| Trần Nguyễn Đăng Nguyên | Project Leader & Business Development | Chủ trì việc **kiểm chứng mức sẵn sàng trả tiền** trước giai đoạn F (rủi ro số 3 ở §14) và tiếp cận 3 khách đã phỏng vấn |
| Bùi Nguyễn Nhật Linh | Business Strategy & Finance | Chủ mô hình tài chính — **mọi thay đổi về giá phải qua đây**, vì báo cáo P&L xây trên mức 149.000đ |

**Việc cần chốt với cả nhóm trước khi bắt đầu giai đoạn A:** hạn mức 30 phiếu/tháng cho bản Free (ảnh hưởng tỉ lệ chuyển đổi trong mô hình tài chính) và hệ màu mới (ảnh hưởng nhận diện thương hiệu). Hai thứ này tôi đề xuất được, nhưng không nên quyết một mình.

### 15.6 Đối thủ — cập nhật theo proposal

Proposal §6 nêu ba đối thủ: **TTVSoft** (ERP nông nghiệp), **Soft Việt** (quản lý thu mua, thiên desktop), **Muamu** (app thu mua **cao su**, mobile-first).

> **Muamu là đối thủ gần nhất và đáng nghiên cứu nhất** — cùng mobile-first, cùng giao diện hướng thương lái, chỉ hẹp hơn ở chỗ chỉ phục vụ cao su. Điểm hơn của THUMUA365 theo proposal là **đa nông sản + báo cáo + đám mây**. Nên tải Muamu về dùng thật trước khi chốt thiết kế màn hình tạo phiếu — đó là chuẩn UX gần nhất mà khách hàng mục tiêu có thể đã quen.

### 15.7 Bổ sung vào criteria đầu ra (§12)

- [ ] Bản Free chặn đúng ở phiếu thứ 31 trong tháng, kèm màn hình nâng cấp giải thích rõ ràng
- [ ] Người dùng Free **không** truy cập được công nợ, xuất file, đồng bộ — và bị **database** từ chối khi gọi thẳng API
- [ ] Giá hiển thị trong app và trên trang giá đều là **149.000đ/tháng**, khớp mô hình tài chính
- [ ] Nhập được file Excel danh sách nông hộ + phiếu cũ (phục vụ dịch vụ setup có thu phí)
- [ ] Mã giới thiệu hoạt động: A mời B, B đăng ký, hệ thống ghi nhận đúng
- [ ] Chế độ trình diễn bật/tắt được, **không bao giờ lẫn với dữ liệu thật**
- [ ] Bảy module trong proposal §5.2 đều dùng được trên cả PC và điện thoại
- [ ] **Cân 3 khách xen kẽ**: mở 3 phiếu, chuyển qua lại, mỗi phiếu giữ đúng số của mình, hoàn thành từng cái — không lẫn dòng hàng, không mất số, chip biến mất đúng lúc
- [ ] Chuyển giữa các khách đang cân **chỉ tốn một chạm** và không mất dữ liệu đang gõ dở

---

*Tài liệu này là kế hoạch thi công cho bản v1.0 phát hành thật. Phần giao diện đọc [KE_HOACH_THIET_KE_LAI_FRONTEND.md](KE_HOACH_THIET_KE_LAI_FRONTEND.md); phần hạ tầng và schema đọc [KE_HOACH_TRIEN_KHAI_DEPLOY.md](KE_HOACH_TRIEN_KHAI_DEPLOY.md); phần định vị, mô hình kinh doanh và cam kết phạm vi đọc `CP4.docx` (proposal đã duyệt). Khi tài liệu kỹ thuật mâu thuẫn với proposal về kinh doanh → proposal thắng; về kỹ thuật → tài liệu này thắng.*
