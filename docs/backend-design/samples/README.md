# Mẫu triển khai

Tất cả nhãn **chưa chạy** (18/09/2026). Khớp ADR-002, 003, 004, 006, 007, 009.

| File | Mục |
|---|---|
| [geo-nearby.sql](geo-nearby.sql) | ST_DWithin parameterized, cursor distance+id |
| [workspace-isolation.sql](workspace-isolation.sql) | Composite FK + buyer ≠ seller |
| [supabase-jwt.guard.ts](supabase-jwt.guard.ts) | JWKS verify |
| [workspace-permission.guard.ts](workspace-permission.guard.ts) | membership DB |
| [settlement-idempotent.ts](settlement-idempotent.ts) | TX tiền + outbox + operation_id |
| [sync-dto.ts](sync-dto.ts) | Command envelope |
| [outbox-worker.ts](outbox-worker.ts) | SKIP LOCKED, không double ledger |
| [openapi-accept-quote.yaml](openapi-accept-quote.yaml) | OpenAPI 3.0.3 một luồng |

Không phải skeleton backend hoàn chỉnh.
