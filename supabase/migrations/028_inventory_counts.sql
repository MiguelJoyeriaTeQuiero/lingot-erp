-- =====================================================================
-- Lingot ERP — Migración 028: Histórico de conteos de inventario
-- =====================================================================
-- Cada "Conteo de inventario" (regularización de stock) queda registrado
-- con fecha, usuario y el detalle por producto (esperado / contado /
-- diferencia), para trazabilidad. Los ajustes de stock se siguen registrando
-- en stock_movements; estas tablas guardan la SESIÓN de conteo completa,
-- incluidos los conteos sin diferencias.
-- =====================================================================

-- ---------- Cabecera del conteo ----------
CREATE TABLE IF NOT EXISTS public.inventory_counts (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  counted_at      timestamptz   NOT NULL DEFAULT now(),
  counted_by      uuid          REFERENCES public.profiles(id) ON DELETE SET NULL,
  counted_by_name text,                                        -- snapshot del usuario
  lines_total     integer       NOT NULL DEFAULT 0,            -- piezas contadas
  diff_count      integer       NOT NULL DEFAULT 0,            -- piezas con diferencia
  total_delta     numeric(12,3) NOT NULL DEFAULT 0,            -- delta neto (Σ delta)
  units_over      numeric(12,3) NOT NULL DEFAULT 0,            -- sobrantes (Σ delta>0)
  units_short     numeric(12,3) NOT NULL DEFAULT 0,            -- faltantes (Σ |delta<0|)
  notes           text,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- ---------- Detalle por producto ----------
CREATE TABLE IF NOT EXISTS public.inventory_count_lines (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id      uuid          NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
  product_id    uuid          REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  text          NOT NULL,                        -- snapshot
  product_sku   text,                                          -- snapshot
  expected      numeric(12,3) NOT NULL,                        -- stock del sistema al contar
  counted       numeric(12,3) NOT NULL,                        -- contado físicamente
  delta         numeric(12,3) NOT NULL                         -- counted - expected
);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_date
  ON public.inventory_counts (counted_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_count_lines_count
  ON public.inventory_count_lines (count_id);

-- ---------- RLS ----------
ALTER TABLE public.inventory_counts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_count_lines ENABLE ROW LEVEL SECURITY;

-- Lectura para cualquier usuario autenticado; gestión (insert/update/delete)
-- solo admin. La escritura desde la app se hace con service role.
DROP POLICY IF EXISTS inventory_counts_select ON public.inventory_counts;
CREATE POLICY inventory_counts_select ON public.inventory_counts
  FOR SELECT USING (public.is_authenticated());
DROP POLICY IF EXISTS inventory_counts_admin_all ON public.inventory_counts;
CREATE POLICY inventory_counts_admin_all ON public.inventory_counts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS inventory_count_lines_select ON public.inventory_count_lines;
CREATE POLICY inventory_count_lines_select ON public.inventory_count_lines
  FOR SELECT USING (public.is_authenticated());
DROP POLICY IF EXISTS inventory_count_lines_admin_all ON public.inventory_count_lines;
CREATE POLICY inventory_count_lines_admin_all ON public.inventory_count_lines
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
