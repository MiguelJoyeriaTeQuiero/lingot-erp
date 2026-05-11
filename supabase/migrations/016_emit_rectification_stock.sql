-- =====================================================================
-- Lingot ERP — Migración 016: emit_document restaura stock en rectificativas
-- =====================================================================
-- Al emitir una factura rectificativa (rectification_of_invoice_id IS NOT NULL),
-- en lugar de descontar stock, se restituye el stock de los lotes originales.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.emit_document(doc_id uuid)
RETURNS public.documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  doc              public.documents;
  ser              public.doc_series;
  assigned_number  int;
  padded           text;
  line             record;
  lot_remaining    numeric;
  is_rectification boolean;
BEGIN
  SELECT * INTO doc FROM public.documents WHERE id = doc_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;
  IF doc.status <> 'borrador' THEN
    RAISE EXCEPTION 'Sólo se puede emitir un documento en estado borrador (actual: %)', doc.status;
  END IF;

  is_rectification := doc.rectification_of_invoice_id IS NOT NULL;

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

  IF is_rectification THEN
    -- ── Factura rectificativa: RESTAURAR stock ──────────────────────
    FOR line IN
      SELECT dl.*
      FROM public.document_lines dl
      JOIN public.products p ON p.id = dl.product_id
      WHERE dl.document_id = doc.id
        AND dl.product_id IS NOT NULL
        AND p.type = 'producto'
    LOOP
      INSERT INTO public.stock_movements (
        product_id, movement_type, quantity, document_id, reason, created_by
      ) VALUES (
        line.product_id, 'entrada', line.quantity, doc.id,
        'Rectificativa: devolución de stock', auth.uid()
      );

      UPDATE public.products
      SET stock_current = stock_current + line.quantity
      WHERE id = line.product_id;

      IF line.lot_id IS NOT NULL THEN
        UPDATE public.stock_lots
        SET quantity_remaining = quantity_remaining + line.quantity
        WHERE id = line.lot_id;
      END IF;
    END LOOP;

  ELSE
    -- ── Documento normal: DESCONTAR stock ───────────────────────────
    FOR line IN
      SELECT dl.*
      FROM public.document_lines dl
      JOIN public.products p ON p.id = dl.product_id
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
  END IF;

  SELECT * INTO doc FROM public.documents WHERE id = doc_id;
  RETURN doc;
END $$;
