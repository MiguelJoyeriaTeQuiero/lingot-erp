-- =====================================================================
-- Migración 015: permitir que contabilidad emita documentos
-- =====================================================================
-- El trigger documents_contabilidad_update_guard bloqueaba el UPDATE de
-- series_id/number/code aunque emit_document sea security definer, porque
-- el trigger evalúa is_admin() con el JWT del usuario llamante.
-- Solución: añadir bypass mediante set_config local, que solo está activo
-- dentro de la transacción de emit_document.
-- =====================================================================

-- 1. Actualizar el guard para respetar el bypass
CREATE OR REPLACE FUNCTION public.documents_contabilidad_update_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF public.is_admin()
     OR current_setting('app.bypass_contabilidad_guard', true) = 'true'
  THEN
    RETURN new;
  END IF;
  IF new.doc_type                    IS DISTINCT FROM old.doc_type                    THEN RAISE EXCEPTION 'Sin permiso para modificar doc_type'; END IF;
  IF new.series_id                   IS DISTINCT FROM old.series_id                   THEN RAISE EXCEPTION 'Sin permiso para modificar series_id'; END IF;
  IF new.number                      IS DISTINCT FROM old.number                      THEN RAISE EXCEPTION 'Sin permiso para modificar number'; END IF;
  IF new.code                        IS DISTINCT FROM old.code                        THEN RAISE EXCEPTION 'Sin permiso para modificar code'; END IF;
  IF new.client_id                   IS DISTINCT FROM old.client_id                   THEN RAISE EXCEPTION 'Sin permiso para modificar client_id'; END IF;
  IF new.issue_date                  IS DISTINCT FROM old.issue_date                  THEN RAISE EXCEPTION 'Sin permiso para modificar issue_date'; END IF;
  IF new.due_date                    IS DISTINCT FROM old.due_date                    THEN RAISE EXCEPTION 'Sin permiso para modificar due_date'; END IF;
  IF new.subtotal                    IS DISTINCT FROM old.subtotal                    THEN RAISE EXCEPTION 'Sin permiso para modificar subtotal'; END IF;
  IF new.igic_total                  IS DISTINCT FROM old.igic_total                  THEN RAISE EXCEPTION 'Sin permiso para modificar igic_total'; END IF;
  IF new.total                       IS DISTINCT FROM old.total                       THEN RAISE EXCEPTION 'Sin permiso para modificar total'; END IF;
  IF new.converted_to_invoice_id     IS DISTINCT FROM old.converted_to_invoice_id     THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  IF new.source_albaran_id           IS DISTINCT FROM old.source_albaran_id           THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  IF new.rectification_of_invoice_id IS DISTINCT FROM old.rectification_of_invoice_id THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  RETURN new;
END $$;

-- 2. Actualizar emit_document para activar el bypass antes del UPDATE crítico
--    (reproduce íntegra la versión de la migración 011 + bypass)
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

  -- Bypass local: permite que el trigger no bloquee series_id/number/code
  PERFORM set_config('app.bypass_contabilidad_guard', 'true', true);

  UPDATE public.documents
  SET status    = 'emitido',
      series_id = ser.id,
      number    = assigned_number,
      code      = ser.prefix || '-' || padded || '/' || ser.year
  WHERE id = doc.id;

  PERFORM set_config('app.bypass_contabilidad_guard', 'false', true);

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
