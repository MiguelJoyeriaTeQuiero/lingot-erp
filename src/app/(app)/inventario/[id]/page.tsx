import { notFound } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, RefreshCw, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import { formatDate } from "@/lib/utils";
import type { ProductInput } from "@/lib/validations/product";
import { ProductForm } from "../product-form";
import { StockAdjustForm } from "./stock-adjust-form";
import {
  PurchaseOrderSection,
  type PurchaseOrderEntry,
} from "./purchase-order-section";
import {
  ProfitabilitySection,
  type LotProfitRow,
} from "./profitability-section";

export const dynamic = "force-dynamic";

const movementMeta = {
  entrada: { label: "Entrada", icon: ArrowUpRight, accent: "text-success" },
  salida: { label: "Salida", icon: ArrowDownRight, accent: "text-danger" },
  ajuste: { label: "Ajuste", icon: RefreshCw, accent: "text-gold" },
} as const;

export default async function ProductoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createTypedClient();

  const [{ data: product, error }, { data: categories }, { data: company }, spots] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", params.id).single(),
      supabase
        .from("product_categories")
        .select("id, name, igic_rate, created_at, updated_at")
        .order("name", { ascending: true }),
      supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
      getLatestSpots(),
    ]);

  if (error || !product) notFound();

  const globalMarkupPct = Number(
    (company as { metal_markup_pct?: number } | null)?.metal_markup_pct ?? 4
  );

  const [{ data: movements }, { data: rawOrders }] = await Promise.all([
    supabase
      .from("stock_movements")
      .select(
        "id, product_id, movement_type, quantity, document_id, reason, created_by, created_at"
      )
      .eq("product_id", params.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("purchase_orders")
      .select(
        "id, order_date, supplier_name, quantity, cost_per_gram, spot_price_per_g, total_cost, notes, created_at, invoice_url"
      )
      .eq("product_id", params.id)
      .order("order_date", { ascending: true }),
  ]);

  // Calcular fluctuación entre pedidos consecutivos
  const sortedOrders = (rawOrders ?? []).slice().sort((a, b) => {
    const d = new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
    return d !== 0 ? d : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  const ordersWithDelta: PurchaseOrderEntry[] = sortedOrders
    .map((order, i) => {
      if (i === 0) return { ...order, delta: null, deltaPct: null };
      const prev = sortedOrders[i - 1]!;
      const delta = Number(order.cost_per_gram) - Number(prev.cost_per_gram);
      const deltaPct = (delta / Number(prev.cost_per_gram)) * 100;
      return { ...order, delta, deltaPct };
    })
    .reverse();

  // Rentabilidad por lotes
  const { data: rawLots } = await supabase
    .from("stock_lots")
    .select("*")
    .eq("product_id", params.id)
    .order("order_date", { ascending: false });

  let lotProfitRows: LotProfitRow[] = (rawLots ?? []).map((l) => ({
    id: l.id,
    order_date: l.order_date,
    supplier_name: null as string | null,
    quantity_total: Number(l.quantity_total),
    quantity_remaining: Number(l.quantity_remaining),
    cost_per_gram: Number(l.cost_per_gram),
    cost_per_unit: Number(l.cost_per_unit),
    qtySold: 0,
    revenue: 0,
    cogs: 0,
  }));

  if (lotProfitRows.length > 0) {
    const lotIds = lotProfitRows.map((l) => l.id);
    const { data: saleLines } = await supabase
      .from("document_lines")
      .select("lot_id, quantity, line_subtotal, document_id")
      .in("lot_id", lotIds);

    if (saleLines && saleLines.length > 0) {
      const docIds = [...new Set(saleLines.map((l) => l.document_id))];
      const { data: docs } = await supabase
        .from("documents")
        .select("id, status")
        .in("id", docIds);

      const emittedIds = new Set(
        (docs ?? [])
          .filter((d) => d.status !== "borrador" && d.status !== "cancelado")
          .map((d) => d.id)
      );

      const salesByLot = new Map<string, { qtySold: number; revenue: number }>();
      for (const line of saleLines) {
        if (!line.lot_id || !emittedIds.has(line.document_id)) continue;
        const s = salesByLot.get(line.lot_id) ?? { qtySold: 0, revenue: 0 };
        s.qtySold += Number(line.quantity);
        s.revenue += Number(line.line_subtotal);
        salesByLot.set(line.lot_id, s);
      }

      // COGS siempre = unidades vendidas × coste/unidad del lote (no de la línea)
      // para que el margen sea siempre precio venta por unidad vs coste de compra por unidad
      lotProfitRows = lotProfitRows.map((row) => {
        const s = salesByLot.get(row.id);
        if (!s) return row;
        return {
          ...row,
          qtySold: s.qtySold,
          revenue: s.revenue,
          cogs: s.qtySold * row.cost_per_unit,
        };
      });
    }

    // Enriquecer con nombre del proveedor desde purchase_orders
    if (rawOrders && rawOrders.length > 0) {
      const orderById = new Map(rawOrders.map((o) => [o.id, o]));
      lotProfitRows = lotProfitRows.map((row) => {
        const lot = (rawLots ?? []).find((l) => l.id === row.id);
        if (lot?.purchase_order_id) {
          const order = orderById.get(lot.purchase_order_id);
          return { ...row, supplier_name: order?.supplier_name ?? null };
        }
        return row;
      });
    }
  }

  const formDefaults: Partial<ProductInput> = {
    type: product.type,
    sku: product.sku,
    name: product.name,
    description: product.description,
    category_id: product.category_id,
    metal: product.metal,
    weight_g: Number(product.weight_g ?? 0),
    purity: Number(product.purity ?? 0),
    markup_per_gram: Number(product.markup_per_gram ?? 0),
    markup_per_piece: Number(product.markup_per_piece ?? 0),
    cost_price: product.cost_price,
    stock_min: product.stock_min,
    igic_rate: product.igic_rate,
    active: product.active,
  };

  const isPhysical = product.type === "producto";
  const lowStock = isPhysical && product.stock_current <= product.stock_min;

  return (
    <div className="space-y-8">
      <PageHeader
        title={product.name}
        description={
          product.sku
            ? `SKU ${product.sku}`
            : isPhysical
            ? "Producto físico"
            : "Servicio"
        }
        action={
          <div className="flex items-center gap-3">
            {isPhysical && (
              <div className="text-right">
                <div className="text-xs uppercase tracking-widest text-text-muted">
                  Stock actual
                </div>
                <div
                  className={
                    "font-display text-2xl " +
                    (lowStock ? "text-danger" : "text-text")
                  }
                >
                  {product.stock_current}
                </div>
              </div>
            )}
            {product.active ? (
              <Badge variant="pagado">Activo</Badge>
            ) : (
              <Badge variant="cancelado">Inactivo</Badge>
            )}
          </div>
        }
      />

      <section className="space-y-4">
        <h2 className="font-display text-sm uppercase tracking-widest text-text-muted">
          Datos
        </h2>
        <div className="rounded-md border border-border bg-surface p-6">
          <ProductForm
            mode="edit"
            productId={product.id}
            defaultValues={formDefaults}
            categories={categories ?? []}
            spotByMetal={{
              oro: spots.oro?.price_eur_per_g ?? null,
              plata: spots.plata?.price_eur_per_g ?? null,
            }}
            globalMarkupPct={globalMarkupPct}
          />
        </div>
      </section>

      {isPhysical && (
        <section className="space-y-4">
          <div className="rounded-md border border-border bg-surface p-6">
            <StockAdjustForm
              productId={product.id}
              currentStock={product.stock_current}
            />
          </div>
        </section>
      )}

      {isPhysical && product.metal && (
        <PurchaseOrderSection
          productId={product.id}
          weightG={Number(product.weight_g ?? 0)}
          metal={product.metal as "oro" | "plata"}
          currentSpotPerG={spots[product.metal as "oro" | "plata"]?.price_eur_per_g ?? null}
          orders={ordersWithDelta}
        />
      )}

      {isPhysical && (
        <ProfitabilitySection rows={lotProfitRows} />
      )}

      {isPhysical && (
        <section className="space-y-4">
          <h2 className="font-display text-sm uppercase tracking-widest text-text-muted">
            Historial de movimientos
          </h2>
          <div className="rounded-md border border-border bg-surface">
            {!movements || movements.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-text-muted">
                Aún no hay movimientos registrados.
              </div>
            ) : (
              <Table className="min-w-[560px]">
                <THead>
                  <TR>
                    <TH>Fecha</TH>
                    <TH>Tipo</TH>
                    <TH className="text-right">Cantidad</TH>
                    <TH>Motivo</TH>
                    <TH>Documento</TH>
                    <TH>Factura compra</TH>
                  </TR>
                </THead>
                <TBody>
                  {movements.map((m) => {
                    const meta = movementMeta[m.movement_type];
                    const Icon = meta.icon;
                    return (
                      <TR key={m.id}>
                        <TD className="text-text-muted">
                          {formatDate(m.created_at)}
                        </TD>
                        <TD>
                          <span
                            className={
                              "inline-flex items-center gap-1.5 " + meta.accent
                            }
                          >
                            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                            {meta.label}
                          </span>
                        </TD>
                        <TD className="text-right">{m.quantity}</TD>
                        <TD className="text-text-muted">{m.reason ?? "—"}</TD>
                        <TD className="text-text-muted">
                          {m.document_id ? (
                            <span className="font-mono text-xs">
                              {m.document_id.slice(0, 8)}…
                            </span>
                          ) : (
                            "—"
                          )}
                        </TD>
                        <TD>
                          {(m as typeof m & { invoice_url?: string | null }).invoice_url ? (
                            <a
                              href={(m as typeof m & { invoice_url?: string | null }).invoice_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-gold-deep underline-offset-2 hover:underline"
                            >
                              <Receipt className="h-3.5 w-3.5" strokeWidth={1.5} />
                              Ver factura
                            </a>
                          ) : (
                            <span className="text-text-dim">—</span>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
