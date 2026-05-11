ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS catalog_enabled boolean NOT NULL DEFAULT false;
