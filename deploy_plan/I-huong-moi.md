# HƯỚNG MỚI — đối chiếu sơ đồ kiến trúc Mambo365 / THUMUA365 với repo

Ngày lập: **21/09/2026** · Đầu vào: sơ đồ "Kiến trúc Backend" (NestJS · Prisma/TypeORM ·
PostgreSQL + PostGIS · Supabase · Docker · Prometheus/Grafana) và năm yêu cầu phát hành.

> **Kết luận một dòng:** code đã đủ cho 4/5 yêu cầu, nhưng **chưa chạy thật lần nào** —
> chưa có project Supabase, chưa deploy, chưa có remote git. Việc gấp nhất là **đưa lên
> môi trường thật**, không phải viết lại sang NestJS. Yêu cầu duy nhất thiếu hẳn code là
> **đo lường**, và nó đang **mâu thuẫn trực tiếp** với trang Quyền riêng tư đã viết.

---

## 1. Sơ đồ mới so với repo hiện tại

✅ có và đúng · 🟡 có một phần / có code nhưng chưa chạy thật · ❌ chưa có

### 1.1 Người dùng & client

| Hạng mục trên sơ đồ | Hiện trạng | Ghi chú |
|---|---|---|
| Thương lái / chủ vựa | ✅ | Toàn bộ app xây cho vai trò này |
| Nông dân (tự đăng nhập, bán, xem công nợ) | ❌ | Hiện nông dân là **đối tác không đăng nhập** (`suppliers`) — đúng với ô "Danh bạ (không đăng nhập)" của Partner Module |
| Doanh nghiệp (nhân viên, chi nhánh) | ❌ | Mọi bảng khoá theo `user_id` — một tài khoản = một sổ |
| React + TypeScript, responsive | ✅ | 375px / 320px không cuộn ngang ở mọi route |
| PWA offline + cache | ✅ | `vite-plugin-pwa` + IndexedDB |
| Android (Capacitor — deferred) | ❌ | Không có thư mục `android/`. **Bắt buộc** cho yêu cầu CH Play (xem §4) |

### 1.2 Backend

| Hạng mục | Hiện trạng | Tương đương đang dùng |
|---|---|---|
| NestJS (API layer, DTO, Guards, Interceptors, Filters) | ❌ | Client gọi thẳng Supabase (PostgREST). **RLS** thay Guards, `check` constraint thay DTO validation, 1 Edge Function (`payment-webhook`) |
| Auth & User Module | 🟡 | `data/auth.ts`: đăng ký/đăng nhập bằng SĐT/tên/email, đổi mật khẩu, xoá tài khoản. **Chưa chạy với Supabase thật.** Không có vai trò, không có tổ chức |
| Organization Module | ❌ | — |
| Transaction Module | 🟡 | Phiếu mua/bán ✅, phiếu cân ✅ · **giao hàng ❌ · đặt lịch ❌** |
| Inventory Module | 🟡 | Tồn kho, giá vốn bình quân ✅ (suy ra từ phiếu) · **lô hàng ❌** |
| Debt & Finance Module | ✅ | Bảng `payments` chỉ ghi thêm, công nợ phải thu/phải trả, quá hạn |
| Partner Module | ✅ | Nhà cung cấp / người mua, `tel:`, ghi chú |
| Report Module | ✅ | Báo cáo tháng, thuế, xuất Excel/PDF/PNG |
| Notification Module | ❌ | Chỉ có nhắc bổ sung email trong app |
| Data Access (Prisma/TypeORM, Repository) | ❌ | `supabase-js` + `data/mappers.ts` + hàng đợi |
| PostgreSQL | 🟡 | 10 migration, RLS mọi bảng — **chưa từng chạy qua Postgres** |
| PostGIS / Geospatial | ❌ | — |
| Supabase Auth · Storage | 🟡 | Có code + migration `0007_storage` |
| Supabase Realtime | ❌ | Hoãn có chủ đích (NOTES "Sau v1.0") |
| Client offline: IndexedDB, queue, sync | ✅ | Điểm mạnh nhất của repo — 7 kịch bản có test tự động |

### 1.3 Dịch vụ ngoài & vận hành

