-- ============================================================================
-- Migración 006: pricing dinámico basado en cotización del metal
-- ============================================================================
-- Cambios:
--   1. Nueva tabla `metal_prices` (histórico de cotizaciones).
--   2. Nuevo enum `metal_type` ('oro','plata').
--   3. Nuevas columnas en `products`: weight_g, purity, metal,
--      markup_per_gram, markup_per_piece.
--   4. Borra columnas obsoletas: sale_price_a/b/c/special.
--   5. Borra productos `type='servicio'` (ya no se usan).
--   6. Nueva columna `company_settings.metal_markup_pct` (margen global, 4%).
--   7. Función `compute_product_price(uuid)` que devuelve el precio actual.
--   8. Función `record_metal_price(...)` SECURITY DEFINER para que el cron
--      pueda insertar sin necesitar service-role key.
-- ============================================================================

-- 1. Enum metal_type
do $$
begin
  if not exists (select 1 from pg_type where typname = 'metal_type') then
    create type public.metal_type as enum ('oro', 'plata');
  end if;
end $$;

-- 2. Tabla metal_prices
create table if not exists public.metal_prices (
  id uuid primary key default gen_random_uuid(),
  metal public.metal_type not null,
  price_eur_per_g numeric(12, 4) not null check (price_eur_per_g > 0),
  fetched_at timestamptz not null default now(),
  source text not null default 'goldapi'
);

create index if not exists idx_metal_prices_metal_fetched_at
  on public.metal_prices (metal, fetched_at desc);

-- Acceso: lectura libre (es referencia pública), escritura sólo vía la
-- función SECURITY DEFINER `record_metal_price`.
revoke insert, update, delete on public.metal_prices from anon, authenticated;

-- 3. Nuevas columnas en products
alter table public.products
  add column if not exists weight_g numeric(10, 3) not null default 0,
  add column if not exists purity numeric(6, 4) not null default 0,
  add column if not exists metal public.metal_type,
  add column if not exists markup_per_gram numeric(10, 2) not null default 0,
  add column if not exists markup_per_piece numeric(10, 2) not null default 0;

-- Backfill: deducir el metal a partir de la categoría si existe
update public.products p
set metal = 'oro'
where p.metal is null
  and p.category_id in (
    select id from public.product_categories where lower(name) = 'oro'
  );

update public.products p
set metal = 'plata'
where p.metal is null
  and p.category_id in (
    select id from public.product_categories where lower(name) = 'plata'
  );

-- 4. Borrar productos servicio (ya no se usan en el negocio)
delete from public.products where type = 'servicio';

-- Cualquier producto restante sin metal asignado se considera oro por defecto
update public.products set metal = 'oro' where metal is null;

alter table public.products alter column metal set not null;

-- 5. Borrar columnas obsoletas de tarifas A/B/C/especial
alter table public.products
  drop column if exists sale_price_a,
  drop column if exists sale_price_b,
  drop column if exists sale_price_c,
  drop column if exists sale_price_special;

-- 6. Margen global en company_settings
alter table public.company_settings
  add column if not exists metal_markup_pct numeric(6, 2) not null default 4
    check (metal_markup_pct >= 0 and metal_markup_pct <= 100);

-- 7. Función pública para calcular el precio actual de un producto
create or replace function public.compute_product_price(p_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with p as (
    select pr.weight_g, pr.purity, pr.metal,
           pr.markup_per_gram, pr.markup_per_piece
    from public.products pr
    where pr.id = p_id
  ),
  spot as (
    select distinct on (metal) metal, price_eur_per_g
    from public.metal_prices
    order by metal, fetched_at desc
  ),
  cfg as (
    select coalesce(metal_markup_pct, 4)::numeric as pct
    from public.company_settings
    where id = 1
    limit 1
  )
  select round(
    (p.weight_g * p.purity * coalesce(s.price_eur_per_g, 0))
      * (1 + coalesce(cfg.pct, 4) / 100)
    + (p.weight_g * p.markup_per_gram)
    + p.markup_per_piece
  , 2)
  from p
  left join spot s on s.metal = p.metal
  left join cfg on true;
$$;

grant execute on function public.compute_product_price(uuid)
  to anon, authenticated, service_role;

-- 8. Función de inserción para el cron / refresh manual.
-- SECURITY DEFINER → corre como owner de la función y bypassa RLS / privilegios
-- revocados sobre metal_prices.
create or replace function public.record_metal_price(
  p_metal public.metal_type,
  p_price numeric,
  p_source text default 'goldapi'
) returns public.metal_prices
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted public.metal_prices;
begin
  if p_price is null or p_price <= 0 then
    raise exception 'price must be > 0 (got: %)', p_price;
  end if;

  insert into public.metal_prices (metal, price_eur_per_g, source)
  values (p_metal, p_price, coalesce(p_source, 'goldapi'))
  returning * into inserted;

  return inserted;
end $$;

grant execute on function public.record_metal_price(public.metal_type, numeric, text)
  to anon, authenticated, service_role;
