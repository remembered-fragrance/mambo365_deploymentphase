# 6. Module map và ADR

## 6.1 Module P0

Gộp `organizations` vào `workspaces` (workspace **là** tổ chức; `kind` = personal_farm | trader | enterprise). `farms` tách vì dữ liệu sản xuất/privacy khác điểm thu mua.

| Module | Sở hữu dữ liệu | Use case chính | API | Quyền | Transaction boundary | Events | Phụ thuộc được phép |
|---|---|---|---|---|---|---|---|
| identity | profiles, verifications, devices, preferences | đăng ký, phiên, đổi mật khẩu, xóa TK | `/me`, devices | bản thân | không gộp Auth+SQL | `UserRegistered` | Auth adapter |
| access | roles, permissions, membership_scopes | kiểm tra quyền | nội bộ | — | đọc trong TX caller | `MembershipRevoked` | workspaces |
| workspaces | workspaces, memberships, invitations | tạo WS, mời, đổi owner | `/workspaces` | owner/manager | mời ≠ membership cho tới accept | `MemberInvited` | identity, access |
| farms | farms, harvest_lots | lô, privacy geo | `/farms` | owner farm WS | reserve lot | `LotReserved` | catalog |
| catalog | commodities, grades, units, workspace_products | danh mục, quy đổi | `/catalog` | viewer+ | — | — | — |
| locations | locations, hours, capabilities, price_quotes | công bố điểm, nearby | `/locations` | owner/staff + public read | publish = moderation case | `LocationPublished` | files, catalog |
| marketplace | sell_listings, buy_requests, follows | đăng tin, follow | `/listings` | owner listing | publish kiểm verified policy | `ListingPublished` | farms, locations |
| quotations | quotations, revisions, lines | gửi/counter/accept | `/quotations` | đúng bên | accept **và** tạo order 1 TX | `QuotationAccepted` | orders, marketplace |
| orders | trade_orders, lines, participants, events, views, notes, approvals | confirm, cancel, change | `/orders` | participant + field ACL | confirm + reserve | `OrderConfirmed` | inventory, access |
| appointments | appointments | propose/confirm/reschedule | `/appointments` | participant | — | `AppointmentChanged` | orders, locations |
| receiving | fulfillments, weighing, qc, acceptance | nhận từng phần | `/fulfillments` | warehouse tại chỗ | accept → stock movement | `GoodsAccepted` | inventory, orders |
| inventory | warehouses, lots, movements, reservations | tồn, giữ, nhập/xuất | `/inventory` | warehouse/owner | movement + lot qty 1 TX | `StockMoved` | catalog |
| settlements | settlements, allocations, RP entries, confirmations, reversals | ghi tiền, phân bổ, đảo | `/settlements` | accountant/owner | ledger immutable | `SettlementPosted` | orders |
| notifications | inbox, preferences, push_registrations | inbox, push | `/notifications` | chủ inbox | insert inbox cùng outbox | — | outbox |
| files | files, file_links | upload session, signed GET | `/files` | resource ACL | — | — | storage adapter |
| sync | sync_operations, change_feed, idempotency | commands, cursor | `/sync` | membership tại thời điểm xử lý | từng command | — | mọi module command |
| reports | *đọc* | báo cáo nội bộ, export | `/reports` | export permission | read-only | `ExportRan` | audit |
| billing | plans, subscriptions, entitlements, billing_events | gói phần mềm | `/billing` | chủ WS trader | apply entitlement 1 TX | `PlanActivated` | **cấm** settlements |
| moderation | reports, disputes, verification_cases, actions | duyệt điểm, report | `/admin/*` | platform_* | — | `ModerationActed` | audit |
| audit | audit_events, outbox_events | nhật ký, worker | nội bộ + `/admin/audit` | platform | **cùng TX** nghiệp vụ | — | — |

P1 mới: transfers, stocktake, returns, aging, chat — không implement P0.

## 6.2 ADR

Mọi ADR: **Quyết định / Lý do / Không chọn / Chi phí / Xem xét lại**.

### ADR-001 — Giữ PostgreSQL trên Supabase

**Quyết định:** Một database: project Supabase hiện có (staging/prod tách). NestJS kết nối Postgres trực tiếp (connection pooler **session** hoặc direct, không transaction mode cho SET LOCAL đa statement nếu pooler phá).

**Lý do:** Prompt: không có lý do vận hành rõ thì ưu tiên giữ. PostGIS là extension Supabase hỗ trợ. Storage/Auth cùng nhà giảm ops.

**Không chọn:** RDS/Cloud SQL riêng (hai nguồn, replication tay); Neon/Supabase + replica nghiệp vụ.

**Chi phí:** vendor lock vừa phải; PITR theo gói Supabase.

**Xem xét lại:** khi SLA/IOPS/PITR không đạt RPO 15 phút đã mua, hoặc rời Auth.

### ADR-002 — Supabase Auth là IdP

**Quyết định:** Giữ email/password + `resolve_identifier`. NestJS **verify chữ ký** JWT (JWKS `.../auth/v1/.well-known/jwks.json`, issuer `https://<ref>.supabase.co/auth/v1`, audience `authenticated`, exp, `sub`). Cache JWKS; xoay khóa chờ ≥20 phút theo tài liệu Supabase. HS256: không nhúng secret vào client; verify qua `getUser`/JWT secret **chỉ trên server**, kế hoạch migrate asymmetric.

Không tin `user_metadata` / `app_metadata.role` cho quyền nghiệp vụ.

**Không chọn:** Cognito/Keycloak (đứt tài khoản cũ); tự roll password store.

**Xem xét lại:** khi cần SAML doanh nghiệp lớn (P2).