| Hạng mục | Hiện trạng | Ghi chú |
|---|---|---|
| Ngân hàng — webhook thanh toán | 🟡 | `supabase/functions/payment-webhook` đọc Casso/SePay, chống trùng, khớp số tiền. **Chưa deploy**, số tài khoản trong `config.ts` là `0000000000` |
| Map / Location | ❌ | — |
| Email / SMS | ❌ | — |
| Export Excel/PDF | ✅ | Nạp động |
| Docker | ❌ | Không cần khi còn Supabase + Vercel |
| CI/CD | 🟡 | Có `ci.yml`, nhưng **chỉ chạy khi push `main` — nhánh thật là `master`**. Chưa có remote nên CI chưa chạy lần nào. Không có bước deploy |
| Monitoring & Logging | ❌ | Sentry nằm trong kế hoạch H, chưa gắn |
| Backup | 🟡 | Supabase có sẵn; **chưa thử phục hồi** |
| Security: HTTPS · RLS · Audit log | 🟡 | RLS ✅, `admin_access_log` ✅, HTTPS sẽ có khi lên Vercel |

---

## 2. Năm yêu cầu phát hành — đang ở đâu, còn thiếu gì

| # | Yêu cầu | Code | Chạy thật | Việc còn lại |
|---|---|---|---|---|
| R1 | Đăng ký & đăng nhập bằng tài khoản thật | ✅ | ❌ | Dựng Supabase, push migration, cấu hình Auth, gắn env lên Vercel |
| R2 | Luồng tạo giá trị chính từ đầu đến cuối | ✅ | 🟡 chỉ cục bộ | Chạy trên tài khoản thật + đồng bộ 2 máy; E2E Playwright (kế hoạch có, chưa cài) |
| R3 | Thanh toán / ghi nhận giao dịch cho ≥10 người trả phí | ✅ | ❌ | Điền số tài khoản thật, deploy webhook hoặc kích hoạt tay, chạy 10 mục VAN_HANH §7.3 |
| R4 | Màn hình liên hệ + chính sách quyền riêng tư | 🟡 | ❌ | Liên hệ chỉ nằm trong Tài khoản (phải đăng nhập), quyền riêng tư chỉ là link ra site chưa deploy, site còn 10 chỗ `ĐIỀN:` |
| R5 | Công cụ đo lường, tên sự kiện rõ ràng | ❌ | ❌ | Chưa có gì; trang Quyền riêng tư đang hứa "**không có công cụ thống kê**" |

### R1 — Đăng ký / đăng nhập thật

- [ ] Tạo **2 project Supabase** (staging, prod) — `supabase/VAN_HANH.md` §1.
- [ ] `supabase db push` 10 migration lên staging; chạy `supabase/checks/rls-coverage.sql`.
- [ ] Cấu hình Auth theo VAN_HANH §3. 🔴 **Bắt buộc tắt xác nhận email**: `signUp()` ghi
      `profiles` ngay sau `auth.signUp`, nếu bật xác nhận thì chưa có phiên ⇒ RLS chặn ⇒
      người dùng có tài khoản mà không có hồ sơ.
- [ ] `npm run db:types`, thay `data/rows.ts` viết tay bằng kiểu sinh ra, sửa chỗ lệch.
- [ ] Nghiệm thu: đăng ký bằng SĐT · bằng email · đăng nhập sai (cùng một câu lỗi) · đổi
      mật khẩu · "đưa sổ của máy vào tài khoản" · xoá tài khoản (kiểm cả Storage).

**Xong khi:** một người ngoài nhóm tự đăng ký trên bản deploy, đăng xuất, đăng nhập lại
trên máy khác và thấy đúng sổ của mình.

### R2 — Luồng giá trị chính

Luồng chính của sản phẩm là: **đăng ký → tạo phiếu thu mua → trả đủ hoặc ghi nợ → xem
biên nhận / chia sẻ → trả nợ ở màn Công nợ**. Đã chạy được cục bộ ở D/E.

- [ ] Chạy trọn luồng trên staging với tài khoản thật, 2 thiết bị, có một đoạn mất mạng
      (7 kịch bản VAN_HANH §6).
- [ ] Cài `@playwright/test`, viết **đúng một** E2E cho luồng trên, chạy trong CI.
- [ ] "Đặt lịch" và "giao hàng" trên sơ đồ **không** thuộc luồng này — không làm cho đợt
      phát hành (xem §3).

**Xong khi:** E2E xanh trong CI trỏ staging, và 7 kịch bản đồng bộ đã tick trên máy thật.

### R3 — Thanh toán / ghi nhận giao dịch

