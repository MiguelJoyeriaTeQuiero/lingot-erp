-- =====================================================================
-- Lingot ERP — Corrección de stock · 2. CORRECCIÓN
-- =====================================================================
-- Corrige el stock y los lotes que dejaron mal dos fallos ya arreglados en
-- la migración 032:
--   A. Facturas desde albarán que volvieron a descontar lo que ya había
--      descontado el albarán.
--   B. Pedidos recibidos cuya entrada de stock falló (solo los que
--      confirmes abajo, a partir de la consulta 2 del diagnóstico).
--
-- NO toca facturas, totales, números ni huellas Veri*factu: solo stock,
-- lotes, movimientos de corrección y la marca albaran_stock_diff.
-- Cada corrección queda en el Historial de movimientos con el motivo
-- «Corrección: …». Se puede ejecutar dos veces: lo ya corregido se salta.
--
-- Todo va en UN bloque: si cualquier cosa falla, no se aplica nada.
-- Antes de cambiar nada guarda una copia en el esquema «backups»
-- (no accesible desde la web ni la API). Se deshace con 3-deshacer.sql.
--
-- Cómo usarlo (editor SQL de Supabase):
--   1. Rellena pedidos_confirmados (o déjalo vacío).
--   2. Ejecuta tal cual: es un ENSAYO; termina con un mensaje en rojo
--      «SIMULACRO…» con lo que haría, y no cambia nada.
--   3. Si cuadra con el diagnóstico, cambia simulacro a false y ejecuta.
-- Hazlo cuando nadie esté usando el ERP (bloquea el stock unos segundos).
-- =====================================================================

