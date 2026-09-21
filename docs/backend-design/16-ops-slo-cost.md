# 16. Vận hành, SLO, chi phí

## 16.1 Môi trường

| | local | staging | production |
|---|---|---|---|
| API | Docker Compose NestJS | 1 instance | ≥2 instance stateless |
| Web | Vite | Vercel preview | Vercel prod |
| DB | supabase start hoặc staging | Supabase staging | Supabase paid + PITR |
| Storage | local/staging bucket | tách | tách |
| Secrets | `.env.local` gitignored | store | store |

Boot: validate env (URL, JWKS, DB). Migration job CI **riêng**. Seed giả **không** PII.

CI tối thiểu: lint/typecheck API+web, unit, integration Postgres/PostGIS, authz tests, OpenAPI diff, `supabase db lint`/`rls-coverage`, build web+api+android (android trên runner phù hợp), secret/dep scan, image digest, deploy staging, smoke `/health/ready`, production gated.

Cấm migrate phá schema lúc Nest boot.

Nhiều replica: sticky không cần; membership cache Redis invalidate pubsub; rate limit shared (Upstash/Redis) khi >1 instance; pool size = (instances × pool) < Postgres max. Worker: `SKIP LOCKED`, dead letter. Outbox sống sau restart. Redis **không** nguồn tiền/kho.

## 16.2 Observability

Structured log JSON: `requestId`, workspaceId (không SĐT), code. Metrics: latency/error per route, pool, slow query, outbox depth/age, sync conflict count, duplicate operation, storage fail, map quota, notify fail, login/OTP throttle. Trace: OpenTelemetry. **Không** label metrics = userId cardinality vô hạn. Mask JWT/OTP/password.

## 16.3 SLI/SLO — kế hoạch, chưa benchmark

Tham chiếu thảo luận (A-LOAD cơ sở, cache hit chưa đo):

| SLI | SLO đề xuất | Ghi chú |
|---|---|---|
| Read API p95 | ≤ 500ms | nội bộ, không gồm 3G |
| Nearby p95 | ≤ 800ms | dataset 10k + GiST |
| Write command p95 | ≤ 1s | không chờ map/FCM |
| Availability pilot | 99% / tháng | 1 instance chấp nhận |
| Availability prod | 99.5% | 2 API + Supabase SLA |

Tách latency API vs e2e mobile. Chưa đo = **không đạt**.

RPO 15 phút: chỉ khi gói Supabase PITR đáp ứng — **xác minh lúc mua**; snapshot ngày **không** đủ. RTO mục tiêu pilot 8h, prod 2h — diễn tập restore.

## 16.4 Runbook (mục)

API down; DB down; map 429; outbox age > 10m; duplicate command; lệch tiền (job reconcile entries vs allocations vs movements); lộ credential (rotate + audit); migration fail (forward-fix, không restore mù); storage 404; restore PITR + replay deletion_requests; support user kẹt offline (export parked outbox).

Reconcile cron: tiền, inventory vs movements, reservations expired, outbox stuck.

## 16.5 Chi phí — công thức, chưa snapshot giá 18/09/2026

Công thức: `compute_api + worker + pg + backup + storage_egress + auth_sms_email + maps + monitoring + play_fee`.

| Hạng | Pilot | Cơ sở | Tăng trưởng |
|---|---|---|---|
| Request/ngày (ước) | 20k | 400k | 2M |
| Storage ảnh | 5GB | 200GB | 2TB |
| Nearby QPS peak | 2 | 20 | 80 |

Khi công bố số tiền: dẫn trang giá Supabase/VietMap/Fly/Vercel **kèm ngày**. Hiện: **khoảng giả định**, không phải báo giá.

Mở rộng: dọc Postgres trước; read replica khi reports nặng; Redis khi 2+ API.
