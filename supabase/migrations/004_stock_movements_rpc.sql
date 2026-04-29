-- ============================================================================
-- Migración 004: RPC atómica para registrar movimientos de stock
-- ============================================================================
-- record_stock_movement: en una sola transacción bloquea el producto, valida
-- y aplica el delta sobre stock_current según movement_type. Convención:
--   - entrada: quantity ≥ 0, suma al stock
--   - salida:  quantity ≥ 0, resta del stock (no permite negativos)
--   - ajuste:  quantity puede ser ±, se aplica con su signo
-- Devuelve la fila stock_movements creada.
-- ============================================================================

create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_movement_type movement_type,
  p_quantity numeric,
  p_reason text default null,
  p_document_id uuid default null
) returns public.stock_movements
language plpgsql security definer set search_path = public as $$
declare
  prod public.products;
  delta numeric;
  new_stock numeric;
  mv public.stock_movements;
  stored_qty numeric;
begin
  if p_quantity is null or p_quantity = 0 then
    raise exception 'La cantidad del movimiento no puede ser 0';
  end if;

  select * into prod from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;
  if prod.type <> 'producto' then
    raise exception 'Sólo los productos físicos pueden tener movimientos de stock';
  end if;

  if p_movement_type = 'entrada' then
    if p_quantity < 0 then raise exception 'Una entrada debe ser positiva'; end if;
    delta := abs(p_quantity);
    stored_qty := abs(p_quantity);
  elsif p_movement_type = 'salida' then
    if p_quantity < 0 then raise exception 'Una salida debe ser positiva'; end if;
    delta := -abs(p_quantity);
    stored_qty := abs(p_quantity);
  else
    -- ajuste: respeta el signo del input
    delta := p_quantity;
    stored_qty := p_quantity;
  end if;

  new_stock := prod.stock_current + delta;
  if new_stock < 0 then
    raise exception 'Stock insuficiente para "%": actual %, movimiento %',
      prod.name, prod.stock_current, delta;
  end if;

  update public.products
  set stock_current = new_stock
  where id = prod.id;

  insert into public.stock_movements (
    product_id, movement_type, quantity, document_id, reason, created_by
  ) values (
    p_product_id, p_movement_type, stored_qty, p_document_id, p_reason, auth.uid()
  )
  returning * into mv;

  return mv;
end $$;

-- Permitir que el rol authenticated invoque la función. Internamente la
-- función es security definer y aplica las validaciones; los chequeos de
-- rol se delegan en RLS sobre las tablas (admin all, contabilidad solo lee).
grant execute on function public.record_stock_movement(uuid, movement_type, numeric, text, uuid)
  to authenticated;
