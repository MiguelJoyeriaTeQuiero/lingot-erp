-- =====================================================================
-- Lingot ERP — Corrección de stock · 1. DIAGNÓSTICO (solo lectura)
-- =====================================================================
-- No cambia nada. Ejecuta cada consulta POR SEPARADO en el editor SQL de
-- Supabase (selecciona el bloque y pulsa Run): el editor solo muestra el
-- resultado de la última consulta que ejecutas.
--
-- Requisito: la migración 032 aplicada (usa documents.albaran_stock_diff).
-- Después de corregir, la 1 y la 2 deben salir vacías.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- 1. FACTURAS DESDE ALBARÁN que descontaron el stock por segunda vez
--    Una fila por factura y producto.
--    · descontado_por_factura: lo que restó la factura al emitirse
--    · debia_descontar: lo que tenía que restar (factura − albarán;
--      normalmente 0, porque el albarán ya lo restó)
--    · a_devolver: lo que volverá al stock con la corrección
-- ─────────────────────────────────────────────────────────────────────
WITH afectadas AS (
  SELECT f.id, f.code AS factura, a.code AS albaran, f.issue_date, f.status,
         f.source_albaran_id
  FROM public.documents f
  JOIN public.documents a ON a.id = f.source_albaran_id
  WHERE f.doc_type = 'factura'
    AND f.rectification_of_invoice_id IS NULL
    AND f.status NOT IN ('borrador', 'cancelado')
    AND NOT f.albaran_stock_diff
),
descontado AS (
  SELECT sm.document_id, sm.product_id,
         SUM(CASE sm.movement_type
               WHEN 'salida'  THEN sm.quantity
               WHEN 'entrada' THEN -sm.quantity
               ELSE 0 END) AS q
  FROM public.stock_movements sm
  JOIN afectadas af ON af.id = sm.document_id
  GROUP BY sm.document_id, sm.product_id
),
debia AS (
  SELECT x.doc_id AS document_id, x.product_id, SUM(x.qty) AS q
  FROM (
    SELECT af.id AS doc_id, dl.product_id, dl.quantity AS qty
    FROM afectadas af JOIN public.document_lines dl ON dl.document_id = af.id
    UNION ALL
    SELECT af.id, dl.product_id, -dl.quantity
    FROM afectadas af JOIN public.document_lines dl ON dl.document_id = af.source_albaran_id
  ) x
  JOIN public.products p ON p.id = x.product_id AND p.type = 'producto'
  GROUP BY x.doc_id, x.product_id
),
claves AS (
  SELECT document_id, product_id FROM descontado
  UNION
  SELECT document_id, product_id FROM debia
)
SELECT af.factura,
       af.albaran,
       af.issue_date              AS fecha,
       af.status                  AS estado,
       p.sku,
       p.name                     AS producto,
       COALESCE(d.q, 0)           AS descontado_por_factura,
       COALESCE(b.q, 0)           AS debia_descontar,
       COALESCE(d.q, 0) - COALESCE(b.q, 0) AS a_devolver
FROM claves k
JOIN afectadas af      ON af.id = k.document_id
JOIN public.products p ON p.id = k.product_id
LEFT JOIN descontado d ON d.document_id = k.document_id AND d.product_id = k.product_id
LEFT JOIN debia b      ON b.document_id = k.document_id AND b.product_id = k.product_id
WHERE COALESCE(d.q, 0) <> COALESCE(b.q, 0)
ORDER BY af.issue_date, af.factura, p.name;


