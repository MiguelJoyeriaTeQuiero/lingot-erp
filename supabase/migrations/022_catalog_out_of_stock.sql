-- Permite marcar manualmente un producto como "sin stock" en el catálogo público
-- aunque tenga stock_current > 0 en inventario.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS catalog_out_of_stock boolean NOT NULL DEFAULT false;
