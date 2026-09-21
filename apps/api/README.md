# THUMUA365 API (NestJS)

Hồ sơ thiết kế: [`docs/backend-design/README.md`](../../docs/backend-design/README.md).
Schema sự thật: `supabase/migrations/0001_*.sql` → `0018_runtime_operations.sql`.
Bằng chứng hardening: [`docs/backend-design/PRODUCTION_WORKLOG.md`](../../docs/backend-design/PRODUCTION_WORKLOG.md).

## Chạy local

```bash
# 1) PostgreSQL/PostGIS (Supabase local hoặc Docker)
# docker run --rm -e POSTGRES_HOST_AUTH_METHOD=trust -p 54322:5432 postgis/postgis:17-3.5

# 2) Apply migrations (chỉ khi chủ SP cho phép trên staging/prod)
# supabase db push

# 3) API
cd apps/api
cp .env.example .env   # điền DATABASE_URL / WORKER_DATABASE_URL / JWT
npm ci
npm run build
npm run start:prod     # hoặc: npm run start:dev

# 4) Outbox worker (process riêng)
npm run start:worker
```

Runtime **bắt buộc** `PERSISTENCE=postgres`. `MemoryPlatform` chỉ còn trong unit-test harness — không phải chế độ chạy API.

Swagger: `http://localhost:3000/api/docs`  
Health: `GET /api/v1/health/live`, `GET /api/v1/health/ready` (ready = DB + PostGIS + role `mambo_app`)

Auth đăng nhập/mật khẩu vẫn qua **Supabase Auth**. Nest chỉ verify JWT (`Authorization: Bearer …`). Workspace: header `X-Workspace-Id`. Ghi lệnh: `Idempotency-Key`.

## Kiểm thử

```bash
npm test                          # domain/unit
npm run typecheck && npm run build
# Disposable PostGIS — không trỏ production URL
set TEST_ADMIN_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/postgres
npm run test:integration          # migrations + RLS + trade/debt/outbox/HTTP
```

CI: [`.github/workflows/api.yml`](../../.github/workflows/api.yml) (PostGIS service + integration).

## Docker

```bash
cd apps/api
docker compose up --build
```

Compose chạy `api` + `worker` + nginx ingress (`127.0.0.1:8080`). Image non-root, read-only FS, `cap_drop: ALL`.

## Frontend cutover

Web app gọi Nest qua `VITE_API_URL` (mặc định `/api/v1`). Dev: Vite proxy `/api` → `http://127.0.0.1:3000`. Đồng bộ sổ cũ đi `/legacy/*` sau claim cutover — không ghi thẳng Supabase tables nữa.

## Android

`capacitor.config.json` ở root. Chưa có `android/` — `npx cap add android` khi có SDK. Point `VITE_API_URL` tới API HTTPS trước khi build Play.

## Vai trò DB

Sau migration, provision hai login **không** superuser / không `BYPASSRLS`:

- `mambo_app` → `DATABASE_URL`
- `mambo_worker` → `WORKER_DATABASE_URL`

Không dùng `postgres` / `service_role` cho runtime API.
