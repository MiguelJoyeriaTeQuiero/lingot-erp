-- =====================================================================
-- Migración 032: facturas rectificativas con serie propia (FRR) e
-- importes en negativo + tres fallos de stock
-- =====================================================================
-- 1. Serie propia: las rectificativas se numeran en FRR-0001/2026,
--    independiente de FAC (RD 1619/2012, art. 15: serie separada).
-- 2. Importes en negativo: la rectificativa se crea con las líneas de la
--    original en negativo (cantidad × −1). En las rectificativas:
--      · cantidad negativa  → devolución de piezas: vuelven al stock y al lote
--      · cantidad positiva  → ajuste económico (p. ej. rebaja con precio
--                             negativo): no mueve stock
--    Facturas normales y albaranes siguen sin admitir negativos.
-- 3. Cadena Veri*factu: con dos series los números se repiten, así que la
--    huella anterior se busca por momento de emisión (emitted_at) y no por
--    número. Los emitidos antes de esta migración no tienen emitted_at y
--    se ordenan, como hasta ahora, por número.
-- 4. Si falta la serie del año (p. ej. en enero de 2027), emit_document la
--    crea con el prefijo de la del año anterior, empezando en 1.
--
-- Fallos de stock (los datos ya afectados NO se corrigen aquí):
-- 5. Factura desde albarán: el albarán ya descontó el stock y el lote, y al
--    emitir la factura se volvía a descontar. Ahora solo se mueve la
--    diferencia si en el borrador se cambiaron productos, cantidades o lotes.
-- 6. Líneas sin lote: no tenían ningún control y el stock podía bajar sin
--    límite. Ahora se exige stock + unidades en envío, igual que con lote.
-- 7. record_stock_movement rechazaba una ENTRADA si el stock seguía negativo
--    tras sumarla (p. ej. al recibir un pedido con más preventas que
--    unidades): el pedido quedaba recibido sin sumar nada. Las entradas ya
--    no se rechazan; solo las salidas y los ajustes a la baja que dejarían
--    el stock en negativo.
--
-- emit_document parte de la versión de la 026 y conserva el bypass del guard
-- de contabilidad, la huella Veri*factu y la venta sobre stock en tránsito.
--
-- Las rectificativas ya emitidas se quedan como están (en positivo, en la
-- serie FAC): cambiar su total rompería su huella. El libro las sigue
-- restando; las nuevas ya vienen en negativo.
-- =====================================================================

-- ── 1. Series: distinguir la serie de rectificativas ────────────────────
ALTER TABLE public.doc_series
  ADD COLUMN IF NOT EXISTS is_rectification boolean NOT NULL DEFAULT false;

