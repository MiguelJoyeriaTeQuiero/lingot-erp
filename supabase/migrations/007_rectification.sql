-- =====================================================================
-- Lingot ERP — Migración 007: Facturas rectificativas
-- =====================================================================

-- Nuevo valor en el enum: marca la factura original como rectificada
ALTER TYPE public.doc_status ADD VALUE IF NOT EXISTS 'rectificada';

-- Columna en documents que apunta a la factura que se rectifica
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS rectification_of_invoice_id uuid
  REFERENCES public.documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_rectification
  ON public.documents (rectification_of_invoice_id)
  WHERE rectification_of_invoice_id IS NOT NULL;

-- Actualizar el guard de contabilidad para proteger la nueva columna
CREATE OR REPLACE FUNCTION public.documents_contabilidad_update_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN new;
  END IF;
  IF new.doc_type                   IS DISTINCT FROM old.doc_type                   THEN RAISE EXCEPTION 'Sin permiso para modificar doc_type'; END IF;
  IF new.series_id                  IS DISTINCT FROM old.series_id                  THEN RAISE EXCEPTION 'Sin permiso para modificar series_id'; END IF;
  IF new.number                     IS DISTINCT FROM old.number                     THEN RAISE EXCEPTION 'Sin permiso para modificar number'; END IF;
  IF new.code                       IS DISTINCT FROM old.code                       THEN RAISE EXCEPTION 'Sin permiso para modificar code'; END IF;
  IF new.client_id                  IS DISTINCT FROM old.client_id                  THEN RAISE EXCEPTION 'Sin permiso para modificar client_id'; END IF;
  IF new.issue_date                 IS DISTINCT FROM old.issue_date                 THEN RAISE EXCEPTION 'Sin permiso para modificar issue_date'; END IF;
  IF new.due_date                   IS DISTINCT FROM old.due_date                   THEN RAISE EXCEPTION 'Sin permiso para modificar due_date'; END IF;
  IF new.subtotal                   IS DISTINCT FROM old.subtotal                   THEN RAISE EXCEPTION 'Sin permiso para modificar subtotal'; END IF;
  IF new.igic_total                 IS DISTINCT FROM old.igic_total                 THEN RAISE EXCEPTION 'Sin permiso para modificar igic_total'; END IF;
  IF new.total                      IS DISTINCT FROM old.total                      THEN RAISE EXCEPTION 'Sin permiso para modificar total'; END IF;
  IF new.converted_to_invoice_id    IS DISTINCT FROM old.converted_to_invoice_id    THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  IF new.source_albaran_id          IS DISTINCT FROM old.source_albaran_id          THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  IF new.rectification_of_invoice_id IS DISTINCT FROM old.rectification_of_invoice_id THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  RETURN new;
END $$;

-- =====================================================================
-- RPC: create_rectification_invoice
-- Crea una factura rectificativa vinculada a la original.
-- La original pasa a estado 'rectificada'. La nueva queda en borrador
-- con las mismas líneas para que el usuario pueda ajustarlas.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.create_rectification_invoice(original_id uuid)
RETURNS public.documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  orig    public.documents;
  new_id  uuid;
  new_doc public.documents;
BEGIN
  SELECT * INTO orig FROM public.documents WHERE id = original_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  IF orig.doc_type <> 'factura' THEN
    RAISE EXCEPTION 'Solo se pueden rectificar facturas';
  END IF;
  IF orig.status NOT IN ('emitido', 'pagado') THEN
    RAISE EXCEPTION 'Solo se rectifican facturas en estado emitido o pagado (actual: %)', orig.status;
  END IF;

  INSERT INTO public.documents (
    doc_type, status, client_id, issue_date, due_date, notes,
    subtotal, igic_total, total, rectification_of_invoice_id, created_by
  ) VALUES (
    'factura', 'borrador',
    orig.client_id,
    CURRENT_DATE,
    NULL,
    'Rectificativa de ' || COALESCE(orig.code, orig.id::text),
    orig.subtotal,
    orig.igic_total,
    orig.total,
    orig.id,
    auth.uid()
  ) RETURNING id INTO new_id;

  INSERT INTO public.document_lines (
    document_id, position, product_id, description, quantity, unit_price,
    discount_pct, igic_rate, line_subtotal, line_igic, line_total
  )
  SELECT
    new_id, position, product_id, description, quantity, unit_price,
    discount_pct, igic_rate, line_subtotal, line_igic, line_total
  FROM public.document_lines
  WHERE document_id = orig.id
  ORDER BY position;

  UPDATE public.documents
  SET status = 'rectificada'
  WHERE id = orig.id;

  SELECT * INTO new_doc FROM public.documents WHERE id = new_id;
  RETURN new_doc;
END $$;
