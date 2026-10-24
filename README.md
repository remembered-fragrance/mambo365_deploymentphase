# THUMUA365 v1.0

App web (PWA) cho chuỗi thu mua nông sản, **ba vỏ** theo loại tổ chức: nông dân · thương lái / chủ vựa ·
doanh nghiệp. Vựa và doanh nghiệp ghi sổ được khi không có mạng, có mạng thì đồng bộ qua API.

Đang chạy ở **https://www.thumua365.id.vn** (Vercel, merge `master` là lên). Backend ở repo riêng
[Thumua365_BE](https://github.com/remembered-fragrance/Thumua365_BE) (NestJS) — app gọi API của nó qua
`@mambo/sdk`, không đọc / ghi bảng Supabase trực tiếp.

| Đọc gì | Khi nào |
|---|---|
| [`docs/FRONTEND.md` của repo BE](https://github.com/remembered-fragrance/Thumua365_BE/blob/master/docs/FRONTEND.md) | **Trước tiên.** Hợp đồng với backend: cài gì, gọi gì, lỗi nào làm gì, đồng bộ sổ |
| [`MEMORY.md`](MEMORY.md) | Nhật ký: đã làm gì, quyết gì, vì sao, còn treo gì |
| [`deploy_plan/README.md`](deploy_plan/README.md) | §3 — luật chung của repo (ranh giới tầng, luật cấm) vẫn áp dụng. Phần kế hoạch A → H là của thời Supabase trực tiếp |
| [`deploy_plan/NOTES.md`](deploy_plan/NOTES.md) | Việc thấy nhưng chưa tới lượt |
| [`supabase/VAN_HANH.md`](supabase/VAN_HANH.md) | Lịch sử thời Supabase trực tiếp; kịch bản đồng bộ §6 và luồng tiền §7.3 vẫn dùng để nghiệm thu |

## Chạy

```bash
npm install
cp .env.example .env.local   # rồi điền
npm run dev                  # http://localhost:5173
```

| Biến | Là gì |
|---|---|
| `VITE_API_URL` | URL của Thumua365_BE, không có `/v1`. Máy dev: `http://localhost:3000` (API chạy ở máy, trỏ vào Supabase staging). Vercel: `https://thumua365-api-staging.onrender.com` — build production bắt buộc `https://`. Thiếu thì app chạy chế độ "sổ của máy này", không có đăng nhập |
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Auth (đăng ký, đăng nhập, làm mới token). Chỉ khoá publishable — không bao giờ `service_role` |
| `VITE_API_WARMUP` | `off` = thôi gọi `/v1/health` lúc mở app (đánh thức API gói free của Render) |
| `VITE_TILE_URL` · `VITE_TILE_ATTRIBUTION` | Lớp nền bản đồ; trống = tile OpenStreetMap. Đổi thì sửa cả CSP trong `vercel.json` |

⚠️ Chưa có môi trường production riêng: API staging ở trên là API mà app thật đang dùng, dữ liệu trên đó là của
người dùng thật. Thử nghiệm bằng API chạy ở máy, đừng tạo tài khoản thử trên staging.

## Kiểm trước khi merge

```bash
npm run verify
```

Gồm năm bước; CI (`.github/workflows/ci.yml`) chạy đúng các bước này rồi `npm run build`:

| Lệnh | Kiểm gì |
|---|---|
| `npm run lint` | oxlint — cấm `alert`, `any`, `console.log`… |
| `npm run typecheck` | `strict` + `noUncheckedIndexedAccess` |
| `npm run rules` | Luật dự án ở `deploy_plan/README.md` §3: chuỗi tiếng Việt trong JSX, màu viết cứng, `parseFloat` cho tiền, `localStorage` / `sessionStorage` ngoài `data/` |
| `npm run boundaries` | Ranh giới bốn tầng (dependency-cruiser) |
| `npm run test` | Test `data/`, `features/`, `export/`… (test của nghiệp vụ tính tiền nằm ở `packages/core` của repo BE) |

`npm run site:check` chỉ chạy trước khi xuất bản `site/`. `db:push`, `db:types` là script của thời Supabase trực
tiếp, không dùng nữa.

## Cấu trúc

```
src/
├── data/        chỗ DUY NHẤT chạm mạng: @mambo/sdk + supabase-js (Auth), IndexedDB, hàng đợi đồng bộ, store
├── components/  UI thuần — chỉ nhận props, không biết nghiệp vụ
├── features/    màn hình & luồng của ba vỏ: sổ (phiếu, công nợ, kho, đối tác, giá, báo cáo, nhập dữ liệu),
│                nông dân, đơn hàng, kết nối, thông báo, nhân viên / chi nhánh, gói, bản đồ, tài khoản, pháp lý…
├── export/      xuất Excel/PDF/PNG — thư viện nặng, chỉ nạp động
├── i18n/        toàn bộ chuỗi hiển thị, nội dung trang pháp lý (`i18n/legal/`)
└── config.ts    mọi hằng số nghiệp vụ (giá, hạn dùng thử, tài khoản nhận tiền, Zalo hỗ trợ)
tests/           test theo cùng cây thư mục với src/
site/            trang giới thiệu tĩnh — chưa xuất bản
prototype/       bản demo UI bấm được (không gọi API), chỉ để tham khảo
supabase/        migration SQL + Edge Function của thời Supabase trực tiếp — lịch sử, schema nay do repo BE giữ
scripts/         check-rules, check-site; admin-activate, admin-reset-password (script quản trị chạy trên máy)
tests/e2e/       kịch bản chạy trên trình duyệt
```

Nghiệp vụ tính tiền là gói `@mambo/core` (import `@mambo/core/<file>`), sửa ở
[`packages/core` của repo BE](https://github.com/remembered-fragrance/Thumua365_BE/tree/master/packages/core) — không chép lại vào `src/`.
Ba gói `@mambo/*` cài từ GitHub Release của repo BE, **cùng một số phiên bản** (hiện `v0.20.0`); nâng thì đọc
`packages/contracts/CHANGELOG.md` bên đó trước — có bản phải nâng app trước, có bản phải deploy API trước.

Ai được import ai: xem bảng ở [deploy_plan/README.md §3.1](deploy_plan/README.md).
Luật được ép bằng máy trong [`.dependency-cruiser.cjs`](.dependency-cruiser.cjs) — CI đỏ nếu vi phạm.

Route công khai (ngoài cổng đăng nhập): `/dieu-khoan`, `/quyen-rieng-tu`, `/huong-dan`, và hai trang mở từ link trong
thư `/dat-lai-mat-khau`, `/xac-nhan-email` (API dựng link bằng đúng hai đường dẫn này).

## Ba số phải giữ trong tầm

| Chỉ số | Ngưỡng | Lần đo gần nhất |
|---|---|---|
| JS khởi tạo | ≤ 250KB gzip | 91KB (cuối giai đoạn G, 11/08) — chưa đo lại từ khi dựng lại app |
| Phủ test `@mambo/core` (đo ở repo BE) | ≥ 80% dòng | 97,7% (cuối BE0) |
| Lighthouse mobile | Perf ≥85 · A11y ≥95 | chưa đo |

## Chạy tới đâu rồi (23/10/2026)

| Phần | Trạng thái |
|---|---|
| Giai đoạn A → G (app một vai trò, Supabase trực tiếp) | ✅ 08/2026 — nhật ký trong `MEMORY.md` |
| Dựng lại theo hợp đồng NestJS (09 → 10/2026) | ✅ ba vỏ, đăng nhập một ô, "Bạn là ai?", sổ offline đồng bộ qua API, kết nối bằng mã, đơn + hẹn lịch, thông báo, nhân viên / chi nhánh, báo cáo, gói + mã QR chuyển khoản, ảnh chứng từ, đo lường, bản đồ thu mua, quên mật khẩu / xác nhận email, trang pháp lý |
| Bản phát hành gần nhất | PR #57 — tự tải lại một lần khi chunk của bản build cũ đã mất (23/10); trước đó PR #56 sửa theo báo cáo pentest (20/10). Cài `@mambo/*` `v0.20.0` |
| Chưa có | TWA lên CH Play · số tài khoản nhận tiền thật (`config.ts` còn chỗ điền) · Sentry cho web · bucket ảnh và backup phía BE |
