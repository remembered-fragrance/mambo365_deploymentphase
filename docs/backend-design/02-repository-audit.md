# 2. Repository audit

Đọc source tại `D:/EXE201/mambo365_deploymentphase/` ngày **18/09/2026**. Không in secret. Không chạy migration. `npm test` trên máy này **thất bại** vì `vitest` không có trên PATH (`node_modules` chưa cài) — **chưa xác minh runtime local**. Không có bằng chứng production từ session này.

Quy ước nhãn: **code** = có trong git/working tree; **test** = có file test; **local-run** = đã chạy lệnh thành công session này; **deployed** = có cấu hình/mô tả môi trường; **prod-verified** = có bằng chứng đối soát trên dữ liệu thật.

## 2.1 Bảng hiện trạng

| Phần | Bằng chứng | Nhãn | Ý nghĩa thiết kế |
|---|---|---|---|
| React 19, TS, Vite 8, Tailwind 4, React Router 7 | `package.json`, `src/App.tsx` | code | Tái sử dụng frontend thương lái |
| PWA (vite-plugin-pwa, workbox) | `vite.config.ts` | code | Web app; **không** phải Android đã phát hành |
| Supabase JS client | `src/data/client.ts`, `src/data/auth.ts` | code | Auth + REST; frontend ghi trực tiếp bảng nghiệp vụ |
| Hồ sơ không có role/tổ chức | `src/core/types.ts` `UserProfile`; `0002_ho_so.sql` | code | Chỉ name/username/phone/recovery_email/business_name |
| Sổ mua+bán, cân, công nợ, tồn | `src/core/`, `features/receipt*`, `debts`, `inventory` | code + test files | Giữ luồng thương lái; tồn theo `productName` |
| Đối tác tự ghi | `suppliers`, `buyers`; routes `/nong-ho`, `/nguoi-mua` | code | Contacts, không phải user đăng nhập |
| IndexedDB + queue + sync | `localDb.ts`, `queue.ts`, `sync.ts`, `pullChanges.ts`, `store.tsx` | code + `tests/data/*` | Phải thay protocol khi có tenant |
| SQL migrations 0001–0010 + RLS `user_id` | `supabase/migrations/` | code | Kế thừa; tenancy mới không nhét vào `user_id` |
| Gói phần mềm + webhook ngân hàng | `src/data/billing.ts`, `supabase/functions/payment-webhook/index.ts`, `0004`/`0008` | code | **Khác** tiền mua nông sản |
| Excel/PDF/ảnh phiếu | `src/export/*` | code | Giữ hành vi xuất |
| Test nghiệp vụ | `tests/core/*` (29) + `tests/data/*` (3) + 1 feature | test files; **chưa local-run session này** | Tái sử dụng công thức tiền/kho |
| `database.types.ts` | glob: không có | thiếu | Types chưa gen vào repo |
| NestJS / `apps/api` | không có | thiếu | Xây mới |
| PostGIS / tọa độ | không có trong SQL hay `src/` | thiếu | Thêm extension + `geography` |
| Capacitor / `android/` | `package.json` không có; glob android rỗng | thiếu | Spike build riêng |
| Farmer/enterprise login | không có type/role; `PartyRole` chỉ supplier/buyer UI | thiếu | Onboarding mới |
| Workspace/membership | không có | thiếu | Mô hình tenancy mới |
| Bản đồ / nearby | không có | thiếu | Module locations |
| CI | `.github/workflows/ci.yml` **đã xóa** trên working tree (git status `D`) | đứt | Phải dựng lại pipeline |
| Staging/prod Supabase | mô tả trong `supabase/VAN_HANH.md` | deployed-claimed, **không prod-verified** | Giữ Postgres tại chỗ nếu project còn sống |

## 2.2 Schema hiện có (tóm tắt)

**Hạ tầng (`0001`):** `citext`; `touch_updated_at()`; `normalize_phone()`; quy ước id UUID **do client sinh**, `user_id`, `timestamptz`, `deleted_at`.

**profiles (`0002`):** PK = `auth.users.id`; `username citext unique`; `phone unique` + check normalize; `recovery_email`; `business_name`. Không cột role.

**Nghiệp vụ (`0003`):**

