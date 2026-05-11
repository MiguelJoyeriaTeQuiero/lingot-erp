import { headers } from "next/headers";
import { PageHeader } from "@/components/layout/page-header";
import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import type { CompanySettingsInput } from "@/lib/validations/company";
import { CompanyForm } from "./company-form";
import { CatalogPanel } from "./catalog-panel";
import { requireRole } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  await requireRole(["admin"]);
  const supabase = createTypedClient();

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const catalogUrl = `${protocol}://${host}/catalogo`;

  const [companyRes, spots] = await Promise.all([
    supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
    getLatestSpots(),
  ]);

  const company = companyRes.data;

  const defaults: Partial<CompanySettingsInput> = company
    ? {
        legal_name: company.legal_name,
        trade_name: company.trade_name,
        tax_id: company.tax_id,
        address: company.address,
        city: company.city,
        postal_code: company.postal_code,
        country: company.country ?? "España",
        email: company.email,
        phone: company.phone,
        website: company.website,
        iban: company.iban,
        default_igic_rate: Number(company.default_igic_rate ?? 7),
        default_payment_days: Number(company.default_payment_days ?? 30),
        invoice_footer: company.invoice_footer,
        metal_markup_pct: Number(
          (company as { metal_markup_pct?: number }).metal_markup_pct ?? 4
        ),
      }
    : {};

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Sistema · 05"
        title="Configuración"
        description="Datos de la empresa, parámetros fiscales, cotización del metal y formato de los documentos."
      />

      <CompanyForm
        defaultValues={defaults}
        spotByMetal={{
          oro: spots.oro?.price_eur_per_g ?? null,
          plata: spots.plata?.price_eur_per_g ?? null,
        }}
        spotFetchedAt={{
          oro: spots.oro?.fetched_at ?? null,
          plata: spots.plata?.fetched_at ?? null,
        }}
      />

      {/* Catálogo público */}
      <section className="grid grid-cols-12 gap-8 border-t border-border pt-12">
        <div className="col-span-12 md:col-span-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold-deep">
            07
          </span>
          <h2 className="mt-2 font-display text-xl font-medium tracking-tight text-primary">
            Catálogo público
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
            Enlace público con tus productos sin precios. Ideal para compartir con clientes.
          </p>
          <span className="mt-4 block h-px w-12 bg-gold/60" />
        </div>
        <div className="col-span-12 md:col-span-9">
          <CatalogPanel
            enabled={company?.catalog_enabled ?? false}
            catalogUrl={catalogUrl}
          />
        </div>
      </section>
    </div>
  );
}
