import { PageHeader } from "@/components/layout/page-header";
import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import type { CompanySettingsInput } from "@/lib/validations/company";
import { CompanyForm } from "./company-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const supabase = createTypedClient();

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
    </div>
  );
}