Đã có: bảng giá Free/Premium (149.000đ/tháng · 1.490.000đ/năm), mã chuyển khoản riêng
mỗi người, QR VietQR, webhook Casso/SePay, script `admin-activate.ts` có nhật ký.

- [ ] Nhóm chốt **số tài khoản nhận tiền** → điền `config.ts` (VAN_HANH §7.1).
- [ ] 10 khách đầu **được phép kích hoạt tay** (MEMORY "Việc còn treo"). Deploy webhook
      khi có Casso/SePay; không cần để đạt R3.
- [ ] Chạy 10 mục VAN_HANH §7.3, trong đó có **một lần chuyển khoản thật đi hết luồng** và
      một lần hoàn tiền.
- [ ] Câu truy vấn đếm người trả phí (bằng chứng cho R3), lưu ở `supabase/checks/`:
      người có `subscriptions` còn hạn và có dòng `bank_transactions` hoặc lần kích hoạt tay
      được ghi nhật ký.
- [ ] ⚠️ Cổng chặn 2 (≥3/10 người nói "sẽ trả") **vẫn chưa có bằng chứng**. Nên làm song
      song với R1, vì nếu dưới 3 thì cái phải sửa là giá chứ không phải code.

**Xong khi:** câu truy vấn trên trả về **≥10**.

### R4 — Liên hệ & quyền riêng tư

CH Play đòi **URL chính sách công khai**, **đường dẫn trong app**, và **đường xoá tài khoản
trên web** (không chỉ trong app).

- [ ] Route mới **`/lien-he`** trong app, mở được **cả khi chưa đăng nhập** (link từ màn Đăng
      nhập): Zalo, gọi điện, email, giờ trực, phiên bản app. Tách phần kênh liên lạc khỏi
      `SupportCard` để hai chỗ dùng chung.
- [ ] Sửa link Zalo: hiện là `tel:` nhưng nhãn ghi "Zalo" ⇒ thêm `https://zalo.me/<số>`
      cạnh nút gọi.
- [ ] Liên kết "Quyền riêng tư" và "Điều khoản" ở chân màn Đăng nhập/Đăng ký và trong
      `/lien-he`.
- [ ] Điền 10 chỗ `ĐIỀN:` (Nguyên: chủ thể, địa chỉ, email; Tài: vùng máy chủ, ảnh) →
      `npm run site:check` xanh → deploy `site/` lên `thumua365.vn`.
- [ ] Thêm trang `site/xoa-tai-khoan.html`: các bước xoá trong app + cách yêu cầu xoá qua
      Zalo/email khi không vào được app.
- [ ] Cập nhật trang Quyền riêng tư cho R5 (mục "đo lường") **trong cùng PR** với R5.

**Xong khi:** từ màn Đăng nhập, chưa có tài khoản, bấm được tới Liên hệ và Quyền riêng tư;
URL chính sách mở được công khai và không còn chữ `ĐIỀN:`.

### R5 — Đo lường

**Mâu thuẫn phải xử lý trước:** `site/quyen-rieng-tu.html` dòng 84 hứa "không có công cụ
thống kê". Gắn GA4/Firebase là biến câu đó thành sai — đúng loại lỗi giai đoạn G đặt ra để
tránh ("viết một đằng hệ thống làm một nẻo").

**Đề xuất: đo lường first-party trên chính Supabase.**

| | First-party (đề xuất) | Firebase / GA4 |
|---|---|---|
| Thêm thư viện | Không | Có (~30–60KB) |
| Bên thứ ba thấy dữ liệu | Không | Google |
| Chạy khi mất mạng | Có — đi chung hàng đợi hiện có | Có hàng đợi riêng |
| Sửa trang pháp lý | Thêm một mục "đo lường ẩn danh" | Viết lại mục bên thứ ba + Data safety phức tạp hơn |
| Xem số liệu | SQL view / Supabase dashboard | Dashboard có sẵn |

Thiết kế, theo đúng ranh giới tầng:

- `core/analyticsEvents.ts` — **danh mục sự kiện** là một union type + kiểu thuộc tính cho
  từng sự kiện. Tên sai hoặc thiếu thuộc tính ⇒ lỗi biên dịch.
- Migration `0011_do_luong.sql` — bảng `analytics_events(id uuid, user_id uuid null,
  anon_id text, name text, props jsonb, app_version text, platform text, created_at)`;
  RLS **chỉ insert**, không ai đọc qua API; `check` giới hạn kích thước `props`.
