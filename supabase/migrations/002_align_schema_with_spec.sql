-- ============================================================================
-- Migración 002: alinear schema con la especificación original del proyecto
-- ============================================================================
-- Cambios:
--   1. clients: añadir contact_name; renombrar is_active -> active
--   2. products: añadir cost_price; renombrar is_active -> active,
--      stock -> stock_current; renombrar product_type enum ('producto','servicio');
--      sustituir price_minorista/mayorista/vip por sale_price_a/b/c/special
--   3. price_tier enum: sustituir por ('A','B','C','especial')
--
-- Seguro para aplicar sólo si no hay datos productivos aún (sin filas).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. CLIENTS
-- ----------------------------------------------------------------------------
alter table public.clients rename column is_active to active;
alter table public.clients add column if not exists contact_name text;

alter index if exists idx_clients_active rename to idx_clients_active_tmp;
drop index if exists idx_clients_active_tmp;
create index if not exists idx_clients_active on public.clients (active);

-- ----------------------------------------------------------------------------
-- 2. PRODUCT_TYPE enum: 'fisico' -> 'producto'
-- ----------------------------------------------------------------------------
-- Creamos nuevo enum, migramos columna, eliminamos el viejo.
create type product_type_new as enum ('producto', 'servicio');

alter table public.products
  alter column type drop default,
  alter column type type product_type_new
    using (case type::text
             when 'fisico'   then 'producto'::product_type_new
             when 'servicio' then 'servicio'::product_type_new
           end),
  alter column type set default 'producto'::product_type_new;

drop type product_type;
alter type product_type_new rename to product_type;

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS: renombres + cost_price + sale_price_special
-- ----------------------------------------------------------------------------
alter table public.products rename column is_active  to active;
alter table public.products rename column stock      to stock_current;
alter table public.products rename column price_minorista to sale_price_a;
alter table public.products rename column price_mayorista to sale_price_b;
alter table public.products rename column price_vip       to sale_price_c;

alter table public.products
  add column if not exists sale_price_special numeric(12,2) not null default 0,
  add column if not exists cost_price         numeric(12,2) not null default 0;

drop index if exists idx_products_active;
create index if not exists idx_products_active on public.products (active);

-- ----------------------------------------------------------------------------
-- 4. PRICE_TIER enum: minorista/mayorista/vip -> A/B/C/especial
-- ----------------------------------------------------------------------------
create type price_tier_new as enum ('A', 'B', 'C', 'especial');

alter table public.clients
  alter column price_tier drop default,
  alter column price_tier type price_tier_new
    using (case price_tier::text
             when 'minorista' then 'A'::price_tier_new
             when 'mayorista' then 'B'::price_tier_new
             when 'vip'       then 'especial'::price_tier_new
           end),
  alter column price_tier set default 'A'::price_tier_new;

drop type price_tier;
alter type price_tier_new rename to price_tier;

commit;
