-- =====================================================================
-- Lingot ERP — Migración 009: Eliminación de documentos con ajuste de serie
-- =====================================================================
-- RPC: delete_document(doc_id uuid)
--
-- Permite a un administrador eliminar cualquier documento (borrador o emitido).
-- Al eliminar:
--   1. Bloquea si el albarán ya fue convertido a factura.
--   2. Bloquea si existe una rectificativa EMITIDA que apunta a este documento.
--   3. Si el documento estaba emitido, revierte los movimientos de stock
--      (restaura stock_current de los productos afectados) y borra los
--      stock_movements ligados al documento.
--   4. Borra el documento (document_lines en cascada).
--   5. Recalcula next_number de la serie: MAX(number entre docs restantes) + 1.
--      Si no quedan docs en la serie, vuelve a 1.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.delete_document(doc_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  doc     public.documents;
  ser_id  uuid;
  line    record;
BEGIN
  -- Solo administradores
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar documentos';
  END IF;

  -- Lock y carga del documento
  SELECT * INTO doc FROM public.documents WHERE id = doc_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;

  -- No permitir si el albarán ya generó una factura
  IF doc.converted_to_invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede eliminar: este albarán ya fue convertido a factura. Elimina primero la factura generada.';
  END IF;

  -- No permitir si existe una rectificativa emitida que apunta a este documento
  IF EXISTS (
    SELECT 1 FROM public.documents
    WHERE rectification_of_invoice_id = doc_id
      AND status <> 'borrador'
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar: existe una factura rectificativa emitida que referencia este documento.';
  END IF;

  ser_id := doc.series_id;

  -- Si el documento está emitido, revertir movimientos de stock de salida
  IF doc.status <> 'borrador' THEN
    FOR line IN
      SELECT sm.product_id, sm.quantity
      FROM public.stock_movements sm
      WHERE sm.document_id = doc_id
        AND sm.movement_type = 'salida'
    LOOP
      UPDATE public.products
      SET stock_current = stock_current + line.quantity
      WHERE id = line.product_id;
    END LOOP;

    DELETE FROM public.stock_movements WHERE document_id = doc_id;
  END IF;

  -- Borrar documento (document_lines en cascada por FK on delete cascade)
  DELETE FROM public.documents WHERE id = doc_id;

  -- Recalcular next_number de la serie para que no queden huecos al final
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