-- ─────────────────────────────────────────────────────────────────────
-- 2. PEDIDOS RECIBIDOS SIN SU ENTRADA DE STOCK
--    No hay enlace directo pedido ↔ movimiento, así que se compara, para
--    cada producto y cantidad, cuántos pedidos están recibidos y cuántas
--    entradas «Reposición…» hay. Si hay más pedidos que entradas, salen
--    TODOS los pedidos de ese grupo: decide tú cuáles no sumaron (suelen
--    ser los que dieron el aviso «error en stock») y copia su pedido_id
--    en 2-correccion.sql.
--    OJO: si el stock de un pedido entró con otro motivo (entrada manual,
--    conteo…), aquí sale como «sin entrada» aunque sí entrara. Antes de
--    confirmar un pedido, compruébalo con la consulta 5.
-- ─────────────────────────────────────────────────────────────────────
WITH recibidos AS (
  SELECT po.id, po.product_id, po.quantity, po.order_date, po.received_at,
         po.supplier_name
  FROM public.purchase_orders po
  WHERE po.received = true
),
entradas AS (
  SELECT sm.product_id, sm.quantity, count(*) AS n
  FROM public.stock_movements sm
  WHERE sm.movement_type = 'entrada'
    AND sm.document_id IS NULL
    AND (sm.reason LIKE 'Reposición%'
         OR sm.reason LIKE 'Corrección: entrada no registrada%')
  GROUP BY sm.product_id, sm.quantity
),
grupos AS (
  SELECT r.product_id, r.quantity, count(*) AS pedidos,
         COALESCE(MAX(e.n), 0) AS entradas
  FROM recibidos r
  LEFT JOIN entradas e ON e.product_id = r.product_id AND e.quantity = r.quantity
  GROUP BY r.product_id, r.quantity
)
SELECT p.sku,
       p.name                     AS producto,
       r.id                       AS pedido_id,
       r.quantity                 AS unidades,
       r.order_date               AS fecha_pedido,
       r.received_at              AS recibido,
       r.supplier_name            AS proveedor,
       g.pedidos                  AS pedidos_recibidos_iguales,
       g.entradas                 AS entradas_encontradas,
       g.pedidos - g.entradas     AS faltan_en_el_grupo
FROM grupos g
JOIN recibidos r       ON r.product_id = g.product_id AND r.quantity = g.quantity
JOIN public.products p ON p.id = g.product_id
WHERE g.pedidos > g.entradas
ORDER BY p.name, r.received_at;


-- ─────────────────────────────────────────────────────────────────────
-- 3. STOCK POR PRODUCTO: actual, doble descuento y cómo quedaría
--    Solo productos en negativo, con doble descuento o descuadrados.
--    · sin_movimiento: diferencia entre el stock y la suma de sus
--      movimientos (p. ej. stock puesto al dar de alta el producto)
--    · stock_tras_corregir: sin contar los pedidos de la consulta 2,
--      que se suman aparte según los que confirmes
-- ─────────────────────────────────────────────────────────────────────
WITH afectadas AS (
  SELECT f.id, f.source_albaran_id
  FROM public.documents f
  WHERE f.doc_type = 'factura'
    AND f.source_albaran_id IS NOT NULL
    AND f.rectification_of_invoice_id IS NULL
    AND f.status NOT IN ('borrador', 'cancelado')
    AND NOT f.albaran_stock_diff
),
descontado AS (
  SELECT sm.product_id,
         SUM(CASE sm.movement_type
               WHEN 'salida'  THEN sm.quantity
               WHEN 'entrada' THEN -sm.quantity
               ELSE 0 END) AS q
  FROM public.stock_movements sm
  JOIN afectadas af ON af.id = sm.document_id
  GROUP BY sm.product_id
),
debia AS (
  SELECT x.product_id, SUM(x.qty) AS q
  FROM (
    SELECT dl.product_id, dl.quantity AS qty
    FROM afectadas af JOIN public.document_lines dl ON dl.document_id = af.id
    UNION ALL
    SELECT dl.product_id, -dl.quantity
    FROM afectadas af JOIN public.document_lines dl ON dl.document_id = af.source_albaran_id
  ) x
  JOIN public.products p ON p.id = x.product_id AND p.type = 'producto'
  GROUP BY x.product_id
),
movimientos AS (
  SELECT product_id,
         SUM(CASE movement_type
               WHEN 'entrada' THEN quantity
               WHEN 'salida'  THEN -quantity
               ELSE quantity END) AS q
  FROM public.stock_movements
  GROUP BY product_id
),
calc AS (
  SELECT p.sku, p.name, p.stock_current,
         COALESCE(m.q, 0) AS suma_movimientos,
         COALESCE(d.q, 0) - COALESCE(b.q, 0) AS doble_descuento
  FROM public.products p
  LEFT JOIN movimientos m ON m.product_id = p.id
  LEFT JOIN descontado d  ON d.product_id = p.id
  LEFT JOIN debia b       ON b.product_id = p.id
  WHERE p.type = 'producto'
)
SELECT sku,
       name                                AS producto,
       stock_current                       AS stock_actual,
       suma_movimientos,
       stock_current - suma_movimientos    AS sin_movimiento,
       doble_descuento,
       stock_current + doble_descuento     AS stock_tras_corregir
FROM calc
WHERE stock_current < 0
   OR doble_descuento <> 0
   OR stock_current <> suma_movimientos
ORDER BY stock_current, name;