- `data/analytics.ts` — `track()` đẩy vào hàng đợi hiện có (ghi cục bộ trước, lên sau);
  lộ ra qua `useStore().track` để `features/` không import `data/` trực tiếp.
- `supabase/checks/funnel.sql` — phễu: `sign_up_completed → receipt_created (lần đầu) →
  checkout_started → plan_activated`, và số người hoạt động theo tuần.

**Quy ước tên:** `đối_tượng_hành_động` · tiếng Anh · `snake_case` · động từ ở thể đã xong.
**Không bao giờ** gửi tên, SĐT, email, tên đối tác, số tiền cụ thể (chỉ gửi khoảng).

| Sự kiện | Thuộc tính | Bắn ở đâu |
|---|---|---|
| `app_opened` | `platform: web\|pwa\|android` | `main.tsx` |
| `sign_up_completed` | `method: phone\|email`, `has_referral` | `AuthPage` |
| `login_succeeded` / `login_failed` | — | `AuthPage` |
| `receipt_created` | `kind: buy\|sell`, `line_count`, `settled: paid\|debt\|partial`, `offline` | `CreateReceiptPage` |
| `receipt_shared` | `format: png\|pdf` | `ReceiptDetailPage` |
| `debt_payment_recorded` | `full: bool` | `usePayDebt` |
| `import_completed` | `row_bucket: 1-50\|51-500\|500+` | `ImportDataPage` |
| `quota_wall_shown` | — | `QuotaWall` |
| `plans_viewed` | `source` | `PlansPage` |
| `checkout_started` | `plan: monthly\|yearly` | `PaymentQrDialog` |
| `plan_activated` | `source: webhook\|manual` | ghi phía server (webhook / `admin-activate.ts`) |
| `contact_clicked` | `channel: zalo\|phone\|email` | `/lien-he` |
| `account_deleted` | — | `DeleteAccountCard` (ghi trước khi xoá, `user_id` null) |

Lỗi runtime: gắn **Sentry** theo kế hoạch H — là bên thứ ba, phải khai trên trang pháp lý
và trong Data safety.

**Xong khi:** mỗi sự kiện trong bảng có test ở `core/` cho kiểu và một lần thấy dòng thật
trong bảng staging; `funnel.sql` trả số đúng với thao tác vừa làm.

---

## 3. Về NestJS — đề xuất: chưa viết lại, thêm dần sau khi phát hành

> **Cập nhật 21/09/2026:** nhóm đã chọn chuyển sang NestJS theo sơ đồ. Kế hoạch thi công
> backend ở [BE-backend-nestjs.md](BE-backend-nestjs.md). Phần dưới giữ lại làm lý do
> vì sao kế hoạch đó đi theo kiểu strangler và giữ nguyên đường đồng bộ offline.

**Không yêu cầu nào trong năm mục cần NestJS.** Viết lại bây giờ thì:

1. **Mất đường đồng bộ offline** — hàng đợi hiện ghi thẳng PostgREST với `upsert
   ignoreDuplicates` và RLS. Đi qua NestJS phải viết lại idempotency, merge payments theo
   id, thứ tự `seq`… tức là chép lại chính những lỗi mất tiền mà C/D đã sửa.
2. **Prisma/TypeORM bỏ qua RLS** (kết nối bằng một role Postgres), nên mọi luật "ai thấy gì"
   phải chuyển sang Guards — hai hàng rào cho cùng một luật, dễ lệch.
3. Cần thêm server chạy 24/7, Docker, giám sát — một người làm, không có tiền, trước khi có
   khách trả tiền.
4. Ước lượng thô **15–25 buổi**, trong khi năm yêu cầu cần khoảng **10–12 buổi** trên stack
   hiện tại.

**Cách đi tới sơ đồ mà không phá cái đang có (strangler):**

- NestJS dựng **cạnh** Supabase, dùng chung Postgres, xác thực bằng **JWT của Supabase**
  (không làm auth riêng).
- Đường ghi offline của sổ **giữ nguyên** đi thẳng Supabase. NestJS chỉ nhận những module
  RLS/Edge Function làm không tốt.
- Thứ tự module và **điều kiện bật lại** (ghi sang danh mục hoãn §14b):

