-- Añadir URL de factura del proveedor a pedidos de reposición
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS invoice_url text DEFAULT NULL;
