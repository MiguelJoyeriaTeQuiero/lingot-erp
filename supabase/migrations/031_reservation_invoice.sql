-- =====================================================================
-- Migración 031: enlace reserva → factura
-- =====================================================================
-- El botón «Facturar» de Reservas crea una factura en borrador a partir de
-- la reserva. La reserva guarda la factura creada para mostrar el enlace en
-- la fila y no facturarla dos veces. Si el borrador se elimina, el enlace se
-- vacía solo (ON DELETE SET NULL) y se puede volver a facturar.
-- =====================================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS invoice_id uuid
  REFERENCES public.documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_invoice
  ON public.reservations (invoice_id)
  WHERE invoice_id IS NOT NULL;