| Module sơ đồ | Bật khi |
|---|---|
| Organization (nhân viên, chi nhánh) | Có ≥1 khách trả tiền cần cho ≥2 người cùng ghi một sổ |
| Notification (Zalo/SMS/email nhắc nợ) | ≥30% khách hoạt động dùng Công nợ hằng tuần |
| Webhook ngân hàng chuyển từ Edge Function | Khi đã có NestJS vì lý do khác — không dựng NestJS chỉ để làm việc này |
| Nông dân tự đăng nhập | Sau Organization — nông dân xem công nợ là "được mời vào sổ của vựa" |
| Đặt lịch / giao hàng / lô hàng | Có ≥3 khách yêu cầu cùng một thứ |
| Map / PostGIS | Có câu hỏi nghiệp vụ cần toạ độ (vùng trồng, tuyến thu mua) |
| Docker, Prometheus/Grafana | Khi NestJS lên production — trước đó Vercel + Supabase dashboard + Sentry là đủ |

⚠️ Sơ đồ mới vượt luật README §3.6 ("không thêm tính năng lớn ngoài 7 module CP4 trước
v1.0"). **Nhóm phải quyết**: giữ luật (đề xuất) hay đổi phạm vi v1.0.

---

## 4. Lên CH Play

- **Đề xuất: TWA (Trusted Web Activity) bằng Bubblewrap** — bọc đúng PWA đã có, không đổi
  một dòng app, cập nhật theo web. Capacitor để sau, khi cần API native (camera nền, thông
  báo đẩy) — khớp chữ "deferred" trên sơ đồ.
- Cần: `public/.well-known/assetlinks.json` trên domain app, icon/màn chờ, khoá ký giữ cẩn
  thận (mất khoá = không cập nhật được app).
- Hồ sơ Play Console: URL chính sách (R4), **URL xoá tài khoản** (R4), khai **Data safety**
  (khớp R5), phân loại nội dung, ảnh chụp.
- 🔴 **Lịch:** tài khoản nhà phát triển **cá nhân** mới phải chạy **thử nghiệm kín với ≥12
  người trong 14 ngày liên tục** trước khi được xin phát hành chính thức (kiểm lại điều
  khoản hiện hành lúc đăng ký). ⇒ Nên **nộp bản thử nghiệm kín sớm nhất có thể**, và dùng
  chính nhóm pilot làm 12 người thử.

---

## 5. Lộ trình

| Bước | Việc | Buổi | Phụ thuộc | Đạt |
|---|---|---|---|---|
| 0 | Remote GitHub · sửa `ci.yml` `main` → `master` · Vercel · 2 project Supabase | 1 | — | nền |
| 1 | Migration lên staging, Auth, kiểu sinh, nghiệm thu tài khoản | 2 | 0 | **R1** |
| 2 | `/lien-he`, link pháp lý ở màn Đăng nhập, `xoa-tai-khoan.html`, điền `ĐIỀN:`, deploy site | 2 | 0 + người điền | **R4** |
| 3 | Đo lường first-party + sửa trang Quyền riêng tư cùng PR | 2 | 1 | **R5** |
| 4 | Playwright E2E + 7 kịch bản đồng bộ trên máy thật | 2 | 1 | **R2** |
| 5 | Số tài khoản thật, §7.3, chuyển khoản thật, câu truy vấn đếm | 1–2 | 1 | R3 (luồng) |
| 6 | TWA + Play Console + **bắt đầu thử nghiệm kín 14 ngày** | 1–2 | 2, 3 | CH Play |
| 7 | Pilot (= 12 người thử kín) → thu tiền → đếm ≥10 | 2–4 tuần | 5, 6 | **R3** (số) |
| 8 | Prod: backup đã thử phục hồi, Sentry, Lighthouse → phát hành | 2 | 7 | — |

Bước 2 chạy song song với bước 1. Bước 6 càng sớm càng tốt vì đồng hồ 14 ngày là thứ duy
nhất trong lộ trình không rút ngắn được bằng làm nhanh.

---

## 6. Nhóm cần quyết trước khi bắt đầu

1. **NestJS:** làm sau phát hành theo §3 (đề xuất) hay viết lại ngay?
2. **Đo lường:** first-party (đề xuất) hay Firebase/GA4?
3. **Android:** TWA (đề xuất) hay Capacitor ngay?
4. **Phạm vi v1.0:** giữ luật §3.6 hay đưa Organization / nông dân đăng nhập vào v1.0?
5. **Số tài khoản nhận tiền** và **người chịu trách nhiệm pháp lý** trên trang chính sách.
