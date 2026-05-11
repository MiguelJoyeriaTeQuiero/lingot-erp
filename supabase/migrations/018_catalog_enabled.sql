ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS catalog_enabled boolean NOT NULL DEFAULT false;

-- Allow anonymous users to read company_settings for the public catalog.
-- Postgres PERMISSIVE policies are combined with OR, so this adds anon access
-- on top of the existing authenticated-only policy.
DROP POLICY IF EXISTS company_settings_anon_select ON public.company_settings;
CREATE POLICY company_settings_anon_select ON public.company_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS products_anon_select ON public.products;
CREATE POLICY products_anon_select ON public.products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS metal_prices_anon_select ON public.metal_prices;
CREATE POLICY metal_prices_anon_select ON public.metal_prices
  FOR SELECT USING (true);
