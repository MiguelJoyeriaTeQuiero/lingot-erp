-- =====================================================================
-- Lingot ERP — Migración 011: Lotes de stock (identificación específica)
-- =====================================================================
-- 1. Tabla stock_lots: un lote por pedido de reposición.
--    Permite identificar exactamente a qué precio se compró cada unidad.
-- 2. Añade lot_id + unit_cost a document_lines para trazabilidad.
-- 3. emit_document: al emitir, descuenta quantity_remaining del lote
--    asignado en cada línea (con validación de stock suficiente).
-- 4. delete_document: al eliminar un emitido, restaura lot quantities.
-- 5. convert_albaran_to_invoice + create_rectification_invoice:
--    copian lot_id y unit_cost a las nuevas líneas para conservar la
--    cadena de trazabilidad.
-- =====================================================================

-- ---------- stock_lots ----------
CREATE TABLE IF NOT EXISTS public.stock_lots (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         uuid          NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  purchase_order_id  uuid          REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  quantity_total     numeric(12,3) NOT NULL CHECK (quantity_total > 0),
  quantity_remaining numeric(12,3) NOT NULL CHECK (quantity_remaining >= 0),
  cost_per_gram      numeric(12,4) NOT NULL CHECK (cost_per_gram > 0),
  cost_per_unit      numeric(14,4) NOT NULL CHECK (cost_per_unit > 0), -- cost_per_gram × weight_g
  order_date         date          NOT NULL DEFAULT current_date,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT chk_lot_remaining_lte_total CHECK (quantity_remaining <= quantity_total)
);

