# Backend hardening — 2026-09-21

Scope: replace the runtime memory backend with PostgreSQL/PostGIS, repair RLS,
durable commands/outbox, connect the existing web app through the API, and verify
the result.

## Status: local verification complete

This is **not** staging/production sign-off. Do not run `supabase db push` against
shared environments without explicit approval.

### Done and verified locally

| Gate | Evidence |
|---|---|
| Nest API uses Postgres only | `Database` + `PERSISTENCE=postgres` required; memory is test fixture |
| Restricted roles + RLS context | `mambo_app` / `mambo_worker`; `SET LOCAL app.actor_id` / `app.workspace_id` |
| Atomic trade / stock / debt | Migrations `0015`–`0018`; SQL commands + Nest `pg-*.ts` services |
| Durable idempotency + outbox | `api_commands`, `outbox_events`, worker `postgres-outbox` |
| Frontend cutover | `src/data/api.ts`, `sync.ts`, `queue.ts` → `/legacy/*` |
| Unit tests | `npm test` in `apps/api` (domain + health) |
| Integration (PostGIS) | `npm run test:integration` — **14/14 pass** on disposable PG 17.9 + PostGIS |
| CI workflow | `.github/workflows/api.yml` with `postgis/postgis:17-3.5` |
| Docker runtime | `Dockerfile` + `docker-compose.yml` (api/worker/nginx), no memory mode |
| Dev proxy | Vite `server.proxy['/api']` → `:3000`; `.env.example` documents `VITE_API_URL` |

### Integration cases covered (2026-09-21)

- Restricted role / missing context / outsider isolation
- Quote accept: reject self-accept, single order, replay, stock reservation
- Receiving rollback, stock/debt, duplicate request, partial delivery
- Payment maker-checker, over-allocation, immutable allocations, reversal
- Revoked membership cannot replay accepted command
- PostGIS public projections, unpublished exclusion, spatial cursor
- Legacy durable replay, owner isolation, tombstones, client cutover
- Legacy receipt ignores forged totals; concurrent payments serialize
- Outbox survives new worker connections; no duplicate inbox
- Close remainder releases unused reservations without erasing stock/debt
- Shared request budget across connections
- Offline sync dependencies + revoked devices
- Real HTTP: auth, validation, workspace, idempotency, session revocation
- Invitations require verified matching identity and invited role only

### Still required before calling production “done”

1. Apply migrations `0011`–`0018` on **staging** (owner approval).
2. Provision `mambo_app` / `mambo_worker` secrets in the real secret manager.
3. Point staging web/Android at the Nest URL; smoke legacy claim + sync.
4. Supabase Auth JWKS + Storage signed uploads end-to-end on staging.
5. Load/chaos check on concurrent accept/pay and worker drain.
6. Commit/push `feat/nestjs-p0` and green CI on GitHub (not done in this worklog).

### Honest boundary

Local PostGIS integration proves the data path. It does **not** prove hosted
Supabase Auth, CDN, Play Store packaging, or production migration safety.
