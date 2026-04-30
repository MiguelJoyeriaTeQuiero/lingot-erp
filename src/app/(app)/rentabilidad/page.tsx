import { PageHeader } from "@/components/layout/page-header";
import { createTypedClient } from "@/lib/supabase/typed";
import { requireRole } from "@/lib/require-role";
import { RentabilidadView } from "./rentabilidad-view";

export const dynamic = "force-dynamic";

export type SaleRow = {
  id: string;
  doc_code: string | null;
  doc_id: string;
  issue_date: string;
  client_name: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  revenue: number;         // line_subtotal (sin IGIC)
  cost_per_unit: number;   // del lote de compra
  total_cost: number;      // cost_per_unit × quantity
  profit: number;          // revenue - total_cost
};

export default async function RentabilidadPage() {
  await requireRole(["admin"]);
  const supabase = createTypedClient();

  // Líneas de venta que tienen lote asignado
  const { data: rawLines } = await supabase
    .from("document_lines")
    .select("id, document_id, product_id, description, quantity, line_subtotal, lot_id");

  const lines = (rawLines ?? []).filter((l) => l.lot_id);
  if (lines.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Contabilidad · 06"
          title="Rentabilidad"
          description="Análisis de beneficio por venta."
        />
        <div className="rounded-md border border-border bg-surface px-4 py-10 text-center text-sm text-text-muted">
          Aún no hay ventas con lote asignado registradas.
        </div>
      </div>
    );
  }

  const docIds = [...new Set(lines.map((l) => l.document_id))];
  const lotIds = [...new Set(lines.map((l) => l.lot_id as string))];
  const productIds = [...new Set(lines.map((l) => l.product_id).filter(Boolean) as string[])];

  const [docsResult, lotsResult, productsResult, clientsResult] = await Promise.all([
    supabase
      .from("documents")
      .select("id, code, issue_date, status, client_id")
      .in("id", docIds),
    supabase
      .from("stock_lots")
      .select("id, cost_per_unit, product_id")
      .in("id", lotIds),
    supabase
      .from("products")
      .select("id, name, sku")
      .in("id", productIds),
    supabase
      .from("clients")
      .select("id, name"),
  ]);

  const docs = (docsResult.data ?? []).filter(
    (d) => d.status !== "borrador" && d.status !== "cancelado"
  );
  const emittedDocMap = new Map(docs.map((d) => [d.id, d]));
  const lotMap = new Map((lotsResult.data ?? []).map((l) => [l.id, l]));
  const productMap = new Map((productsResult.data ?? []).map((p) => [p.id, p]));
  const clientMap = new Map((clientsResult.data ?? []).map((c) => [c.id, c.name]));

  const rows: SaleRow[] = [];
  for (const line of lines) {
    const doc = emittedDocMap.get(line.document_id);
    if (!doc) continue;
    const lot = lotMap.get(line.lot_id as string);
    if (!lot) continue;

    const quantity = Number(line.quantity);
    const revenue = Number(line.line_subtotal);
    const costPerUnit = Number(lot.cost_per_unit);
    const totalCost = costPerUnit * quantity;
    const profit = revenue - totalCost;

    const productId = line.product_id ?? lot.product_id;
    const product = productId ? productMap.get(productId) : null;

    rows.push({
      id: line.id,
      doc_code: doc.code,
      doc_id: doc.id,
      issue_date: doc.issue_date,
      client_name: doc.client_id ? (clientMap.get(doc.client_id) ?? null) : null,
      product_name: product?.name ?? line.description ?? "—",
      product_sku: product?.sku ?? null,
      quantity,
      revenue,
      cost_per_unit: costPerUnit,
      total_cost: totalCost,
      profit,
    });
  }

  // Ordenar por fecha descendente
  rows.sort((a, b) => b.issue_date.localeCompare(a.issue_date));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Contabilidad · 06"
        title="Rentabilidad"
        description="Beneficio por venta — precio cobrado menos coste de compra por unidad."
      />
      <RentabilidadView rows={rows} />
    </div>
  );
}
