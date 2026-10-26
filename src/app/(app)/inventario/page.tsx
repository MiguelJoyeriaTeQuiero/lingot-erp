import Link from "next/link";
import { Plus, ScanLine } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import { requireRole } from "@/lib/require-role";
import { onlyInTransitLots, stockValuationByProduct } from "@/lib/inventory";
import { ProductsTable } from "./products-table";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const { role } = await requireRole(["admin", "contabilidad"]);
  const isAdmin = role === "admin";
  const supabase = createTypedClient();

  const [productsResult, categoriesResult, companyResult, spots, pendingOrdersResult, lotsResult] =
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
      supabase
        .from("purchase_orders")
        .select("id, product_id, quantity")
        .eq("received", false),
      supabase
        .from("stock_lots")
        .select("product_id, cost_per_unit, cost_per_gram, quantity_remaining, order_date, purchase_order_id")
        .order("order_date", { ascending: true }),
    ]);

  // «En envío»: pedidos de reposición aún sin recibir. No forman parte del
  // stock (stock_current solo sube al recibirlos) ni del disponible en la web.
  const pendingOrders = (pendingOrdersResult.data ?? []) as Array<{ id: string; product_id: string; quantity: number }>;
  const inTransitOrderIds = new Set(pendingOrders.map((o) => o.id));
  const pendingByProductId: Record<string, number> = {};
  for (const o of pendingOrders) {
    pendingByProductId[o.product_id] = (pendingByProductId[o.product_id] ?? 0) + Number(o.quantity);
  }

  const allLots = (lotsResult.data ?? []) as Array<{
    product_id: string; cost_per_unit: number; cost_per_gram: number;
    quantity_remaining: number; order_date: string; purchase_order_id: string | null;
  }>;

  const transitValueByProductId: Record<string, number> = {};
  for (const [productId, v] of stockValuationByProduct(onlyInTransitLots(allLots, inTransitOrderIds))) {
    transitValueByProductId[productId] = v.value;
  }

  type LotSummary = { cost_per_unit: number; cost_per_gram: number; quantity_remaining: number; order_date: string; inTransit: boolean };
  const lotsByProductId: Record<string, LotSummary[]> = {};
  for (const l of allLots.filter((l) => Number(l.quantity_remaining) > 0)) {
    if (!lotsByProductId[l.product_id]) lotsByProductId[l.product_id] = [];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    lotsByProductId[l.product_id]!.push({
      cost_per_unit: Number(l.cost_per_unit),
      cost_per_gram: Number(l.cost_per_gram),
      quantity_remaining: Number(l.quantity_remaining),
      order_date: l.order_date,
      inTransit: l.purchase_order_id != null && inTransitOrderIds.has(l.purchase_order_id),
    });
  }

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
          pendingByProductId={pendingByProductId}
          transitValueByProductId={transitValueByProductId}
          lotsByProductId={lotsByProductId}
        />
      )}
    </div>
  );
}