-- La única (doc_type, year) impedía tener FAC-2026 y FRR-2026 a la vez. Se
-- busca por columnas y no por nombre, por si no tiene el nombre por defecto.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.doc_series'::regclass
      AND con.contype = 'u'
      AND (
        SELECT array_agg(att.attname::text ORDER BY att.attname)
        FROM unnest(con.conkey) AS k(attnum)
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid AND att.attnum = k.attnum
      ) = ARRAY['doc_type', 'year']
  LOOP
    EXECUTE format('ALTER TABLE public.doc_series DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

DO $$ BEGIN
  ALTER TABLE public.doc_series
    ADD CONSTRAINT doc_series_doc_type_year_rect_key
    UNIQUE (doc_type, year, is_rectification);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

INSERT INTO public.doc_series (code, doc_type, year, prefix, next_number, is_rectification)
VALUES ('FRR-2026', 'factura', 2026, 'FRR', 1, true)
ON CONFLICT (code) DO NOTHING;

-- ── 2. Momento de emisión (orden de la cadena Veri*factu) ───────────────
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS emitted_at timestamptz;

-- Factura desde albarán cuya emisión solo movió la diferencia con el albarán
-- (las emitidas desde esta migración y las antiguas ya corregidas con
-- scripts/correccion-stock). delete_document lo usa para deshacer bien.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS albaran_stock_diff boolean NOT NULL DEFAULT false;

-- ── 3. Guard de contabilidad: proteger también emitted_at y la huella ──
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
  IF new.verifactu_hash              IS DISTINCT FROM old.verifactu_hash              THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  IF new.emitted_at                  IS DISTINCT FROM old.emitted_at                  THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  IF new.albaran_stock_diff          IS DISTINCT FROM old.albaran_stock_diff          THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  RETURN new;
END $$;

-- ── 4. Borradores de rectificativa existentes → en negativo ─────────────
DO $$
BEGIN
  PERFORM set_config('app.bypass_contabilidad_guard', 'true', true);

  UPDATE public.document_lines dl
  SET quantity      = -dl.quantity,
      line_subtotal = -dl.line_subtotal,
      line_igic     = -dl.line_igic,
      line_total    = -dl.line_total
  FROM public.documents d
  WHERE dl.document_id = d.id
    AND d.rectification_of_invoice_id IS NOT NULL
    AND d.status = 'borrador'
    AND dl.quantity > 0;

  UPDATE public.documents d
  SET subtotal   = t.subtotal,
      igic_total = t.igic_total,
      total      = t.subtotal + t.igic_total
  FROM (
    SELECT dl.document_id,
           COALESCE(SUM(dl.line_subtotal), 0) AS subtotal,
           COALESCE(SUM(dl.line_igic), 0)     AS igic_total
    FROM public.document_lines dl
    GROUP BY dl.document_id
  ) t
  WHERE t.document_id = d.id
    AND d.rectification_of_invoice_id IS NOT NULL
    AND d.status = 'borrador';

  PERFORM set_config('app.bypass_contabilidad_guard', 'false', true);
END $$;

-- ── 5. create_rectification_invoice: líneas en negativo ─────────────────
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
  IF orig.rectification_of_invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'No se puede rectificar una factura rectificativa';
  END IF;
  IF orig.status NOT IN ('emitido', 'pagado') THEN
    RAISE EXCEPTION 'Solo se rectifican facturas en estado emitido o pagado (actual: %)', orig.status;
  END IF;

  -- Importes de la original en negativo: anulación total por defecto. Se
  -- ajustan las líneas en el borrador (p. ej. devolver solo una pieza).
  INSERT INTO public.documents (
    doc_type, status, client_id, issue_date, due_date, notes,
    subtotal, igic_total, total, rectification_of_invoice_id, created_by
  ) VALUES (
    'factura', 'borrador',
    orig.client_id, CURRENT_DATE, NULL,
    'Rectificativa de ' || COALESCE(orig.code, orig.id::text),
    -orig.subtotal, -orig.igic_total, -orig.total, orig.id, auth.uid()
  ) RETURNING id INTO new_id;

  INSERT INTO public.document_lines (
    document_id, position, product_id, description, quantity, unit_price,
    discount_pct, igic_rate, line_subtotal, line_igic, line_total,
    lot_id, unit_cost
  )
  SELECT
    new_id, position, product_id, description, -quantity, unit_price,
    discount_pct, igic_rate, -line_subtotal, -line_igic, -line_total,
    lot_id, unit_cost
  FROM public.document_lines
  WHERE document_id = orig.id
  ORDER BY position;

  UPDATE public.documents SET status = 'rectificada' WHERE id = orig.id;

  SELECT * INTO new_doc FROM public.documents WHERE id = new_id;
  RETURN new_doc;
END $$;

-- ── 6. Comprobación de stock para una venta (con o sin lote) ────────────
-- Con lote: unidades que quedan en el lote + en envío (como en la 025).
-- Sin lote: stock del producto + en envío (antes no se comprobaba nada).
-- «En envío» = pedidos de reposición sin recibir. Las preventas ya dejan el
-- stock en negativo, así que stock + en envío es lo que queda por vender.
CREATE OR REPLACE FUNCTION public.check_stock_for_sale(
  p_product_id  uuid,
  p_lot_id      uuid,
  p_quantity    numeric,
  p_description text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  available   numeric;
  pending_qty numeric;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO pending_qty
  FROM public.purchase_orders
  WHERE product_id = p_product_id
    AND (received IS NULL OR received = false);

  IF p_lot_id IS NOT NULL THEN
    SELECT quantity_remaining INTO available
    FROM public.stock_lots WHERE id = p_lot_id FOR UPDATE;

    IF COALESCE(available, 0) + pending_qty < p_quantity THEN
      RAISE EXCEPTION
        'Stock insuficiente en el lote para la línea "%": necesita % u, disponibles % en lote y % en tránsito',
        p_description, p_quantity, COALESCE(available, 0), pending_qty;
    END IF;
  ELSE
    SELECT stock_current INTO available
    FROM public.products WHERE id = p_product_id FOR UPDATE;

    IF COALESCE(available, 0) + pending_qty < p_quantity THEN
      RAISE EXCEPTION
        'Stock insuficiente para la línea "%": necesita % u, hay % en stock y % en envío',
        p_description, p_quantity, COALESCE(available, 0), pending_qty;
    END IF;
  END IF;
END $$;

-- Solo la usa emit_document (security definer); no se expone como RPC
REVOKE EXECUTE ON FUNCTION public.check_stock_for_sale(uuid, uuid, numeric, text)
  FROM PUBLIC, anon, authenticated;

-- ── 7. emit_document: serie FRR, negativos, emitted_at y stock ──────────
CREATE OR REPLACE FUNCTION public.emit_document(doc_id uuid)
RETURNS public.documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  doc              public.documents;
  ser              public.doc_series;
  ser_year         int;
  ser_prefix       text;
  assigned_number  int;
  padded           text;
  new_code         text;
  line             record;
  returned_qty     numeric;
  v_rect           boolean;
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

  v_rect := doc.rectification_of_invoice_id IS NOT NULL;

  IF v_rect AND doc.doc_type <> 'factura' THEN
    RAISE EXCEPTION 'Una rectificativa tiene que ser una factura';
  END IF;

  -- Solo las rectificativas admiten negativos
  IF NOT v_rect AND EXISTS (
    SELECT 1 FROM public.document_lines
    WHERE document_id = doc.id AND (quantity <= 0 OR unit_price < 0)
  ) THEN
    RAISE EXCEPTION 'Solo las facturas rectificativas admiten cantidades o precios negativos';
  END IF;

  IF v_rect AND EXISTS (
    SELECT 1 FROM public.document_lines
    WHERE document_id = doc.id AND quantity = 0
  ) THEN
    RAISE EXCEPTION 'La cantidad de una línea no puede ser 0';
  END IF;

  -- ── SERIE ───────────────────────────────────────────────────────────────
  ser_year := EXTRACT(year FROM doc.issue_date)::int;

  SELECT s.* INTO ser
  FROM public.doc_series s
  WHERE s.doc_type = doc.doc_type
    AND s.year = ser_year
    AND s.is_rectification = v_rect
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Serie del año nueva: mismo prefijo que la última de su tipo
    SELECT s.prefix INTO ser_prefix
    FROM public.doc_series s
    WHERE s.doc_type = doc.doc_type
      AND s.is_rectification = v_rect
    ORDER BY s.year DESC
    LIMIT 1;

    ser_prefix := COALESCE(
      ser_prefix,
      CASE
        WHEN v_rect THEN 'FRR'
        WHEN doc.doc_type = 'factura' THEN 'FAC'
        ELSE 'ALB'
      END
    );

    INSERT INTO public.doc_series (code, doc_type, year, prefix, next_number, is_rectification)
    VALUES (ser_prefix || '-' || ser_year::text, doc.doc_type, ser_year, ser_prefix, 1, v_rect)
    ON CONFLICT DO NOTHING;

    SELECT s.* INTO ser
    FROM public.doc_series s
    WHERE s.doc_type = doc.doc_type
      AND s.year = ser_year
      AND s.is_rectification = v_rect
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No existe serie para % del año %', doc.doc_type, ser_year;
    END IF;
  END IF;

  assigned_number := ser.next_number;
  padded := lpad(assigned_number::text, 4, '0');
  new_code := ser.prefix || '-' || padded || '/' || ser.year::text;

  UPDATE public.doc_series SET next_number = next_number + 1 WHERE id = ser.id;

  -- ── HUELLA VERI*FACTU (solo facturas) ────────────────────────────────────
  -- Una sola cadena para FAC y FRR, en orden de emisión
  IF doc.doc_type = 'factura' THEN
    SELECT tax_id INTO nif_emisor FROM public.company_settings WHERE id = 1;

    SELECT verifactu_hash INTO prev_hash
    FROM public.documents
    WHERE doc_type = 'factura'
      AND status NOT IN ('borrador', 'cancelado')
      AND id <> doc_id
    ORDER BY emitted_at DESC NULLS LAST, number DESC
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
      verifactu_hash = new_hash,
      emitted_at     = now(),
      albaran_stock_diff = (doc.source_albaran_id IS NOT NULL AND NOT v_rect)
  WHERE id = doc.id;

  PERFORM set_config('app.bypass_contabilidad_guard', 'false', true);

  IF v_rect THEN
    -- ── Rectificativa: las cantidades negativas son piezas devueltas ──
    FOR line IN
      SELECT dl.*
      FROM public.document_lines dl
      JOIN public.products p ON p.id = dl.product_id
      WHERE dl.document_id = doc.id
        AND dl.product_id IS NOT NULL
        AND p.type = 'producto'
        AND dl.quantity < 0
    LOOP
      returned_qty := -line.quantity;

      INSERT INTO public.stock_movements (
        product_id, movement_type, quantity, document_id, reason, created_by
      ) VALUES (
        line.product_id, 'entrada', returned_qty, doc.id,
        'Rectificativa: devolución de stock', auth.uid()
      );

      UPDATE public.products
      SET stock_current = stock_current + returned_qty
      WHERE id = line.product_id;

      IF line.lot_id IS NOT NULL THEN
        UPDATE public.stock_lots
        SET quantity_remaining = quantity_remaining + returned_qty
        WHERE id = line.lot_id;
      END IF;
    END LOOP;

  ELSIF doc.source_albaran_id IS NOT NULL THEN
    -- ── Factura desde albarán: el albarán YA descontó stock y lotes ───
    -- Solo se mueve la diferencia (factura − albarán, por producto y lote)
    -- si en el borrador se cambiaron productos, cantidades o lotes.
    FOR line IN
      SELECT x.product_id, x.lot_id,
             SUM(x.qty)         AS quantity,
             MIN(x.description) AS description
      FROM (
        SELECT dl.product_id, dl.lot_id, dl.quantity AS qty, dl.description
        FROM public.document_lines dl
        WHERE dl.document_id = doc.id
        UNION ALL
        SELECT dl.product_id, dl.lot_id, -dl.quantity AS qty, dl.description
        FROM public.document_lines dl
        WHERE dl.document_id = doc.source_albaran_id
      ) x
      JOIN public.products p ON p.id = x.product_id
      WHERE p.type = 'producto'
      GROUP BY x.product_id, x.lot_id
      HAVING SUM(x.qty) <> 0
    LOOP
      IF line.quantity > 0 THEN
        PERFORM public.check_stock_for_sale(
          line.product_id, line.lot_id, line.quantity, line.description
        );
        INSERT INTO public.stock_movements (
          product_id, movement_type, quantity, document_id, reason, created_by
        ) VALUES (
          line.product_id, 'salida', line.quantity, doc.id,
          'Factura desde albarán: diferencia con el albarán', auth.uid()
        );
      ELSE
        INSERT INTO public.stock_movements (
          product_id, movement_type, quantity, document_id, reason, created_by
        ) VALUES (
          line.product_id, 'entrada', -line.quantity, doc.id,
          'Factura desde albarán: diferencia con el albarán', auth.uid()
        );
      END IF;

      UPDATE public.products
      SET stock_current = stock_current - line.quantity
      WHERE id = line.product_id;

      IF line.lot_id IS NOT NULL THEN
        UPDATE public.stock_lots
        SET quantity_remaining = quantity_remaining - line.quantity
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
      -- Con o sin lote: tiene que haber stock o unidades en envío que lo
      -- cubran (si las hay, el stock/lote queda en negativo hasta recibir)
      PERFORM public.check_stock_for_sale(
        line.product_id, line.lot_id, line.quantity, line.description
      );

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
        UPDATE public.stock_lots
        SET quantity_remaining = quantity_remaining - line.quantity
        WHERE id = line.lot_id;
      END IF;
    END LOOP;
  END IF;

  SELECT * INTO doc FROM public.documents WHERE id = doc_id;
  RETURN doc;
END $$;

-- ── 8. delete_document: deshacer exactamente lo que hizo la emisión ─────
-- Reproduce la versión de la 011 y corrige la reversión de rectificativas
-- (antes solo se deshacían las salidas y los lotes se sumaban siempre) y de
-- facturas desde albarán (desde esta migración solo mueven la diferencia).
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
    -- Revertir stock general según los movimientos que generó el documento
    FOR line IN
      SELECT sm.product_id, sm.quantity, sm.movement_type
      FROM public.stock_movements sm
      WHERE sm.document_id = doc_id
    LOOP
      IF line.movement_type = 'salida' THEN
        UPDATE public.products
        SET stock_current = stock_current + line.quantity
        WHERE id = line.product_id;
      ELSIF line.movement_type = 'entrada' THEN
        UPDATE public.products
        SET stock_current = stock_current - line.quantity
        WHERE id = line.product_id;
      END IF;
    END LOOP;

    DELETE FROM public.stock_movements WHERE document_id = doc_id;

    -- Restaurar cantidades de lotes (lo contrario de lo que hizo la emisión)
    IF doc.rectification_of_invoice_id IS NULL
       AND doc.source_albaran_id IS NOT NULL
       AND doc.albaran_stock_diff
    THEN
      -- Factura desde albarán (032+ o corregida): solo movió la diferencia
      FOR line IN
        SELECT x.lot_id, SUM(x.qty) AS quantity
        FROM (
          SELECT dl.product_id, dl.lot_id, dl.quantity AS qty
          FROM public.document_lines dl
          WHERE dl.document_id = doc_id
          UNION ALL
          SELECT dl.product_id, dl.lot_id, -dl.quantity AS qty
          FROM public.document_lines dl
          WHERE dl.document_id = doc.source_albaran_id
        ) x
        JOIN public.products p ON p.id = x.product_id
        WHERE p.type = 'producto' AND x.lot_id IS NOT NULL
        GROUP BY x.product_id, x.lot_id
        HAVING SUM(x.qty) <> 0
      LOOP
        UPDATE public.stock_lots
        SET quantity_remaining = quantity_remaining + line.quantity
        WHERE id = line.lot_id;
      END LOOP;
    ELSE
      FOR line IN
        SELECT dl.lot_id, dl.quantity
        FROM public.document_lines dl
        WHERE dl.document_id = doc_id AND dl.lot_id IS NOT NULL
      LOOP
        IF doc.rectification_of_invoice_id IS NULL THEN
          -- Venta: se había descontado la cantidad
          UPDATE public.stock_lots
          SET quantity_remaining = quantity_remaining + line.quantity
          WHERE id = line.lot_id;
        ELSIF doc.emitted_at IS NULL THEN
          -- Rectificativa anterior a la 032 (en positivo): se había sumado
          UPDATE public.stock_lots
          SET quantity_remaining = quantity_remaining - line.quantity
          WHERE id = line.lot_id;
        ELSIF line.quantity < 0 THEN
          -- Rectificativa nueva: se habían sumado las piezas devueltas
          UPDATE public.stock_lots
          SET quantity_remaining = quantity_remaining + line.quantity
          WHERE id = line.lot_id;
        END IF;
      END LOOP;
    END IF;
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

-- ── 9. record_stock_movement: una entrada nunca se rechaza ──────────────
-- Reproduce la versión de la 008. Antes rechazaba cualquier movimiento que
-- dejara el stock en negativo, también las ENTRADAS: al recibir un pedido con
-- más preventas que unidades, la entrada fallaba y no se sumaba nada. Ahora
-- solo se rechazan las salidas y los ajustes a la baja que lo dejarían en
-- negativo.
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
  -- Solo lo que resta stock puede rechazarse por dejarlo en negativo
  IF delta < 0 AND new_stock < 0 THEN
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
