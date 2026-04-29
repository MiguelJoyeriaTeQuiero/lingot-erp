-- ============================================================================
-- Seed de datos para Lingot ERP — entorno de pruebas
-- ============================================================================
-- Ejecutar después de aplicar todas las migraciones (incluida 006).
-- Idempotente: usa ON CONFLICT DO NOTHING / WHERE NOT EXISTS.
-- No crea usuarios (auth.users) — eso se hace desde el panel de Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Configuración de empresa
-- ----------------------------------------------------------------------------
insert into public.company_settings (
  id, legal_name, trade_name, tax_id, address, city, postal_code, country,
  email, phone, website, iban, default_igic_rate, default_payment_days,
  invoice_footer, metal_markup_pct
) values (
  1,
  'Te Quiero Group, S.L.',
  'LINGOT',
  'B76000000',
  'Calle Triana, 15',
  'Las Palmas de Gran Canaria',
  '35002',
  'España',
  'hola@lingot.es',
  '+34 928 000 000',
  'https://lingot.es',
  'ES7621000000000000000000',
  7,
  30,
  'Documento emitido conforme al régimen general del IGIC. Conserve este comprobante.',
  4
)
on conflict (id) do update set
  legal_name = excluded.legal_name,
  trade_name = excluded.trade_name,
  tax_id = excluded.tax_id,
  address = excluded.address,
  city = excluded.city,
  postal_code = excluded.postal_code,
  country = excluded.country,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  iban = excluded.iban,
  invoice_footer = excluded.invoice_footer,
  metal_markup_pct = excluded.metal_markup_pct;

-- ----------------------------------------------------------------------------
-- 2. Categorías de producto
-- ----------------------------------------------------------------------------
insert into public.product_categories (name, igic_rate)
select v.name, v.rate from (values
  ('Oro',   0::numeric),
  ('Plata', 15::numeric)
) as v(name, rate)
where not exists (
  select 1 from public.product_categories pc where pc.name = v.name
);

-- ----------------------------------------------------------------------------
-- 3. Cotización inicial (semilla mientras el cron hace su primera corrida)
-- ----------------------------------------------------------------------------
-- Sólo insertamos si todavía no hay ninguna cotización registrada.
do $$
begin
  if not exists (select 1 from public.metal_prices where metal = 'oro') then
    perform public.record_metal_price('oro'::public.metal_type, 92.50, 'seed');
  end if;
  if not exists (select 1 from public.metal_prices where metal = 'plata') then
    perform public.record_metal_price('plata'::public.metal_type, 1.05, 'seed');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Productos de muestra (oro y plata)
-- ----------------------------------------------------------------------------
insert into public.products (
  sku, name, description, type, category_id, metal,
  weight_g, purity, markup_per_gram, markup_per_piece,
  cost_price, stock_current, stock_min, igic_rate, active
)
select
  v.sku, v.name, v.description, 'producto'::public.product_type,
  (select id from public.product_categories where lower(name) = v.cat),
  v.metal::public.metal_type,
  v.weight, v.purity, v.mkpg, v.mkpp,
  v.cost, v.stock, v.stock_min, null::numeric, true
from (values
  ('AN-001', 'Anillo banda oro 18k 3mm', 'Banda lisa, talla ajustable.',
    'oro',   'oro',   3.20, 0.7500, 60, 0,  240,  4, 1),
  ('AL-002', 'Alianza oro 18k 4mm media caña', 'Comodidad interior, brillo pulido.',
    'oro',   'oro',   4.10, 0.7500, 55, 0,  290,  6, 1),
  ('CO-027', 'Cordón oro 18k 50cm', 'Trenzado fino, cierre de mosquetón.',
    'oro',   'oro',   8.50, 0.7500, 35, 20, 620,  3, 1),
  ('PE-014', 'Pendientes aro plata 925',     'Aro fino, cierre catalán.',
    'plata', 'plata', 4.00, 0.9250, 12, 5,  18,   12, 3),
  ('PU-040', 'Pulsera tenis plata 925',      'Cierre de seguridad, pulida.',
    'plata', 'plata', 5.50, 0.9250, 18, 10, 25,    8, 2),
  ('CA-051', 'Cadena plata 925 60cm',         'Eslabón forzado, terminación lisa.',
    'plata', 'plata', 9.00, 0.9250, 10, 4,  35,   10, 2)
) as v(sku, name, description, cat, metal, weight, purity, mkpg, mkpp, cost, stock, stock_min)
where not exists (
  select 1 from public.products p where p.sku = v.sku
);

-- ----------------------------------------------------------------------------
-- 5. Clientes de muestra
-- ----------------------------------------------------------------------------
insert into public.clients (
  type, name, tax_id, contact_name, email, phone, address, city, postal_code,
  country, price_tier, notes, active
)
select v.type::public.client_type, v.name, v.tax_id, v.contact, v.email, v.phone,
       v.address, v.city, v.cp, 'España', v.tier::public.price_tier, v.notes, true
from (values
  ('particular', 'María Hernández Pérez', '43512345Z', null,
    'maria.hernandez@example.com', '+34 666 010 020',
    'C/ León y Castillo 23', 'Las Palmas de Gran Canaria', '35003',
    'A', null::text),
  ('empresa', 'Joyería del Atlántico, S.L.', 'B35987654', 'Carlos Suárez',
    'compras@atlantico-joyeria.es', '+34 928 200 300',
    'Av. Mesa y López 45, 2º', 'Las Palmas de Gran Canaria', '35006',
    'A', 'Cliente mayorista habitual'),
  ('particular', 'Juan Pablo Domínguez', '78900123Y', null,
    'jp.dominguez@example.com', '+34 600 111 222',
    'C/ Triana 78', 'Las Palmas de Gran Canaria', '35002',
    'A', null),
  ('empresa', 'Hotel Costa Canaria, S.A.', 'A35112233', 'Recepción / Compras',
    'compras@costacanaria.com', '+34 928 700 700',
    'Av. Marítima 12', 'Maspalomas', '35100',
    'A', 'Cliente recurrente')
) as v(type, name, tax_id, contact, email, phone, address, city, cp, tier, notes)
where not exists (
  select 1 from public.clients c where c.tax_id = v.tax_id
);

-- ----------------------------------------------------------------------------
-- 6. Series de documentos para el año en curso
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'doc_series') then
    insert into public.doc_series (doc_type, year, prefix, next_number)
    select v.doc_type::public.doc_type, extract(year from now())::int, v.prefix, 1
    from (values
      ('albaran', 'A'),
      ('factura', 'F')
    ) as v(doc_type, prefix)
    where not exists (
      select 1 from public.doc_series ds
      where ds.doc_type = v.doc_type::public.doc_type
        and ds.year = extract(year from now())::int
    );
  end if;
end $$;
