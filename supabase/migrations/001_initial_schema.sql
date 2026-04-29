-- =====================================================================
-- Lingot ERP — Migración inicial (Fase 1)
-- Esquema base: perfiles, clientes, productos, documentos (albarán/factura),
-- líneas, movimientos de stock, series de documentos y ajustes de empresa.
-- Contexto fiscal: Canarias (IGIC), NO IVA.
-- =====================================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------- ENUM TYPES ----------
do $$ begin
  create type user_role as enum ('admin', 'contabilidad');
exception when duplicate_object then null; end $$;

do $$ begin
  create type client_type as enum ('particular', 'empresa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type price_tier as enum ('minorista', 'mayorista', 'vip');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_type as enum ('fisico', 'servicio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_type as enum ('albaran', 'factura');
exception when duplicate_object then null; end $$;

-- 'convertido' aplica a albaranes que ya originaron una factura
do $$ begin
  create type doc_status as enum (
    'borrador', 'emitido', 'pagado', 'vencido', 'cancelado', 'convertido'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type movement_type as enum ('entrada', 'salida', 'ajuste');
exception when duplicate_object then null; end $$;

-- ---------- TRIGGER HELPER: updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles ----------
-- 1 fila por usuario de auth. El alta se automatiza al crear usuario.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'contabilidad',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-creación de perfil al registrar un usuario nuevo en auth.users.
-- Rol por defecto = contabilidad. Un admin existente debe elevar manualmente.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null), 'contabilidad')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- clients ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  type client_type not null default 'particular',
  name text not null,
  tax_id text,                                 -- NIF/CIF/NIE
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  country text default 'España',
  price_tier price_tier not null default 'minorista',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_clients_name on public.clients (name);
create index if not exists idx_clients_tax_id on public.clients (tax_id);
create index if not exists idx_clients_active on public.clients (is_active);
create trigger trg_clients_updated
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------- product_categories ----------
-- El tipo de IGIC por categoría determina el impuesto por defecto.
-- Tipos típicos en Canarias: 0% (oro de inversión exento), 7% (general),
-- 15% (incrementado aplicable a determinados metales/joyería).
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  igic_rate numeric(5,2) not null default 7.00,   -- porcentaje IGIC aplicable
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_product_categories_updated
  before update on public.product_categories
  for each row execute function public.set_updated_at();

-- ---------- products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  description text,
  type product_type not null default 'fisico',
  category_id uuid references public.product_categories(id) on delete set null,
  -- precios por tier (netos, sin IGIC)
  price_minorista numeric(12,2) not null default 0,
  price_mayorista numeric(12,2) not null default 0,
  price_vip numeric(12,2) not null default 0,
  -- stock (sólo aplica a físicos; en servicios se mantiene en 0)
  stock numeric(12,3) not null default 0,
  stock_min numeric(12,3) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_name on public.products (name);
create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_active on public.products (is_active);
create trigger trg_products_updated
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------- doc_series ----------
-- Correlativo por tipo + año. Se incrementa al emitir el documento.
create table if not exists public.doc_series (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,         -- ej. ALB-2026, FAC-2026
  doc_type doc_type not null,
  year int not null,
  prefix text not null,              -- ej. ALB, FAC
  next_number int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doc_type, year)
);
create trigger trg_doc_series_updated
  before update on public.doc_series
  for each row execute function public.set_updated_at();

