CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_id UUID NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  product_id UUID,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_snapshot NUMERIC NOT NULL,
  phone TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'confirmada', 'entregada', 'cancelada'))
);
