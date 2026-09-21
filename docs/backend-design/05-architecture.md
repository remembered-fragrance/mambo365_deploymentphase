# 5. Kiến trúc và triển khai

## 5.1 C4 — Context

```mermaid
C4Context
  title THUMUA365 — System Context
  Person(farmer, "Nông dân")
  Person(trader, "Thương lái")
  Person(ent, "Doanh nghiệp")
  Person(admin, "Vận hành nền tảng")
  System(app, "THUMUA365", "Web/PWA + Android + NestJS + Postgres")
  System_Ext(auth, "Supabase Auth")
  System_Ext(maps, "VietMap / geocoding")
  System_Ext(push, "FCM")
  System_Ext(sms, "SMS/Email provider")
  System_Ext(bank, "Casso/SePay — chỉ gói phần mềm")
  Rel(farmer, app, "HTTPS")
  Rel(trader, app, "HTTPS")
  Rel(ent, app, "HTTPS")
  Rel(admin, app, "Admin console / HTTPS")
  Rel(app, auth, "JWT issue/verify")
  Rel(app, maps, "tiles+geocode+route")
  Rel(app, push, "push")
  Rel(app, sms, "OTP/email")
  Rel(app, bank, "webhook billing")
```

**Legend:** mũi tên vào `app` là tin cậy sau TLS + JWT. `bank` chỉ đụng module billing. Client **không** gọi Postgres qua service_role.

## 5.2 C4 — Container

```mermaid
flowchart TB
  subgraph clients [Clients]
    web[Web/PWA React Vite]
    andr[Android Capacitor]
  end
  subgraph edge [Edge]
    cdn[HTTPS / CDN]
  end
  subgraph api [NestJS process]
    http[API HTTP]
    wrk[Worker]
  end
  subgraph data [Supabase project]
    auth[Auth]
    pg[(PostgreSQL + PostGIS)]
    st[Storage]
  end
  maps[Map provider]
  fcm[FCM]
  mail[Email/SMS]
  web --> cdn --> http
  andr --> cdn
  http -->|verify JWT JWKS| auth
  http -->|role mambo_app SET LOCAL| pg
  wrk -->|role mambo_worker| pg
  http --> st
  wrk --> fcm
  wrk --> mail
  http --> maps
  wrk --> pg
```

API **stateless**. Worker đọc `outbox_events` cùng DB. Redis **tùy chọn** (rate limit, cache membership) — **không** lưu số dư tiền/tồn.

## 5.3 Triển khai

```mermaid
flowchart LR
  subgraph local [local]
    apiL[API Docker]
    webL[Vite]
    dbL[Supabase local hoặc staging]
  end
  subgraph staging [staging]
    apiS[API Fly/Render/Cloud Run]
    webS[Vercel Preview]
    dbS[Supabase staging]
  end
  subgraph prod [production]
    apiP[API ≥2 instance]
    webP[Vercel Production]
    dbP[Supabase paid + PITR]
  end
```

- Env tách credentials/Storage/DB.
- Migration = job CI riêng, **cấm** `synchronize: true` lúc boot NestJS.
- Frontend production **không** trỏ staging.

**Trust boundary:** mọi command đổi đơn/tiền/kho/quyền/hồ sơ xác minh đi NestJS. PostgREST chỉ còn: Auth, đọc bảng **được liệt kê** giai đoạn chuyển tiếp, Storage upload qua signed URL do NestJS cấp.

## 5.4 Ranh giới NestJS–Supabase

| Đường | Ai | RLS | Ghi bảng mới |
|---|---|---|---|
| Browser → Auth | supabase-js | n/a | không |
| Browser → PostgREST bảng cũ | anon/authenticated | `user_id` + `has_active_sync` | chỉ bảng legacy, feature-flag |
| Browser → NestJS | JWT | Nest SET LOCAL + RLS defense-in-depth | **bắt buộc** |
| Worker | `mambo_worker` | RLS + grant hẹp | outbox, cleanup, billing apply |
| Admin Auth API | service_role **chỉ** job isolated | bypass | audit bắt buộc; không có trong bundle |

Chi tiết grant/SET LOCAL: ADR-003.

## 5.5 Cấu trúc thư mục đề xuất

**Không** ép monorepo tooling ngay. Vite app **giữ root**. Thêm API cạnh:

```
/
  src/                    # web hiện tại
  apps/api/               # NestJS
    src/
      main.ts
      app.module.ts
      common/             # filters, decimal, idempotency, cls
      identity/
      access/
      workspaces/
      farms/
      catalog/
      locations/
      marketplace/
      quotations/
      orders/
      appointments/
      receiving/
      inventory/
      settlements/
      notifications/
      files/
      sync/
      reports/
      billing/
      moderation/
      audit/
    test/
  packages/contracts/     # OpenAPI generated types — optional khi có CI
  supabase/migrations/    # NGUỒN SỰ THẬT schema
  docs/backend-design/
```

Trong mỗi module NestJS:

- `*.controller.ts` — DTO in/out, không rule.
- `*.service.ts` — use case, transaction.
- `domain/` — state machine, money calc (port `core/calc` sang decimal).
- `infra/` — Drizzle repo, map adapter, FCM.

Cấm tầng “xxxRepository chỉ gọi service rồi return”.

Shared với frontend: **OpenAPI → types**, không import `apps/api` từ Vite.