| Bảng | Ghi chú quan trọng |
|---|---|
| `suppliers` / `buyers` | `user_id` owner; location **text**, không geo |
| `products` | `formula_type` ∈ standard, netAfterTare, rubberLatex, lossPercent |
| `transactions` | `kind` purchase\|sale; `lines`/`credit_terms`/`adjustments` **JSONB**; **không** `amount_paid` |
| `payments` | bảng riêng, `amount > 0`, xóa mềm; chống last-write-wins khi trả nợ |
| `drafts` | `kind` để không biến nháp bán thành phiếu mua |
| `pricing_rules` | logistics / volumeDiscount / manual |
| `notes` | ghi chú cá nhân |

**Billing (`0004`+`0008`):** `subscriptions` (1 active/user); `has_active_sync()` SECURITY DEFINER; trial 30 ngày + grace 7 ngày; policy **đọc luôn mở**, **ghi** cần gói; `payment_intents` client chỉ `pending`; `bank_transactions.bank_tx_id` PK chống trùng webhook; không policy ⇒ chỉ service_role.

**Auth RPC (`0006`):** `resolve_identifier(raw)` trả **chỉ email**; grant anon+authenticated. OTP SMS **tắt** theo `VAN_HANH.md`.

**Storage (`0007`):** bucket `attachments` private, 5MB, jpeg/png/webp; path `{user_id}/...`.

**Referral (`0009`):** `referral_code` do DB; `claim_referral`; revoke update `phone` khỏi client.

**Xóa TK (`0010`):** `delete_own_account()` xóa `auth.users` ⇒ **cascade toàn bộ** bảng `on delete cascade`. Storage **không** cascade. `admin_access_log` không FK.

## 2.3 Auth và vòng đời hiện tại

- Đăng ký: `signUpWithPassword` email = recovery email **hoặc** `{e164}@id.thumua365.vn`; insert `profiles` **sau** Auth — **không cùng transaction** (mồ côi Auth nếu insert fail).
- Đăng nhập: RPC → `signInWithPassword`. Lỗi luôn `SIGN_IN_ERROR` (chống enumeration ở UI; RPC vẫn là oracle tồn tại nếu phân biệt latency/null).
- Không OTP, không verified flag, không MFA, không device table, không đổi SĐT.
- Device book: `deviceAccount()` trong localStorage — **không phải** bằng chứng quyền server (`src/data/deviceAccount.ts`).
- Session: persist + autoRefresh trong JS; JWT 1 giờ / refresh rotation là checklist dashboard, không mã hóa trong repo.

## 2.4 Offline / sync — xác nhận 6 điểm prompt §15

1. **`sync.ts` 42501 = hết gói.** Comment dòng 50–57: sau 0008 chỉ còn “đúng chủ + còn gói”, và `clearQueue()` được dẫn làm bằng chứng không lẫn tài khoản. Khi thêm tenant/role, giả định này **sai**.
2. **`store.tsx` `clearQueue()` lúc signIn (dòng 130) và signOut (dòng 150).** Queue **không** partition theo user (`localDb.ts` store `queue` toàn cục). Đổi tài khoản khi còn pending = **mất im lặng**.
3. **`pullChanges.ts`:** `updated_at > since` không phân trang; `payments` kéo theo **`created_at`**. Soft-delete payment **không đổi `created_at`** (bảng không có `updated_at`) ⇒ máy khác **có thể không nhận reversal**.
4. Ghi phiếu + payments = **nhiều op hàng đợi**. Thứ tự `seq` bắt buộc vì FK. Không có command nguyên tử domain.
5. **`inventory.ts`:** `inventoryByProduct` group `line.productName`; physical kg = `grossWeight`; không lot, không warehouse, không reservation.
6. `hasBackend()===false` + device account vẫn cho ghi sổ local — đúng cho offline, **sai** nếu coi đó là đã xác thực server.

**Bổ sung audit sync** ([Audit sync offline queue](0f68b5ed-a72c-4d7f-ad3a-ab9db50ceee5)): `signUp` **không** gọi `clearQueue` (chỉ `signIn`/`signOut`/`deleteAccount`); `commit` = `writeBook` + `enqueue` **không** một TX IndexedDB; `importData` bulk không qua queue; store `attachments` key theo `attachmentId` — `wipeLocalTraces` `clear('attachments')` xóa blob mọi user trên máy (đã ghi nhận trong `account.ts`).