-- ---------- documents ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  doc_type doc_type not null,
  status doc_status not null default 'borrador',
  series_id uuid references public.doc_series(id) on delete set null,
  number int,                       -- asignado al emitir
  code text,                        -- prefix + '-' + padded(number) + '/' + year
  client_id uuid not null references public.clients(id) on delete restrict,
  issue_date date not null default current_date,
  due_date date,
  notes text,
  -- Totales almacenados en cabecera (denormalizados para performance)
  subtotal numeric(14,2) not null default 0,
  igic_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  -- Relación albarán → factura convertida
  converted_to_invoice_id uuid references public.documents(id) on delete set null,
  source_albaran_id uuid references public.documents(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_documents_client on public.documents (client_id);
create index if not exists idx_documents_status on public.documents (status);
create index if not exists idx_documents_type on public.documents (doc_type);
create index if not exists idx_documents_issue_date on public.documents (issue_date);
create unique index if not exists uq_documents_code on public.documents (code) where code is not null;
create trigger trg_documents_updated
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------- document_lines ----------
create table if not exists public.document_lines (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  position int not null default 1,
  product_id uuid references public.products(id) on delete set null,
  description text not null,             -- se copia del producto y puede editarse
  quantity numeric(12,3) not null default 1,
  unit_price numeric(12,2) not null default 0,  -- neto por unidad
  discount_pct numeric(5,2) not null default 0,
  igic_rate numeric(5,2) not null default 0,    -- porcentaje aplicado a esta línea
  -- calculados en cliente/servicio, persistidos por auditoría
  line_subtotal numeric(14,2) not null default 0,
  line_igic numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_document_lines_doc on public.document_lines (document_id);
create index if not exists idx_document_lines_product on public.document_lines (product_id);

-- ---------- stock_movements ----------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type movement_type not null,
  quantity numeric(12,3) not null,   -- signo por tipo (ajuste puede ser +/-)
  document_id uuid references public.documents(id) on delete set null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_stock_movements_product on public.stock_movements (product_id);
create index if not exists idx_stock_movements_doc on public.stock_movements (document_id);

-- ---------- company_settings (singleton) ----------
-- Siempre existe una sola fila (id = 1 lógico). Se fuerza por check.
create table if not exists public.company_settings (
  id int primary key default 1,
  legal_name text,
  trade_name text default 'Lingot',
  tax_id text,                     -- CIF de la empresa
  address text,
  city text,
  postal_code text,
  country text default 'España',
  email text,
  phone text,
  website text,
  iban text,
  default_igic_rate numeric(5,2) not null default 7.00,
  default_payment_days int not null default 30,
  invoice_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_settings_singleton check (id = 1)
);
create trigger trg_company_settings_updated
  before update on public.company_settings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- RLS
-- Política: admin = acceso total. contabilidad = lectura total + UPDATE
-- restringido en documentos (status, notes) y ninguna INSERT/DELETE.
-- =====================================================================
alter table public.profiles           enable row level security;
alter table public.clients            enable row level security;
alter table public.product_categories enable row level security;
alter table public.products           enable row level security;
alter table public.doc_series         enable row level security;
alter table public.documents          enable row level security;
alter table public.document_lines     enable row level security;
alter table public.stock_movements    enable row level security;
alter table public.company_settings   enable row level security;

-- Helper: ¿es admin el usuario actual?
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Helper: ¿está autenticado?
create or replace function public.is_authenticated()
returns boolean language sql stable as $$
  select auth.uid() is not null;
$$;

-- ---- profiles ----
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (public.is_authenticated());

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
  for update using (public.is_admin() or id = auth.uid())
  with check (public.is_admin() or id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- clients, product_categories, products, doc_series, company_settings ----
-- contabilidad sólo lee; admin todo.
do $$
declare t text;
begin
  for t in select unnest(array[
    'clients','product_categories','products','doc_series','company_settings'
  ]) loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format(
      'create policy %I_select on public.%I for select using (public.is_authenticated());',
      t, t
    );
    execute format('drop policy if exists %I_admin_all on public.%I;', t, t);
    execute format(
      'create policy %I_admin_all on public.%I for all using (public.is_admin()) with check (public.is_admin());',
      t, t
    );
  end loop;
end $$;

-- ---- documents ----
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select using (public.is_authenticated());

drop policy if exists documents_admin_all on public.documents;
create policy documents_admin_all on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

-- contabilidad puede UPDATE pero sólo modificando status/notes.
-- Se implementa restringiendo las columnas permitidas con un trigger.
create or replace function public.documents_contabilidad_update_guard()
returns trigger language plpgsql as $$
begin
  if public.is_admin() then
    return new;
  end if;
  -- Si no es admin, sólo permitimos cambios en status y notes.
  if new.doc_type       is distinct from old.doc_type       then raise exception 'Sin permiso para modificar doc_type'; end if;
  if new.series_id      is distinct from old.series_id      then raise exception 'Sin permiso para modificar series_id'; end if;
  if new.number         is distinct from old.number         then raise exception 'Sin permiso para modificar number'; end if;
  if new.code           is distinct from old.code           then raise exception 'Sin permiso para modificar code'; end if;
  if new.client_id      is distinct from old.client_id      then raise exception 'Sin permiso para modificar client_id'; end if;
  if new.issue_date     is distinct from old.issue_date     then raise exception 'Sin permiso para modificar issue_date'; end if;
  if new.due_date       is distinct from old.due_date       then raise exception 'Sin permiso para modificar due_date'; end if;
  if new.subtotal       is distinct from old.subtotal       then raise exception 'Sin permiso para modificar subtotal'; end if;
  if new.igic_total     is distinct from old.igic_total     then raise exception 'Sin permiso para modificar igic_total'; end if;
  if new.total          is distinct from old.total          then raise exception 'Sin permiso para modificar total'; end if;
  if new.converted_to_invoice_id is distinct from old.converted_to_invoice_id then raise exception 'Sin permiso'; end if;
  if new.source_albaran_id       is distinct from old.source_albaran_id       then raise exception 'Sin permiso'; end if;
  return new;
end $$;

drop trigger if exists trg_documents_contabilidad_guard on public.documents;
create trigger trg_documents_contabilidad_guard
  before update on public.documents
  for each row execute function public.documents_contabilidad_update_guard();

drop policy if exists documents_contabilidad_update on public.documents;
create policy documents_contabilidad_update on public.documents
  for update using (public.is_authenticated()) with check (public.is_authenticated());

-- ---- document_lines, stock_movements ----
drop policy if exists document_lines_select on public.document_lines;
create policy document_lines_select on public.document_lines
  for select using (public.is_authenticated());
drop policy if exists document_lines_admin_all on public.document_lines;
create policy document_lines_admin_all on public.document_lines
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists stock_movements_select on public.stock_movements;
create policy stock_movements_select on public.stock_movements
  for select using (public.is_authenticated());
drop policy if exists stock_movements_admin_all on public.stock_movements;
create policy stock_movements_admin_all on public.stock_movements
  for all using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- RPC: emit_document
-- Transición borrador → emitido atómica:
--   1) Asigna número desde la serie correspondiente.
--   2) Construye el code (ej. FAC-0001/2026).
--   3) Cambia status a 'emitido'.
--   4) Inserta stock_movements de tipo 'salida' por cada línea con producto físico.
--   5) Decrementa products.stock.
-- Sólo para doc_type IN ('albaran','factura') en estado 'borrador'.
-- =====================================================================
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

  -- Movimientos de stock para productos físicos
  for line in
    select dl.*, p.type as product_type_val
    from public.document_lines dl
    left join public.products p on p.id = dl.product_id
    where dl.document_id = doc.id and dl.product_id is not null and p.type = 'fisico'
  loop
    insert into public.stock_movements (product_id, movement_type, quantity, document_id, reason, created_by)
    values (line.product_id, 'salida', line.quantity, doc.id,
            'Emisión ' || doc.doc_type::text, auth.uid());

    update public.products
    set stock = stock - line.quantity
    where id = line.product_id;
  end loop;

  select * into doc from public.documents where id = doc_id;
  return doc;
