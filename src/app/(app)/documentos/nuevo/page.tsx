import { PageHeader } from "@/components/layout/page-header";
import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import { DocumentEditor } from "../document-editor";
import type { DocumentInput } from "@/lib/validations/document";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { client_id?: string; type?: string };
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export default async function NuevoDocumentoPage({ searchParams }: PageProps) {
  const supabase = createTypedClient();

  const [clientsResult, productsResult, categoriesResult, companyResult, spots] =
    await Promise.all([
      supabase
        .from("clients")
        .select(
          "id, type, name, tax_id, contact_name, email, phone, address, city, postal_code, country, price_tier, notes, active, created_at, updated_at"
        )
        .order("name"),
      supabase
        .from("products")
        .select("*")
        .order("name"),
      supabase
        .from("product_categories")
        .select("id, name, igic_rate, created_at, updated_at"),
      supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
      getLatestSpots(),
    ]);

  const preselectedType =
    searchParams?.type === "factura" ? "factura" : "albaran";

  const globalMarkupPct = Number(
    (companyResult.data as { metal_markup_pct?: number } | null)
      ?.metal_markup_pct ?? 4
  );

  const initial: DocumentInput = {
    doc_type: preselectedType,
    client_id: searchParams?.client_id ?? "",
    issue_date: todayIso(),
    due_date: null,
    notes: null,
    lines: [
      {
        product_id: null,
        description: "",
        quantity: 1,
        unit_price: 0,
        discount_pct: 0,
        igic_rate: 0,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operación · 04"
        title="Nuevo documento"
        description="Crea un albarán o factura en borrador. El precio se calcula con la cotización vigente del metal."
      />
      <DocumentEditor
        mode="create"
        defaultValues={initial}
        clients={clientsResult.data ?? []}
        products={productsResult.data ?? []}
        categories={categoriesResult.data ?? []}
        spotByMetal={{
          oro: spots.oro?.price_eur_per_g ?? null,
          plata: spots.plata?.price_eur_per_g ?? null,
        }}
        globalMarkupPct={globalMarkupPct}
      />
    </div>
  );
}
