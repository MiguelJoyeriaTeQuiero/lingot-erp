-- =====================================================================
-- Lingot ERP — Migración 019: VERI*FACTU — cadena de huellas SHA-256
-- Real Decreto 1007/2023 — obligatorio desde ene/jul 2027
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS verifactu_hash text;

-- Reemplazar emit_document con cálculo de huella SHA-256 encadenada
CREATE OR REPLACE FUNCTION public.emit_document(doc_id uuid)
RETURNS public.documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  doc              public.documents;
  ser              public.doc_series;
  assigned_number  int;
  padded           text;
  new_code         text;
  line             record;
  lot_remaining    numeric;
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

  -- ── HUELLA VERI*FACTU ─────────────────────────────────────────────────────
  -- Solo facturas (albaranes no requieren cadena de huellas)
  -- SHA-256( huella_anterior || NIF_emisor || num_serie || fecha || importe )
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
      digest(
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

  UPDATE public.documents
  SET status         = 'emitido',
      series_id      = ser.id,
      number         = assigned_number,
      code           = new_code,
      verifactu_hash = new_hash
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