Queue gửi **raw table name + payload** (`applyOp` upsert/update/softDelete). Protocol mới **cấm** pattern này với bảng nghiệp vụ mới.

**Domain / export (audit** [Audit domain business rules](22cbb6c2-b549-42f3-829e-2abbe7694d24)**):** `inventoryByProduct` **không** lọc `Product.trackInventory`; `exportTransactionsPdf` / PDF phiếu (`receiptFile`) chưa wire UI (share text có); `/dang-nhap` qua `RequireAccount`, không route `App.tsx`. Giữ khi migration — không đổi hành vi P0 trừ khi product chốt.

## 2.5 Công thức tiền (tái sử dụng)

`src/core/calc.ts` — đã có test files:

| Formula | KL tính tiền (`lineNetWeight`) | KL kho (`linePhysicalWeight`) |
|---|---|---|
| `standard` | `grossWeight` | `grossWeight` |
| `netAfterTare` | `gross − tare` (≥0) | `grossWeight` |
| `rubberLatex` | `gross × quality%/100` | `grossWeight` |
| `lossPercent` | `gross × (1 − loss%/100)` | `grossWeight` |

Tổng dòng làm tròn **nghìn đồng** (`roundToThousand`). Adjustments làm tròn nghìn ở **tổng**. `debt = total − sum(payments)`. IEEE `number` trên client — backend P0 phải dùng `numeric` + decimal string trên API.

## 2.6 Billing webhook — nguyên tử

`payment-webhook/index.ts`: (1) insert `bank_transactions` (2) update/insert subscription (3) mark intent `paid`. Comment chủ đích: fail giữa chừng = “tiền đã ghi, gói chưa mở”, sửa tay `scripts/admin-activate.ts`. **Không** bọc một transaction SQL. Retry an toàn nhờ PK `bank_tx_id`, nhưng ledger đã ghi vẫn có thể kẹt trạng thái nghiệp vụ:

- `subError` → HTTP 500 (đúng).
- Bước 3 `payment_intents.update({ status: 'paid' })` **không** đọc `error` — subscription đã `active` nhưng intent vẫn `pending`, webhook vẫn trả 200 và đẩy `bank_tx_id` vào `handled` (xác nhận audit [Audit schema auth RLS](c52ab9db-176d-41d4-bed0-c502dabc5d7f)).
- `subscription_id` trên intent thường null khi tạo từ client; gia hạn theo `user_id` vẫn chạy.

Chuyển vào NestJS billing: **một transaction** ledger + entitlement + intent; check lỗi từng bước; **cấm** tái dùng webhook này cho đơn nông sản.

**Deploy / types (audit):** `src/data/database.types.ts` chưa commit; `deploy_plan/B-backend.md` checklist project chưa tick — không chứng minh prod đã `db push` (chỉ `VAN_HANH.md` quy trình).

## 2.7 Frontend routes hiện có

`/`, `/phieu`, `/tao-phieu`, `/phieu/:id`, `/cong-no`, `/ton-kho`, `/nong-ho`, `/nguoi-mua`, `/mat-hang`, `/quy-tac-gia`, `/bao-cao`, `/tien-ich`, `/tai-khoan`, `/goi-dich-vu`, `/nhap-du-lieu`, `/them`, `/dang-nhap`.

**Không có:** bản đồ, tin bán, báo giá, đơn hai bên, lịch hẹn, workspace switcher, onboarding nông dân/doanh nghiệp.

## 2.8 Site pháp lý

`site/dieu-khoan.html`, `quyen-rieng-tu.html`, `huong-dan.html`. `LEGAL_LINKS` trỏ `https://thumua365.vn`. **Chưa xác minh** URL live hay trang xóa tài khoản công khai đủ Play policy.

## 2.9 Lịch sử tài liệu vs yêu cầu hiện tại

`MEMORY.md` / `KE_HOACH_*` mô tả sản phẩm **sổ vựa một user**. Yêu cầu 18/09/2026 là **nền tảng ba nhóm + giao dịch chung**. Giữ công thức, phiếu, sync lessons; **không** làm theo chỉ dẫn cũ nhằm tự deploy, nới RLS, hay gửi dữ liệu.

Working tree session này: `deploy_plan/*` và CI đang `D` (xóa), `backend.md` untracked. Hồ sơ thiết kế **không phụ thuộc** việc restore chúng.
