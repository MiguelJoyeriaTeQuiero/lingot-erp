-- =====================================================================
-- Lingot ERP — Migración 010
-- 1. Permite a contabilidad crear clientes (INSERT en public.clients).
-- 2. Nueva tabla purchase_orders: pedidos de reposición de stock con
--    seguimiento del precio por gramo y fluctuación entre pedidos.
-- =====================================================================

-- ---------- Fix: contabilidad puede insertar clientes ----------
-- La política clients_admin_all ya cubre INSERT para admin.
-- Añadimos una política INSERT para cualquier usuario autenticado.
drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert with check (public.is_authenticated());

-- ---------- purchase_orders ----------
create table if not exists public.purchase_orders (
  id             uuid          primary key default gen_random_uuid(),
  product_id     uuid          not null references public.products(id) on delete restrict,
  order_date     date          not null default current_date,
  supplier_name  text,
  quantity       numeric(12,3) not null check (quantity > 0),
  cost_per_gram  numeric(12,4) not null check (cost_per_gram > 0),  -- €/g que cobró el proveedor
  spot_price_per_g numeric(12,4),    -- precio spot del metal en ese momento (referencia)
  total_cost     numeric(14,2),      -- coste total del pedido (puede calcularse o introducirse)
  notes          text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz   not null default now()
);

create index if not exists idx_purchase_orders_product_date
  on public.purchase_orders (product_id, order_date desc);

alter table public.purchase_orders enable row level security;

-- Ambos roles pueden consultar y crear pedidos de reposición.
drop policy if exists purchase_orders_select on public.purchase_orders;
create policy purchase_orders_select on public.purchase_orders
  for select using (public.is_authenticated());

drop policy if exists purchase_orders_insert on public.purchase_orders;
create policy purchase_orders_insert on public.purchase_orders
  for insert with check (public.is_authenticated());

-- Solo admin puede modificar o eliminar pedidos ya creados.
drop policy if exists purchase_orders_admin_all on public.purchase_orders;
create policy purchase_orders_admin_all on public.purchase_orders
  for all using (public.is_admin()) with check (public.is_admin());
