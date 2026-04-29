-- ============================================================================
-- Migración 003: IGIC override a nivel de producto
-- ============================================================================
-- La categoría define el IGIC por defecto, pero un producto puede sobreescribirlo.
-- Si igic_rate es NULL, se hereda el de la categoría.
-- ============================================================================

alter table public.products
  add column if not exists igic_rate numeric(5,2);

comment on column public.products.igic_rate is
  'IGIC override para este producto. NULL = hereda category.igic_rate.';
