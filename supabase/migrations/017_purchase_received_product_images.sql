-- =====================================================================
-- Lingot ERP — Migración 017: Mercancía recibida + imágenes de producto
-- =====================================================================

-- ── 1. purchase_orders: campo received ──────────────────────────────
-- Los pedidos existentes ya tienen stock contabilizado → received = true.
-- Los nuevos pedidos se crean con received = false y el stock se añade
-- manualmente al marcar como recibido.

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS received    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS received_at timestamptz;

-- Pedidos existentes: ya tienen stock y lote creados → marcar como recibidos
UPDATE public.purchase_orders
SET received = true, received_at = created_at
WHERE received = false;

-- ── 2. products: campo image_urls ───────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- ── 3. Storage bucket para imágenes de producto ─────────────────────
-- Ejecutar en el SQL Editor de Supabase (requiere service_role):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('product-images', 'product-images', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
-- CREATE POLICY "product_images_select" ON storage.objects
--   FOR SELECT USING (bucket_id = 'product-images');
--
-- DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
-- CREATE POLICY "product_images_insert" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'product-images' AND public.is_authenticated()
--   );
--
-- DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
-- CREATE POLICY "product_images_delete" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'product-images' AND public.is_admin()
--   );
