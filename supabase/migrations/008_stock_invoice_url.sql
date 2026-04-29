-- ============================================================================
-- Migración 008: URL de factura de compra en movimientos de stock
-- ============================================================================

-- Columna para almacenar la URL del documento de compra adjunto
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS invoice_url text;

-- Bucket de Supabase Storage para facturas de compra
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'purchase-invoices',
  'purchase-invoices',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política: usuarios autenticados pueden subir archivos
DROP POLICY IF EXISTS purchase_invoices_insert ON storage.objects;
CREATE POLICY purchase_invoices_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'purchase-invoices');

-- Política: usuarios autenticados pueden leer archivos
DROP POLICY IF EXISTS purchase_invoices_select ON storage.objects;
CREATE POLICY purchase_invoices_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'purchase-invoices');

-- Política: usuarios autenticados pueden borrar sus propios archivos
DROP POLICY IF EXISTS purchase_invoices_delete ON storage.objects;
CREATE POLICY purchase_invoices_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'purchase-invoices');

-- Actualizar el RPC para aceptar p_invoice_url
CREATE OR REPLACE FUNCTION public.record_stock_movement(
  p_product_id   uuid,
  p_movement_type movement_type,
  p_quantity     numeric,
  p_reason       text    DEFAULT NULL,
  p_document_id  uuid    DEFAULT NULL,
  p_invoice_url  text    DEFAULT NULL
) RETURNS public.stock_movements
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prod        public.products;
  delta       numeric;
  new_stock   numeric;
  mv          public.stock_movements;
  stored_qty  numeric;
BEGIN
  IF p_quantity IS NULL OR p_quantity = 0 THEN
    RAISE EXCEPTION 'La cantidad del movimiento no puede ser 0';
  END IF;

  SELECT * INTO prod FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  IF prod.type <> 'producto' THEN
    RAISE EXCEPTION 'Sólo los productos físicos pueden tener movimientos de stock';
  END IF;

  IF p_movement_type = 'entrada' THEN
    IF p_quantity < 0 THEN RAISE EXCEPTION 'Una entrada debe ser positiva'; END IF;
    delta      := abs(p_quantity);
    stored_qty := abs(p_quantity);
  ELSIF p_movement_type = 'salida' THEN
    IF p_quantity < 0 THEN RAISE EXCEPTION 'Una salida debe ser positiva'; END IF;
    delta      := -abs(p_quantity);
    stored_qty := abs(p_quantity);
  ELSE
    delta      := p_quantity;
    stored_qty := p_quantity;
  END IF;

  new_stock := prod.stock_current + delta;
  IF new_stock < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente para "%": actual %, movimiento %',
      prod.name, prod.stock_current, delta;
  END IF;

  UPDATE public.products SET stock_current = new_stock WHERE id = prod.id;

  INSERT INTO public.stock_movements (
    product_id, movement_type, quantity, document_id, reason, invoice_url, created_by
  ) VALUES (
    p_product_id, p_movement_type, stored_qty,
    p_document_id, p_reason, p_invoice_url, auth.uid()
  )
  RETURNING * INTO mv;

  RETURN mv;
END $$;

GRANT EXECUTE ON FUNCTION public.record_stock_movement(uuid, movement_type, numeric, text, uuid, text)
  TO authenticated;
