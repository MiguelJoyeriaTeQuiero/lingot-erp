import { PageHeader } from "@/components/layout/page-header";
import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  const supabase = createTypedClient();

  const [categoriesRes, companyRes, spots] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, name, igic_rate, created_at, updated_at")
      .order("name", { ascending: true }),
    supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
    getLatestSpots(),
  ]);

  const globalMarkupPct = Number(
    (companyRes.data as { metal_markup_pct?: number } | null)?.metal_markup_pct ??
      4
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operación · 03"
        title="Nuevo producto"
        description="Alta de pieza con cotización dinámica del metal."
      />
      <ProductForm
        mode="create"
        categories={categoriesRes.data ?? []}
        spotByMetal={{
          oro: spots.oro?.price_eur_per_g ?? null,
          plata: spots.plata?.price_eur_per_g ?? null,
        }}
        globalMarkupPct={globalMarkupPct}
      />
    </div>
  );
}