### ADR-003 — Tenancy: service layer bắt buộc + RLS defense-in-depth

**Quyết định:**

1. Mọi command: NestJS guard membership **từ DB** (cache TTL ngắn + invalidate khi revoke).
2. Mỗi request/command: `BEGIN; SELECT set_config('app.actor_id', $1, true); SELECT set_config('app.workspace_id', $2, true); … COMMIT;`
3. Policy bảng mới: `current_setting('app.actor_id', true)::uuid` + membership/participant — **không** dùng `auth.uid()` trên kết nối NestJS (vì không có JWT Postgres).
4. Role DB `mambo_app`: NOBYPASSRLS, không owner bảng, GRANT cột tối thiểu.
5. Bảng legacy: giữ RLS `auth.uid() = user_id` cho client cũ.
6. Nơi **không** RLS: không tuyên bố là có. Worker dùng role riêng, test grant.

Pool: lấy connection → bắt đầu TX → set_config → query → commit → release. **Cấm** set_config ngoài TX. Transaction-mode pooler (Supavisor) chỉ dùng nếu **mọi** lệnh nằm một transaction Postgres.

**Không chọn:** chỉ RLS không qua NestJS (bỏ validation tiền/kho); chỉ service layer không RLS (một bug SQL là leak tenant).

**Xem xét lại:** nếu pooler bắt buộc transaction mode và SET LOCAL không ổn — chuyển Prisma-less session pool hoặc PgBouncer session.

### ADR-004 — Drizzle + một pipeline SQL

**So sánh:**

| | Transaction | Decimal | Optimistic lock | PostGIS |
|---|---|---|---|---|
| Prisma | có | tốt dần, geo yếu | `$version` | raw SQL / preview |
| TypeORM | có | tùy | có | plugin |
| Drizzle | có | `numeric` string | `version` cột | `sql\`ST_DWithin\`` |
| Knex | có | tay | tay | SQL |

**Quyết định:** Drizzle schema TypeScript là *mirror*; **file SQL trong `supabase/migrations/` là nguồn sự thật**. `drizzle-kit generate` → review → commit vào folder đó. Cấm `drizzle-kit push` prod. Cấm Prisma migrate song song cùng bảng.

**Lý do:** PostGIS parameterized, numeric, khớp quy trình 0001–0010 đã có.

### ADR-005 — Đơn chung một bản ghi

**Quyết định:** `trade_orders` + `order_participants` (buyer/seller). Projection `workspace_order_views` cho sổ UI. Phiếu `public.transactions` cũ **giữ**, đổi tên logic `legacy_receipts`, không backfill thành `confirmed` hai bên.

**Không chọn:** hai hàng order đối xứng (lệch tiền); chỉ sổ một phía.

### ADR-006 — Offline = command envelope, không table upsert

**Quyết định:** `POST /sync/commands` với `operationId`, `deviceId`, `workspaceId`, `aggregateId`, `expectedVersion`, `type`, `payload`. Server không nhận `table` tùy ý. Change feed `bigint identity` + overlap replay. Chi tiết §12.

**Không chọn:** last-write-wins tiền/kho; timestamp cursor như hiện tại.

### ADR-007 — PostGIS geography + MapLibre + VietMap

**Quyết định:** cột `geog geography(Point,4326)`, GiST, `ST_DWithin` mét. Client map: MapLibre GL. Tiles/geocode/routing: **VietMap** qua adapter. Fallback: danh sách + geocode server-side + nhập tay. **Cấm** `tile.openstreetmap.org` production ([OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)).

**Không chọn:** Google Maps mặc định (chi phí + hạn cache); Mapbox mặc định (địa chỉ VN/giá); OSM public tiles.

**Xem xét lại:** hợp đồng VietMap trễ → MapTiler/Goong **cùng adapter**, dữ liệu `locations` không đổi.

### ADR-008 — Capacitor, không TWA mặc định

**Quyết định:** Capacitor bọc Vite. TWA/Bubblewrap: chỉ nếu native (camera, push, file, offline IDB, deep link auth) chứng minh đủ bằng PWA — hiện **không** (offline queue + camera phiếu). Không viết lại RN/Flutter.

**Xác minh:** một debug AAB/APK spike ở mốc 1. Không cam kết Play duyệt.

### ADR-009 — Outbox Postgres, Redis không bắt buộc P0

**Quyết định:** `outbox_events` insert **cùng TX** nghiệp vụ. Worker poll `FOR UPDATE SKIP LOCKED`, retry, dead letter. Redis: cache membership/rate-limit **khi có nhiều replica**; P0 1 instance không bắt buộc Redis.

**Không chọn:** Kafka; fire-and-forget HTTP trong request; Redis làm ledger.

## 6.3 Session / token

| | Web | Android |
|---|---|---|
| Access | JWT memory + supabase-js persist (hiện tại localStorage — P0.1 chuyển httpOnly cookie **hoặc** giữ localStorage + hardening CSP; **giả định A-TOKEN:** P0 giữ supabase-js persist vì ít đụng Auth, bù CSP + không nhúng JWT vào URL) | Capacitor Preferences encrypted / OS keystore qua plugin |
| Refresh | rotation đã checklist VAN_HANH | PKCE + system browser OAuth nếu thêm Google; password: same Auth |
| Expiry | access ~1h | same |
| Re-auth | xóa TK, đảo tiền, đổi owner | same |
| CSRF | N/A nếu Bearer; nếu cookie thì SameSite + CSRF token | N/A |
| XSS | CSP, không JWT trên query | WebView CSP |

MFA: bắt buộc `platform_admin`; cấu hình cho owner/accountant (P0 flag, enforce P0.1).