CREATE INDEX IF NOT EXISTS idx_stock_lots_product_date
  ON public.stock_lots (product_id, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_stock_lots_purchase_order
  ON public.stock_lots (purchase_order_id);

ALTER TABLE public.stock_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_lots_select ON public.stock_lots;
CREATE POLICY stock_lots_select ON public.stock_lots
  FOR SELECT USING (public.is_authenticated());

DROP POLICY IF EXISTS stock_lots_insert ON public.stock_lots;
CREATE POLICY stock_lots_insert ON public.stock_lots
  FOR INSERT WITH CHECK (public.is_authenticated());

DROP POLICY IF EXISTS stock_lots_admin_all ON public.stock_lots;
CREATE POLICY stock_lots_admin_all ON public.stock_lots
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- document_lines: trazabilidad de lote ----------
ALTER TABLE public.document_lines
  ADD COLUMN IF NOT EXISTS lot_id    uuid    REFERENCES public.stock_lots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_cost numeric(14,4);

CREATE INDEX IF NOT EXISTS idx_document_lines_lot
  ON public.document_lines (lot_id)
  WHERE lot_id IS NOT NULL;

-- =====================================================================
-- RPC emit_document — ahora también descuenta lotes
-- =====================================================================
CREATE OR REPLACE FUNCTION public.emit_document(doc_id uuid)
RETURNS public.documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  doc             public.documents;
  ser             public.doc_series;
  assigned_number int;
  padded          text;
  line            record;
  lot_remaining   numeric;
BEGIN
  SELECT * INTO doc FROM public.documents WHERE id = doc_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;
  IF doc.status <> 'borrador' THEN
    RAISE EXCEPTION 'Sólo se puede emitir un documento en estado borrador (actual: %)', doc.status;
  END IF;

  SELECT * INTO ser
  FROM public.doc_series
  WHERE doc_type = doc.doc_type AND year = EXTRACT(year FROM doc.issue_date)::int
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe serie para % del año %', doc.doc_type, EXTRACT(year FROM doc.issue_date);
  END IF;

  assigned_number := ser.next_number;
  padded := lpad(assigned_number::text, 4, '0');

  UPDATE public.doc_series SET next_number = next_number + 1 WHERE id = ser.id;

  UPDATE public.documents
  SET status    = 'emitido',
      series_id = ser.id,
      number    = assigned_number,
      code      = ser.prefix || '-' || padded || '/' || ser.year
  WHERE id = doc.id;

  FOR line IN
    SELECT dl.*, p.type AS product_type_val
    FROM public.document_lines dl
    LEFT JOIN public.products p ON p.id = dl.product_id
    WHERE dl.document_id = doc.id
      AND dl.product_id IS NOT NULL
      AND p.type = 'producto'
  LOOP
    INSERT INTO public.stock_movements (
      product_id, movement_type, quantity, document_id, reason, created_by
    ) VALUES (
      line.product_id, 'salida', line.quantity, doc.id,
      'Emisión ' || doc.doc_type::text, auth.uid()
    );

    UPDATE public.products
    SET stock_current = stock_current - line.quantity
    WHERE id = line.product_id;

    -- Descontar del lote si la línea tiene uno asignado
    IF line.lot_id IS NOT NULL THEN
      SELECT quantity_remaining INTO lot_remaining
      FROM public.stock_lots WHERE id = line.lot_id FOR UPDATE;

      IF lot_remaining < line.quantity THEN
        RAISE EXCEPTION
          'Stock insuficiente en el lote para la línea "%": necesita % u, disponibles %',
          line.description, line.quantity, lot_remaining;
      END IF;

      UPDATE public.stock_lots
      SET quantity_remaining = quantity_remaining - line.quantity
      WHERE id = line.lot_id;
    END IF;
  END LOOP;

  SELECT * INTO doc FROM public.documents WHERE id = doc_id;
  RETURN doc;
END $$;

-- =====================================================================
-- RPC delete_document — restaura lotes al revertir una emisión
-- =====================================================================
CREATE OR REPLACE FUNCTION public.delete_document(doc_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  doc    public.documents;
  ser_id uuid;
  line   record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar documentos';
  END IF;

  SELECT * INTO doc FROM public.documents WHERE id = doc_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;

  IF doc.converted_to_invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede eliminar: este albarán ya fue convertido a factura. Elimina primero la factura generada.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.documents
    WHERE rectification_of_invoice_id = doc_id AND status <> 'borrador'
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar: existe una factura rectificativa emitida que referencia este documento.';
  END IF;

  ser_id := doc.series_id;

  IF doc.status <> 'borrador' THEN
    -- Revertir stock general
    FOR line IN
      SELECT sm.product_id, sm.quantity
      FROM public.stock_movements sm
      WHERE sm.document_id = doc_id AND sm.movement_type = 'salida'
    LOOP
      UPDATE public.products
      SET stock_current = stock_current + line.quantity
      WHERE id = line.product_id;
    END LOOP;

    DELETE FROM public.stock_movements WHERE document_id = doc_id;

    -- Restaurar cantidades de lotes
    FOR line IN
      SELECT dl.lot_id, dl.quantity
      FROM public.document_lines dl
      WHERE dl.document_id = doc_id AND dl.lot_id IS NOT NULL
    LOOP
      UPDATE public.stock_lots
      SET quantity_remaining = quantity_remaining + line.quantity
      WHERE id = line.lot_id;
    END LOOP;
  END IF;

  DELETE FROM public.documents WHERE id = doc_id;

  IF ser_id IS NOT NULL THEN
    UPDATE public.doc_series
    SET next_number = (
      SELECT COALESCE(MAX(d.number), 0) + 1
      FROM public.documents d
      WHERE d.series_id = ser_id
    )
    WHERE id = ser_id;
  END IF;
END $$;

-- =====================================================================
-- RPC convert_albaran_to_invoice — copia lot_id y unit_cost
-- =====================================================================
CREATE OR REPLACE FUNCTION public.convert_albaran_to_invoice(albaran_id uuid)
RETURNS public.documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alb    public.documents;
  inv    public.documents;
  new_id uuid;
BEGIN
  SELECT * INTO alb FROM public.documents WHERE id = albaran_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Albarán no encontrado'; END IF;
  IF alb.doc_type <> 'albaran' THEN RAISE EXCEPTION 'El documento origen debe ser un albarán'; END IF;
  IF alb.status NOT IN ('emitido') THEN
    RAISE EXCEPTION 'Sólo se convierten albaranes en estado emitido (actual: %)', alb.status;
  END IF;
  IF alb.converted_to_invoice_id IS NOT NULL THEN RAISE EXCEPTION 'Este albarán ya fue convertido'; END IF;

  INSERT INTO public.documents (
    doc_type, status, client_id, issue_date, due_date, notes,
    subtotal, igic_total, total, source_albaran_id, created_by
  ) VALUES (
    'factura', 'borrador', alb.client_id, current_date, null, alb.notes,
    alb.subtotal, alb.igic_total, alb.total, alb.id, auth.uid()
  ) RETURNING id INTO new_id;

  INSERT INTO public.document_lines (
    document_id, position, product_id, description, quantity, unit_price,
    discount_pct, igic_rate, line_subtotal, line_igic, line_total,
    lot_id, unit_cost
  )
  SELECT
    new_id, position, product_id, description, quantity, unit_price,
    discount_pct, igic_rate, line_subtotal, line_igic, line_total,
    lot_id, unit_cost
  FROM public.document_lines
  WHERE document_id = alb.id
  ORDER BY position;

  UPDATE public.documents
  SET status = 'convertido', converted_to_invoice_id = new_id
  WHERE id = alb.id;

  SELECT * INTO inv FROM public.documents WHERE id = new_id;
  RETURN inv;
END $$;

-- =====================================================================
-- RPC create_rectification_invoice — copia lot_id y unit_cost
-- =====================================================================
CREATE OR REPLACE FUNCTION public.create_rectification_invoice(original_id uuid)
RETURNS public.documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  orig    public.documents;
  new_id  uuid;
  new_doc public.documents;
BEGIN
  SELECT * INTO orig FROM public.documents WHERE id = original_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;
  IF orig.doc_type <> 'factura' THEN RAISE EXCEPTION 'Solo se pueden rectificar facturas'; END IF;
  IF orig.status NOT IN ('emitido', 'pagado') THEN
    RAISE EXCEPTION 'Solo se rectifican facturas en estado emitido o pagado (actual: %)', orig.status;
  END IF;

  INSERT INTO public.documents (
    doc_type, status, client_id, issue_date, due_date, notes,
    subtotal, igic_total, total, rectification_of_invoice_id, created_by
  ) VALUES (
    'factura', 'borrador',
    orig.client_id, CURRENT_DATE, NULL,
    'Rectificativa de ' || COALESCE(orig.code, orig.id::text),
    orig.subtotal, orig.igic_total, orig.total, orig.id, auth.uid()
  ) RETURNING id INTO new_id;

  INSERT INTO public.document_lines (
    document_id, position, product_id, description, quantity, unit_price,
    discount_pct, igic_rate, line_subtotal, line_igic, line_total,
    lot_id, unit_cost
  )
  SELECT
    new_id, position, product_id, description, quantity, unit_price,
    discount_pct, igic_rate, line_subtotal, line_igic, line_total,
    lot_id, unit_cost
  FROM public.document_lines
  WHERE document_id = orig.id
  ORDER BY position;

  UPDATE public.documents SET status = 'rectificada' WHERE id = orig.id;

  SELECT * INTO new_doc FROM public.documents WHERE id = new_id;
  RETURN new_doc;
END $$;
