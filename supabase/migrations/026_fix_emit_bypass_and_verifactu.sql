-- =====================================================================
-- Migración 026: restaurar bypass de contabilidad + hash Veri*factu en emit_document
-- =====================================================================
-- La migración 025 (venta sobre stock en tránsito) reescribió emit_document
-- y volvió a perder dos cosas que ya estaban en la 022:
--   1. set_config('app.bypass_contabilidad_guard', 'true') alrededor del
--      UPDATE documents → el trigger documents_contabilidad_update_guard
--      bloqueaba series_id/number/code al emitir con rol contabilidad
--      ("Sin permiso para modificar ...").
--   2. El cálculo y guardado de verifactu_hash (y 'extensions' en search_path)
--      → las facturas emitidas tras la 025 rompían la cadena Veri*factu.
--
-- Esta migración fusiona la lógica de stock en tránsito (025) con el bypass
-- y el hash Veri*factu (022).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.emit_document(doc_id uuid)
RETURNS public.documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  doc              public.documents;
  ser              public.doc_series;
  assigned_number  int;
  padded           text;
  new_code         text;
  line             record;
  lot_remaining    numeric;
  pending_qty      numeric;
  is_rectification boolean;
  prev_hash        text;
  nif_emisor       text;
  new_hash         text;
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
  new_code := ser.prefix || '-' || padded || '/' || ser.year::text;

  UPDATE public.doc_series SET next_number = next_number + 1 WHERE id = ser.id;

  -- ── HUELLA VERI*FACTU (solo facturas) ────────────────────────────────────
  IF doc.doc_type = 'factura' THEN
    SELECT tax_id INTO nif_emisor FROM public.company_settings WHERE id = 1;

    SELECT verifactu_hash INTO prev_hash
    FROM public.documents
    WHERE doc_type = 'factura'
      AND status NOT IN ('borrador', 'cancelado')
      AND id <> doc_id
    ORDER BY number DESC
    LIMIT 1;

    new_hash := encode(
      extensions.digest(
        coalesce(prev_hash, '') ||
        coalesce(nif_emisor, '') ||
        new_code ||
        doc.issue_date::text ||
        doc.total::text,
        'sha256'
      ),
      'hex'
    );
  END IF;

  -- Bypass: permite que el trigger no bloquee series_id/number/code al rol contabilidad
  PERFORM set_config('app.bypass_contabilidad_guard', 'true', true);

  UPDATE public.documents
  SET status         = 'emitido',
      series_id      = ser.id,
      number         = assigned_number,
      code           = new_code,
      verifactu_hash = new_hash
  WHERE id = doc.id;

  PERFORM set_config('app.bypass_contabilidad_guard', 'false', true);

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
          -- Comprobar si los pedidos pendientes cubren la diferencia
          SELECT COALESCE(SUM(quantity), 0) INTO pending_qty
          FROM public.purchase_orders
          WHERE product_id = line.product_id
            AND (received IS NULL OR received = false);

          IF (lot_remaining + pending_qty) < line.quantity THEN
            RAISE EXCEPTION
              'Stock insuficiente en el lote para la línea "%": necesita % u, disponibles % en lote y % en tránsito',
              line.description, line.quantity, lot_remaining, pending_qty;
          END IF;
          -- Hay stock en tránsito que cubre la diferencia: se permite
          -- (lot_remaining quedará negativo hasta que llegue el pedido)
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