end $$;

-- =====================================================================
-- RPC: convert_albaran_to_invoice
-- Copia líneas del albarán a una nueva factura en borrador y marca el
-- albarán como 'convertido'. No duplica movimientos de stock (el albarán
-- ya los generó al emitirse).
-- =====================================================================
create or replace function public.convert_albaran_to_invoice(albaran_id uuid)
returns public.documents
language plpgsql security definer set search_path = public as $$
declare
  alb public.documents;
  inv public.documents;
  new_id uuid;
begin
  select * into alb from public.documents where id = albaran_id for update;
  if not found then
    raise exception 'Albarán no encontrado';
  end if;
  if alb.doc_type <> 'albaran' then
    raise exception 'El documento origen debe ser un albarán';
  end if;
  if alb.status not in ('emitido') then
    raise exception 'Sólo se convierten albaranes en estado emitido (actual: %)', alb.status;
  end if;
  if alb.converted_to_invoice_id is not null then
    raise exception 'Este albarán ya fue convertido';
  end if;

  insert into public.documents (
    doc_type, status, client_id, issue_date, due_date, notes,
    subtotal, igic_total, total, source_albaran_id, created_by
  ) values (
    'factura', 'borrador', alb.client_id, current_date, null, alb.notes,
    alb.subtotal, alb.igic_total, alb.total, alb.id, auth.uid()
  ) returning id into new_id;

  insert into public.document_lines (
    document_id, position, product_id, description, quantity, unit_price,
    discount_pct, igic_rate, line_subtotal, line_igic, line_total
  )
  select
    new_id, position, product_id, description, quantity, unit_price,
    discount_pct, igic_rate, line_subtotal, line_igic, line_total
  from public.document_lines
  where document_id = alb.id
  order by position;

  update public.documents
  set status = 'convertido',
      converted_to_invoice_id = new_id
  where id = alb.id;

  select * into inv from public.documents where id = new_id;
  return inv;
end $$;

-- =====================================================================
-- SEED DATA
-- =====================================================================

-- Categorías de producto (IGIC Canarias)
insert into public.product_categories (name, igic_rate) values
  ('Oro',       0.00),   -- Oro de inversión exento
  ('Plata',     15.00),  -- Tipo incrementado
  ('Servicios', 7.00)    -- Tipo general
on conflict (name) do nothing;

-- Series de documentos 2026
insert into public.doc_series (code, doc_type, year, prefix, next_number) values
  ('ALB-2026', 'albaran', 2026, 'ALB', 1),
  ('FAC-2026', 'factura', 2026, 'FAC', 1)
on conflict (code) do nothing;

-- Fila única de ajustes de empresa
insert into public.company_settings (id) values (1)
on conflict (id) do nothing;
