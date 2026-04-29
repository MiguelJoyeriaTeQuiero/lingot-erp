import Link from "next/link";
import { Plus, ScanLine } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import { requireRole } from "@/lib/require-role";
import { ProductsTable } from "./products-table";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const { role } = await requireRole(["admin", "contabilidad"]);
  const isAdmin = role === "admin";
  const supabase = createTypedClient();

  const [productsResult, categoriesResult, companyResult, spots] =
    await Promise.all([
      supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true }),
      supabase
        .from("product_categories")
        .select("id, name, igic_rate, created_at, updated_at")
        .order("name", { ascending: true }),
      supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
      getLatestSpots(),
    ]);

  const globalMarkupPct = Number(
    (companyResult.data as { metal_markup_pct?: number } | null)
      ?.metal_markup_pct ?? 4
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operación · 03"
        title="Inventario"
        description="Piezas con precio dinámico vinculado al spot del metal."
        action={
          <div className="flex items-center gap-2">
            <Link href="/inventario/conteo">
              <Button variant="secondary">
                <ScanLine className="h-4 w-4" strokeWidth={1.5} />
                Iniciar conteo
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/inventario/nuevo">
                <Button>
                  <Plus className="h-4 w-4" />
                  Nueva pieza
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {productsResult.error ? (
        <div className="border-l-2 border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
          No se han podido cargar los productos: {productsResult.error.message}
        </div>
      ) : (
        <ProductsTable
          products={productsResult.data ?? []}
          categories={categoriesResult.data ?? []}
          spotByMetal={{
            oro: spots.oro?.price_eur_per_g ?? null,
            plata: spots.plata?.price_eur_per_g ?? null,
          }}
          globalMarkupPct={globalMarkupPct}
        />
      )}
    </div>
  );
}
