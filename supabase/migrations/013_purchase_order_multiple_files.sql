-- Soporte para múltiples documentos adjuntos en pedidos de reposición.
-- Se añade invoice_urls text[] y se migran los datos de invoice_url.
alter table public.purchase_orders
  add column if not exists invoice_urls text[] not null default '{}';

update public.purchase_orders
set invoice_urls = array[invoice_url]
where invoice_url is not null
  and array_length(invoice_urls, 1) is null;
