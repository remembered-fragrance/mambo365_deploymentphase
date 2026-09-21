-- samples/workspace-isolation.sql
-- Composite FK chống child trỏ parent workspace khác. CHƯA CHẠY.

create table warehouses (
  id uuid primary key,
  workspace_id uuid not null references workspaces (id),
  name text not null,
  unique (id, workspace_id)
);

create table inventory_lots (
  id uuid primary key,
  workspace_id uuid not null,
  warehouse_id uuid not null,
  commodity_id uuid not null,
  qty_on_hand numeric(18, 3) not null default 0 check (qty_on_hand >= 0),
  qty_reserved numeric(18, 3) not null default 0 check (qty_reserved >= 0),
  check (qty_on_hand >= qty_reserved),
  foreign key (warehouse_id, workspace_id)
    references warehouses (id, workspace_id)
);

create table trade_orders (
  id uuid primary key,
  buyer_party_id uuid not null,
  seller_party_id uuid not null,
  check (buyer_party_id <> seller_party_id)
);