DO $$
DECLARE
  -- ① ENSAYO: con true lo calcula todo y al final lo DESHACE.
  --    Pon false para aplicarlo de verdad.
  simulacro boolean := true;

  -- ② Pedidos recibidos que NO sumaron stock: los pedido_id que confirmes
  --    de la consulta 2 del diagnóstico, entre comillas y separados por
  --    comas (sin coma tras el último). Vacío = no se toca ningún pedido.
  --    Ejemplo: ARRAY['1b2c…-…', '9f8e…-…']::uuid[]
  --    Argor5: pedidos del 16/11 (10 + 10) y del 18/11 (5), recibidos sin
  --    entrada y sin ajuste que los compensara (los de sep y oct sí se
  --    compensaron a mano con los ajustes de +44 y +30).
  pedidos_confirmados uuid[] := ARRAY[
    '83fa39c1-fbab-45af-997f-3e186ee04e9c',
    '887acdd3-ec48-43f2-9903-1d8f39cfe487',
    '6d1f43d3-96d5-4cb5-ad0b-7e5ed330b87f'
  ]::uuid[];

  run_id      text := to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS');
  f           record;
  k           record;
  po          public.purchase_orders;
  prod        public.products;
  po_id       uuid;
  mv_id       uuid;
  new_lot_id  uuid;
  has_mov     boolean;
  u_doc       numeric;
  changed     boolean;
  n_fact      int     := 0;
  u_fact      numeric := 0;
  n_ped       int     := 0;
  u_ped       numeric := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents'
      AND column_name = 'albaran_stock_diff'
  ) THEN
    RAISE EXCEPTION 'Falta la migración 032: aplícala antes de corregir.';
  END IF;

  -- Nadie emite ni mueve stock mientras se corrige
  LOCK TABLE public.products, public.stock_lots, public.stock_movements,
             public.documents, public.purchase_orders
    IN SHARE ROW EXCLUSIVE MODE;

  -- ── Registro y copia ──────────────────────────────────────────────────
  CREATE SCHEMA IF NOT EXISTS backups;

  CREATE TABLE IF NOT EXISTS backups.stockfix_log (
    run        text        NOT NULL,
    kind       text        NOT NULL,   -- factura_desde_albaran | pedido_sin_entrada
    ref_id     uuid        NOT NULL,   -- factura o pedido corregido
    detail     text,
    units      numeric,
    applied_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (kind, ref_id)
  );

  -- Cada cambio, para poder deshacerlo exactamente (3-deshacer.sql)
  CREATE TABLE IF NOT EXISTS backups.stockfix_changes (
    run         text    NOT NULL,
    ref_id      uuid    NOT NULL,
    product_id  uuid,
    lot_id      uuid,
    stock_delta numeric NOT NULL DEFAULT 0,
    lot_delta   numeric NOT NULL DEFAULT 0,
    movement_id uuid,
    created_lot boolean NOT NULL DEFAULT false
  );

  -- Foto completa antes de tocar nada
  EXECUTE format('CREATE TABLE backups.%I AS SELECT id, sku, name, stock_current FROM public.products',
                 'stockfix_' || run_id || '_products');
  EXECUTE format('CREATE TABLE backups.%I AS SELECT * FROM public.stock_lots',
                 'stockfix_' || run_id || '_lots');
  EXECUTE format('CREATE TABLE backups.%I AS SELECT * FROM public.stock_movements',
                 'stockfix_' || run_id || '_movements');

  -- La marca albaran_stock_diff está protegida por el guard de contabilidad
  PERFORM set_config('app.bypass_contabilidad_guard', 'true', true);

  -- ── A. Facturas desde albarán con doble descuento ─────────────────────
  -- Se deja cada factura como si se hubiera emitido con la regla nueva
  -- (solo la diferencia con su albarán). No se borra ningún movimiento:
  -- se añade uno de corrección, así el historial se puede auditar y
  -- delete_document sigue deshaciendo bien la factura.
  FOR f IN
    SELECT d.id, d.code, a.code AS albaran, d.source_albaran_id
    FROM public.documents d
    JOIN public.documents a ON a.id = d.source_albaran_id
    WHERE d.doc_type = 'factura'
      AND d.rectification_of_invoice_id IS NULL
      AND d.status NOT IN ('borrador', 'cancelado')
      AND NOT d.albaran_stock_diff
    ORDER BY d.issue_date, d.number
  LOOP
    u_doc   := 0;
    changed := false;
    has_mov := EXISTS (SELECT 1 FROM public.stock_movements WHERE document_id = f.id);

    -- A1. Stock por producto: lo que restó la factura − lo que debía restar
    FOR k IN
      WITH descontado AS (
        SELECT sm.product_id,
               SUM(CASE sm.movement_type
                     WHEN 'salida'  THEN sm.quantity
                     WHEN 'entrada' THEN -sm.quantity
                     ELSE 0 END) AS q
        FROM public.stock_movements sm
        WHERE sm.document_id = f.id
        GROUP BY sm.product_id
      ),
      debia AS (
        SELECT x.product_id, SUM(x.qty) AS q
        FROM (
          SELECT dl.product_id, dl.quantity AS qty
          FROM public.document_lines dl WHERE dl.document_id = f.id
          UNION ALL
          SELECT dl.product_id, -dl.quantity
          FROM public.document_lines dl WHERE dl.document_id = f.source_albaran_id
        ) x
        JOIN public.products p ON p.id = x.product_id AND p.type = 'producto'
        GROUP BY x.product_id
      )
      SELECT COALESCE(d.product_id, b.product_id) AS product_id,
             COALESCE(d.q, 0) - COALESCE(b.q, 0)   AS exceso
      FROM descontado d
      FULL JOIN debia b ON b.product_id = d.product_id
      WHERE COALESCE(d.q, 0) <> COALESCE(b.q, 0)
    LOOP
      INSERT INTO public.stock_movements (
        product_id, movement_type, quantity, document_id, reason, created_by
      ) VALUES (
        k.product_id,
        (CASE WHEN k.exceso > 0 THEN 'entrada' ELSE 'salida' END)::movement_type,
        abs(k.exceso),
        f.id,
        format('Corrección: doble descuento con el albarán %s', COALESCE(f.albaran, '(sin código)')),
        NULL
      )
      RETURNING id INTO mv_id;

      UPDATE public.products
      SET stock_current = stock_current + k.exceso
      WHERE id = k.product_id;

      INSERT INTO backups.stockfix_changes (run, ref_id, product_id, stock_delta, movement_id)
      VALUES (run_id, f.id, k.product_id, k.exceso, mv_id);

      u_doc   := u_doc + k.exceso;
      changed := true;
    END LOOP;

    -- A2. Lotes: el albarán ya había restado sus lotes y la factura los
    --     volvió a restar → se devuelven los del albarán. (Si la factura no
    --     llegó a mover nada, tampoco tocó sus lotes: se descuentan los suyos.)
    FOR k IN
      SELECT x.lot_id, SUM(x.qty) AS exceso
      FROM (
        SELECT dl.lot_id, dl.quantity AS qty
        FROM public.document_lines dl
        JOIN public.products p ON p.id = dl.product_id AND p.type = 'producto'
        WHERE dl.document_id = f.source_albaran_id AND dl.lot_id IS NOT NULL
        UNION ALL
        SELECT dl.lot_id, -dl.quantity
        FROM public.document_lines dl
        JOIN public.products p ON p.id = dl.product_id AND p.type = 'producto'
        WHERE dl.document_id = f.id AND dl.lot_id IS NOT NULL AND NOT has_mov
      ) x
      JOIN public.stock_lots l ON l.id = x.lot_id
      GROUP BY x.lot_id
      HAVING SUM(x.qty) <> 0
    LOOP
      UPDATE public.stock_lots
      SET quantity_remaining = quantity_remaining + k.exceso
      WHERE id = k.lot_id;

      INSERT INTO backups.stockfix_changes (run, ref_id, lot_id, lot_delta)
      VALUES (run_id, f.id, k.lot_id, k.exceso);

      changed := true;
    END LOOP;

    -- Desde ahora delete_document la trata con la regla nueva
    UPDATE public.documents SET albaran_stock_diff = true WHERE id = f.id;

    INSERT INTO backups.stockfix_log (run, kind, ref_id, detail, units)
    VALUES (
      run_id, 'factura_desde_albaran', f.id,
      format('%s (albarán %s): %s u vuelven al stock',
             COALESCE(f.code, f.id::text), COALESCE(f.albaran, '—'), u_doc),
      u_doc
    );

    IF changed THEN
      n_fact := n_fact + 1;
      u_fact := u_fact + u_doc;
    END IF;
  END LOOP;

  -- ── B. Pedidos recibidos sin entrada (solo los confirmados) ───────────
  FOREACH po_id IN ARRAY pedidos_confirmados LOOP
    SELECT * INTO po FROM public.purchase_orders WHERE id = po_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pedido % no encontrado: revisa pedidos_confirmados', po_id;
    END IF;
    IF NOT po.received THEN
      RAISE EXCEPTION 'El pedido % sigue en envío (no recibido): no se toca', po_id;
    END IF;

    -- Ya corregido en una ejecución anterior
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM backups.stockfix_log
      WHERE kind = 'pedido_sin_entrada' AND ref_id = po_id
    );

    SELECT * INTO prod FROM public.products WHERE id = po.product_id;

    INSERT INTO public.stock_movements (
      product_id, movement_type, quantity, document_id, reason, created_by
    ) VALUES (
      po.product_id, 'entrada', po.quantity, NULL,
      format('Corrección: entrada no registrada del pedido del %s',
             to_char(po.order_date, 'DD/MM/YYYY')),
      NULL
    )
    RETURNING id INTO mv_id;

    UPDATE public.products
    SET stock_current = stock_current + po.quantity
    WHERE id = po.product_id;

    INSERT INTO backups.stockfix_changes (run, ref_id, product_id, stock_delta, movement_id)
    VALUES (run_id, po.id, po.product_id, po.quantity, mv_id);

    -- El lote se crea al registrar el pedido; solo si faltara se crea aquí,
    -- igual que lo haría la recepción
    IF NOT EXISTS (SELECT 1 FROM public.stock_lots WHERE purchase_order_id = po.id) THEN
      INSERT INTO public.stock_lots (
        product_id, purchase_order_id, quantity_total, quantity_remaining,
        cost_per_gram, cost_per_unit, order_date
      ) VALUES (
        po.product_id, po.id, po.quantity, po.quantity,
        po.cost_per_gram,
        CASE WHEN COALESCE(prod.weight_g, 0) > 0
             THEN po.cost_per_gram * prod.weight_g
             ELSE po.cost_per_gram END,
        po.order_date
      )
      RETURNING id INTO new_lot_id;

      INSERT INTO backups.stockfix_changes (run, ref_id, product_id, lot_id, lot_delta, created_lot)
      VALUES (run_id, po.id, po.product_id, new_lot_id, po.quantity, true);
    END IF;

    INSERT INTO backups.stockfix_log (run, kind, ref_id, detail, units)
    VALUES (
      run_id, 'pedido_sin_entrada', po.id,
      format('%s: +%s u del pedido del %s', prod.name, po.quantity,
             to_char(po.order_date, 'DD/MM/YYYY')),
      po.quantity
    );

    n_ped := n_ped + 1;
    u_ped := u_ped + po.quantity;
  END LOOP;

  PERFORM set_config('app.bypass_contabilidad_guard', 'false', true);

  -- ── Fin ───────────────────────────────────────────────────────────────
  IF simulacro THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = format(
        'SIMULACRO, no se ha aplicado nada. Se corregirían %s facturas desde albarán (%s u vuelven al stock) y %s pedidos (%s u entran). Para aplicarlo, cambia simulacro a false y vuelve a ejecutar.',
        n_fact, u_fact, n_ped, u_ped
      );
  END IF;

  RAISE NOTICE 'Corrección % aplicada: % facturas (% u) y % pedidos (% u).',
    run_id, n_fact, u_fact, n_ped, u_ped;
END $$;

-- Resumen de lo aplicado (en el simulacro no se llega aquí)
SELECT run, kind, detail, units, applied_at
FROM backups.stockfix_log
ORDER BY applied_at DESC, kind, detail;
