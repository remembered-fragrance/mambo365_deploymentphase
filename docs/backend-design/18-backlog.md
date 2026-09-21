# 18. Backlog theo mốc

Estimate: **T-shirt** với hai kịch bản. Không hứa ngày calendar. 1 dev = khoảng ×2.5 so với đội 3 (BE, FE, QA kiêm). Tin cậy thấp (±50%).

DoD chung: schema+API+quyền+test A-liên quan+OpenAPI+flag; không merge nếu A02/A07/A25 liên quan fail.

## Mốc 1 — Khảo sát & nền (spike)

| ID | Việc | Role | AC | API/schema | Dep | Risk | 1-dev | Đội |
|---|---|---|---|---|---|---|---|---|
| M1-1 | NestJS hello + JWKS verify + Docker | BE | token giả reject | `/health` | — | JWT alg | S | S |
| M1-2 | Drizzle + PostGIS extension staging | BE/DB | ST_DWithin sample | locations stub | ADR-001 | pooler | M | S |
| M1-3 | Capacitor debug APK | FE/Android | cài máy, PWA+webview | — | A-NAME | plugin | M | S |
| M1-4 | ADR đã lock trong repo docs | BA | review chủ SP | — | — | — | S | S |

**Xong khi:** JWT verify thật project staging; PostGIS query chạy; APK debug cài được. **Chưa** production.

## Mốc 2 — Identity & tenancy

| ID | Việc | Role | AC | Dep | 1-dev | Đội |
|---|---|---|---|---|---|---|
| M2-1 | workspaces/memberships/invites | BE | A01 A02 | M1 | L | M |
| M2-2 | onboarding 3 nhóm + reconcile Auth | BE+FE | không orphan | M2-1 | M | M |
| M2-3 | backfill trader WS | DB | count match | M2-1 | M | S |
| M2-4 | SET LOCAL RLS + grants | DB | A25 start | M1-2 | M | S |
| M2-5 | thay delete_own_account | BE | A20 skeleton | M2-1 | M | S |
| M2-6 | audit_events | BE | immut | M2-1 | S | S |

## Mốc 3 — Luồng trọn vẹn đầu (farmer → trader)

Nông dân đăng lô → nearby → quote → accept → lịch → cân → tiền. **API + FE** cho luồng này trước CRUD hàng loạt.

| ID | Việc | AC | 1-dev | Đội |
|---|---|---|---|---|
| M3-1 | farms/lots/listings | A06 start | L | M |
| M3-2 | locations nearby+hours+price | A04 A05 | L | M |
| M3-3 | quotations accept TX | A06 A08 | L | M |
| M3-4 | appointments | — | M | S |
| M3-5 | weigh/QC/accept 600/1000 | A09 A10 | L | M |
| M3-6 | settlements declare/confirm/alloc/reverse | A11–A13 | L | M |
| M3-7 | FE màn map+tin+quote+đơn | e2e luồng | XL | L |
| M3-8 | notifications outbox | A23 | M | S |

## Mốc 4 — Doanh nghiệp hai chiều

Procurement+sales, scope chi nhánh, lots, duyệt 1 bước, nhận/trả tiền từng phần. Estimate L–XL.

## Mốc 5 — Dữ liệu & ops

Sync protocol mới A14–A19; migration A22; files A21; admin; load/security/restore A28.

## Mốc 6 — Android & pilot

Capacitor release, quyền, links, push, AAB, A24 A26, checklist Play; pilot 200 user.

## Mốc 7 — P1/P2

Chỉ khi số liệu + ngân sách chốt.

## Phân vai

| Loại | Ai |
|---|---|
| FE | màn, IDB protocol |
| BE | Nest modules |
| DB | SQL migrations, RLS |
| DevOps | CI, env, secrets |
| QA | A01–A28 |
| Ngoài | VietMap HĐ, Play Console, SMS, FCM, domain, pháp nhân |

Spike Android + migration **sớm** (mốc 1–2), không để cuối.
