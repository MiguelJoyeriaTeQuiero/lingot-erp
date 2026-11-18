-- =====================================================================
-- Lingot ERP — Corrección de stock · 3. DESHACER una corrección
-- =====================================================================
-- Revierte exactamente los cambios de una ejecución de 2-correccion.sql,
-- usando lo anotado en backups.stockfix_changes: resta lo que se sumó al
-- stock y a los lotes, borra los movimientos «Corrección: …» y quita la
-- marca albaran_stock_diff. No restaura fotos antiguas, así que respeta las
-- ventas y recepciones que haya habido después.
--
-- Pon en run_a_deshacer el valor de la columna «run» del resumen
-- (p. ej. 20261120_103015). Todo va en un bloque: si algo falla, no se
-- deshace nada.
-- =====================================================================

DO $$
DECLARE
  run_a_deshacer text := 'AAAAMMDD_HHMMSS';
  c record;
BEGIN
  IF to_regclass('backups.stockfix_log') IS NULL THEN
    RAISE EXCEPTION 'No se ha aplicado ninguna corrección todavía';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM backups.stockfix_log WHERE run = run_a_deshacer) THEN
    RAISE EXCEPTION 'No hay ninguna corrección con run %', run_a_deshacer;
  END IF;

  LOCK TABLE public.products, public.stock_lots, public.stock_movements,
             public.documents
    IN SHARE ROW EXCLUSIVE MODE;

  PERFORM set_config('app.bypass_contabilidad_guard', 'true', true);

  FOR c IN
    SELECT * FROM backups.stockfix_changes WHERE run = run_a_deshacer
  LOOP
    IF c.stock_delta <> 0 THEN
      UPDATE public.products
      SET stock_current = stock_current - c.stock_delta
      WHERE id = c.product_id;
    END IF;

    IF c.movement_id IS NOT NULL THEN
      DELETE FROM public.stock_movements WHERE id = c.movement_id;
    END IF;

    IF c.created_lot THEN
      IF EXISTS (SELECT 1 FROM public.document_lines WHERE lot_id = c.lot_id) THEN
        RAISE EXCEPTION 'El lote % creado por la corrección ya se ha usado en ventas: no se puede deshacer automáticamente', c.lot_id;
      END IF;
      DELETE FROM public.stock_lots WHERE id = c.lot_id;
    ELSIF c.lot_delta <> 0 THEN
      UPDATE public.stock_lots
      SET quantity_remaining = quantity_remaining - c.lot_delta
      WHERE id = c.lot_id;
    END IF;
  END LOOP;

  UPDATE public.documents
  SET albaran_stock_diff = false
  WHERE id IN (
    SELECT ref_id FROM backups.stockfix_log
    WHERE run = run_a_deshacer AND kind = 'factura_desde_albaran'
  );

  DELETE FROM backups.stockfix_changes WHERE run = run_a_deshacer;
  DELETE FROM backups.stockfix_log     WHERE run = run_a_deshacer;

  PERFORM set_config('app.bypass_contabilidad_guard', 'false', true);

  RAISE NOTICE 'Corrección % deshecha.', run_a_deshacer;
END $$;