-- ─────────────────────────────────────────────────────────────────────
-- 4. ¿POR QUÉ ESTÁ EN NEGATIVO? (productos con stock < 0)
--    · en_envio: unidades de pedidos aún sin recibir
--    · stock_al_recibir: stock cuando lleguen esos pedidos
--      → si es ≥ 0, son PREVENTAS: es normal y se corrige solo al marcar
--        los pedidos como recibidos
--    · recibidos_sin_entrada: pedidos recibidos − entradas «Reposición»
--      → si es > 0, mira la consulta 2 (entrada que falló)
--    · ventas_sin_lote: unidades vendidas en líneas sin lote asignado
--      → si no hay nada de lo anterior, viene de aquí: Conteo de inventario
-- ─────────────────────────────────────────────────────────────────────
WITH neg AS (
  SELECT id, sku, name, stock_current
  FROM public.products
  WHERE type = 'producto' AND stock_current < 0
)
SELECT n.sku,
       n.name AS producto,
       n.stock_current AS stock_actual,
       COALESCE(pend.q, 0)                       AS en_envio,
       n.stock_current + COALESCE(pend.q, 0)     AS stock_al_recibir,
       COALESCE(rec.q, 0)                        AS unidades_pedidos_recibidos,
       COALESCE(ent.q, 0)                        AS unidades_entradas_reposicion,
       GREATEST(COALESCE(rec.q, 0) - COALESCE(ent.q, 0), 0) AS recibidos_sin_entrada,
       COALESCE(sal.q, 0)                        AS unidades_vendidas,
       COALESCE(sinlote.q, 0)                    AS ventas_sin_lote
FROM neg n
LEFT JOIN (
  SELECT product_id, SUM(quantity) AS q FROM public.purchase_orders
  WHERE received IS NOT TRUE GROUP BY product_id
) pend ON pend.product_id = n.id
LEFT JOIN (
  SELECT product_id, SUM(quantity) AS q FROM public.purchase_orders
  WHERE received IS TRUE GROUP BY product_id
) rec ON rec.product_id = n.id
LEFT JOIN (
  SELECT product_id, SUM(quantity) AS q FROM public.stock_movements
  WHERE movement_type = 'entrada' AND document_id IS NULL
    AND (reason LIKE 'Reposición%' OR reason LIKE 'Corrección: entrada no registrada%')
  GROUP BY product_id
) ent ON ent.product_id = n.id
LEFT JOIN (
  SELECT product_id, SUM(quantity) AS q FROM public.stock_movements
  WHERE movement_type = 'salida' GROUP BY product_id
) sal ON sal.product_id = n.id
LEFT JOIN (
  SELECT dl.product_id, SUM(dl.quantity) AS q
  FROM public.document_lines dl
  JOIN public.documents d ON d.id = dl.document_id
  WHERE dl.lot_id IS NULL
    AND d.rectification_of_invoice_id IS NULL
    AND d.status NOT IN ('borrador', 'cancelado', 'convertido')
  GROUP BY dl.product_id
) sinlote ON sinlote.product_id = n.id
ORDER BY n.stock_current;



-- ─────────────────────────────────────────────────────────────────────
-- 5. HISTORIAL DE UN PRODUCTO: sus pedidos y todo lo que le ha entrado
--    Cambia el SKU. Salen en orden de fecha los pedidos (recibidos o en
--    envío) y las entradas y ajustes, para ver qué pedido no sumó.
--    No salen las ventas (salidas).
-- ─────────────────────────────────────────────────────────────────────
WITH prod AS (
  SELECT id FROM public.products WHERE sku = 'Argor5'
)
SELECT *
FROM (
  SELECT 'pedido'                                   AS que,
         COALESCE(po.received_at, po.created_at)    AS fecha,
         CASE WHEN po.received THEN 'recibido' ELSE 'en envío' END AS clase,
         po.quantity                                AS unidades,
         po.id::text                                AS pedido_id_o_documento,
         COALESCE(po.supplier_name, '')             AS detalle
  FROM public.purchase_orders po
  JOIN prod ON prod.id = po.product_id
  UNION ALL
  SELECT 'movimiento',
         sm.created_at,
         sm.movement_type::text,
         sm.quantity,
         COALESCE(d.code, ''),
         COALESCE(sm.reason, '')
  FROM public.stock_movements sm
  JOIN prod ON prod.id = sm.product_id
  LEFT JOIN public.documents d ON d.id = sm.document_id
  WHERE sm.movement_type <> 'salida'
) t
ORDER BY fecha, que DESC;
