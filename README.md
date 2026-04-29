# Lingot ERP

Aplicación de facturación y gestión para **Lingot**, marca de inversión en metales preciosos de Canarias (sub-marca de Te Quiero Group).

Stack: Next.js 14 (App Router) + TypeScript estricto + Tailwind CSS + Supabase (@supabase/ssr).

## Requisitos

- Node.js 20+
- Cuenta Supabase con proyecto configurado
- (Opcional) Cuenta Resend para emails

## Setup inicial

```bash
npm install
cp .env.example .env.local   # ya incluido en este repo
npm run dev
```

## Variables de entorno

Ver `.env.example`. Las claves usan el nuevo formato `sb_publishable_*` y `sb_secret_*`.

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta (solo servidor) |
| `RESEND_API_KEY` | API key de Resend (opcional) |
| `NEXT_PUBLIC_APP_URL` | URL base de la app |

## Migraciones

El esquema inicial está en `supabase/migrations/001_initial_schema.sql`. Aplicar con el SQL Editor de Supabase o con la CLI:

```bash
supabase db push
```

Tras aplicar la migración:

1. Crear el primer usuario desde el panel de Auth de Supabase.
2. En la tabla `profiles`, cambiar manualmente su `role` a `admin`.
3. Rellenar `company_settings` con los datos fiscales de la empresa.

## Estado del proyecto

- **Fase 1 (actual):** scaffolding, auth, layout dashboard, migración SQL inicial.
- **Fase 2:** CRUD clientes e inventario.
- **Fase 3:** Documentos (albaranes, facturas), series, stock movements.
- **Fase 4:** PDF, envío por email, informes.

## Notas de marca

- Color primario: `#0a3746` (petróleo profundo).
- Acento dorado: `#c8a164` (usar con moderación).
- Tipografía: Helvetica (títulos), Open Sauce Sans (cuerpo).
- IGIC (no IVA). Todo el UI en español.
