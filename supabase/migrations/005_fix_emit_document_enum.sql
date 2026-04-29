-- ============================================================================
-- Migración 005: actualizar emit_document tras el rename de enum
-- ============================================================================
-- La migración 002 renombró product_type 'fisico' -> 'producto', y la columna
-- products.is_active -> active y products.stock -> stock_current. La función
-- emit_document creada en la migración 001 todavía referenciaba los nombres
-- antiguos, lo que provocaba: "invalid input value for enum product_type: fisico".
-- También dejamos el cálculo de stock_current consistente con el resto.
-- ============================================================================

create or replace function public.emit_document(doc_id uuid)
returns public.documents
language plpgsql security definer set search_path = public as $$
declare
  doc public.documents;
  ser public.doc_series;
  assigned_number int;
  padded text;
  line record;
begin
  -- Lock del documento
  select * into doc from public.documents where id = doc_id for update;
  if not found then
    raise exception 'Documento no encontrado';
  end if;
  if doc.status <> 'borrador' then
    raise exception 'Sólo se puede emitir un documento en estado borrador (actual: %)', doc.status;
  end if;

  -- Resolver la serie por tipo y año del issue_date
  select * into ser
  from public.doc_series
  where doc_type = doc.doc_type and year = extract(year from doc.issue_date)::int
  for update;

  if not found then
    raise exception 'No existe serie para % del año %', doc.doc_type, extract(year from doc.issue_date);
  end if;

  assigned_number := ser.next_number;
  padded := lpad(assigned_number::text, 4, '0');

  update public.doc_series
  set next_number = next_number + 1
  where id = ser.id;

  update public.documents
  set status = 'emitido',
      series_id = ser.id,
      number = assigned_number,
      code = ser.prefix || '-' || padded || '/' || ser.year
  where id = doc.id;

  -- Movimientos de stock para productos físicos.
  -- IMPORTANTE: el enum es 'producto' (renombrado en la migración 002) y la
  -- columna de stock es products.stock_current.
  for line in
    select dl.*, p.type as product_type_val
    from public.document_lines dl
    left join public.products p on p.id = dl.product_id
    where dl.document_id = doc.id
      and dl.product_id is not null
      and p.type = 'producto'
  loop
    insert into public.stock_movements (
      product_id, movement_type, quantity, document_id, reason, created_by
    ) values (
      line.product_id, 'salida', line.quantity, doc.id,
      'Emisión ' || doc.doc_type::text, auth.uid()
    );

    update public.products
    set stock_current = stock_current - line.quantity
    where id = line.product_id;
  end loop;

  select * into doc from public.documents where id = doc_id;
  return doc;
end $$;
