-- Hacer público el bucket de facturas de compra.
--
-- El bucket 'purchase-invoices' se creó como privado (008_stock_invoice_url.sql),
-- pero el código guarda y enlaza las facturas con getPublicUrl(). En un bucket
-- privado esas URLs públicas devuelven error 400 / "Object not found", por lo que
-- las facturas adjuntas a los pedidos no se podían descargar.
--
-- Lo marcamos como público para que las URLs ya almacenadas funcionen tal cual.

UPDATE storage.buckets
SET public = true
WHERE id = 'purchase-invoices';

-- Permitir lectura pública de los objetos del bucket (necesario para que las
-- URLs públicas sirvan el archivo sin token de autenticación).
DROP POLICY IF EXISTS purchase_invoices_public_select ON storage.objects;
CREATE POLICY purchase_invoices_public_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'purchase-invoices');
