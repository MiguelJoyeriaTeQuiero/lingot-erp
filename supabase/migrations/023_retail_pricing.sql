-- Margen minorista por producto (porcentaje sobre el precio mayorista)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS retail_markup_pct NUMERIC DEFAULT 0 NOT NULL;

-- Flag mayorista en perfiles de usuario
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_wholesale BOOLEAN DEFAULT false NOT NULL;
