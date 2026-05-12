-- ============================================================================
-- Migración 021: incluir cost_price (costes de envío) en compute_product_price
-- ============================================================================
-- El campo cost_price almacena los costes de envío/logística por unidad.
-- No se sumaba al precio calculado por la función, lo que hacía que el precio
-- de catálogo fuera incorrecto y las líneas de factura no lo incluyeran.
-- ============================================================================

create or replace function public.compute_product_price(p_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with p as (
    select pr.weight_g, pr.purity, pr.metal,
           pr.markup_per_gram, pr.markup_per_piece,
           coalesce(pr.cost_price, 0) as cost_price
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
    + p.cost_price
  , 2)
  from p
  left join spot s on s.metal = p.metal
  left join cfg on true;
$$;

grant execute on function public.compute_product_price(uuid)
  to anon, authenticated, service_role;
