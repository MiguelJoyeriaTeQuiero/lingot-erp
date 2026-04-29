import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DocumentInput } from "@/lib/validations/document";
import { DocumentEditor } from "../document-editor";
import { DownloadPdfButton } from "./download-pdf-button";
import { ConvertButton } from "./convert-button";

export const dynamic = "force-dynamic";

const statusToBadge: Record<string, BadgeVariant> = {
  borrador: "borrador",
  emitido: "emitido",
  pagado: "pagado",
  vencido: "vencido",
  cancelado: "cancelado",
  convertido: "convertido",
};

export default async function DocumentoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createTypedClient();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !doc) notFound();

  const [
    linesResult,
    clientsResult,
    productsResult,
    categoriesResult,
    companyResult,
    spots,
  ] = await Promise.all([
    supabase
      .from("document_lines")
      .select(
        "id, document_id, position, product_id, description, quantity, unit_price, discount_pct, igic_rate, line_subtotal, line_igic, line_total, created_at"
      )
      .eq("document_id", doc.id)
      .order("position"),
    supabase
      .from("clients")
      .select(
        "id, type, name, tax_id, contact_name, email, phone, address, city, postal_code, country, price_tier, notes, active, created_at, updated_at"
      )
      .order("name"),
    supabase.from("products").select("*").order("name"),
    supabase
      .from("product_categories")
      .select("id, name, igic_rate, created_at, updated_at"),
    supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
    getLatestSpots(),
  ]);

  const globalMarkupPct = Number(
    (companyResult.data as { metal_markup_pct?: number } | null)
      ?.metal_markup_pct ?? 4
  );

  const lines = linesResult.data ?? [];
  const allClients = clientsResult.data ?? [];
  const docClient = allClients.find((c) => c.id === doc.client_id) ?? null;
  const company = companyResult.data ?? null;
  const canDownload = doc.status !== "borrador" && docClient !== null;
  const canConvert =
    doc.doc_type === "albaran" &&
    doc.status === "emitido" &&
    !doc.converted_to_invoice_id;

  const initial: DocumentInput = {
    doc_type: doc.doc_type,
    client_id: doc.client_id,
    issue_date: doc.issue_date,
    due_date: doc.due_date,
    notes: doc.notes,
    lines:
      lines.length > 0
        ? lines.map((l) => ({
            product_id: l.product_id,
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price,
            discount_pct: l.discount_pct,
            igic_rate: l.igic_rate,
          }))
        : [
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
        title={
          doc.code ??
          (doc.doc_type === "factura"
            ? "Factura (borrador)"
            : "Albarán (borrador)")
        }
        description={`Emisión ${formatDate(doc.issue_date)} · Total ${formatCurrency(
          doc.total
        )}`}
        action={
          <div className="flex items-center gap-3">
            <Badge variant={statusToBadge[doc.status] ?? "neutral"} />
            {canConvert && <ConvertButton documentId={doc.id} />}
            {canDownload && docClient && (
              <DownloadPdfButton
                payload={{
                  document: doc,
                  lines,
                  client: docClient,
                  company,
                }}
              />
            )}
          </div>
        }
      />

      <div className="rounded-md border border-border bg-surface p-6">
        <DocumentEditor
          mode="edit"
          documentId={doc.id}
          defaultValues={initial}
          status={doc.status}
          clients={allClients}
          products={productsResult.data ?? []}
          categories={categoriesResult.data ?? []}
          spotByMetal={{
            oro: spots.oro?.price_eur_per_g ?? null,
            plata: spots.plata?.price_eur_per_g ?? null,
          }}
          globalMarkupPct={globalMarkupPct}
        />
      </div>
    </div>
  );
}
