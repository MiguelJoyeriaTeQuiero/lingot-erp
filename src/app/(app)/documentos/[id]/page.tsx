import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DocumentInput } from "@/lib/validations/document";
import { DocumentEditor } from "../document-editor";
import { DownloadPdfButton } from "./download-pdf-button";
import { ConvertButton } from "./convert-button";
import { RectifyButton } from "./rectify-button";
import { DeleteDocumentButton } from "./delete-button";

export const dynamic = "force-dynamic";

const statusToBadge: Record<string, BadgeVariant> = {
  borrador: "borrador",
  emitido: "emitido",
  pagado: "pagado",
  vencido: "vencido",
  cancelado: "cancelado",
  convertido: "convertido",
  rectificada: "rectificada",
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

  const docRow = doc as typeof doc & { rectification_of_invoice_id?: string | null };

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("id, email, full_name, role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = (profile as { role?: string } | null)?.role === "admin";

  const [
    linesResult,
    clientsResult,
    productsResult,
    categoriesResult,
    companyResult,
    spots,
    lotsResult,
    originalResult,
    rectificationResult,
  ] = await Promise.all([
    supabase
      .from("document_lines")
      .select(
        "id, document_id, position, product_id, description, quantity, unit_price, discount_pct, igic_rate, line_subtotal, line_igic, line_total, lot_id, unit_cost, created_at"
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
    supabase.from("stock_lots").select("*").order("order_date", { ascending: false }),
    // Si este documento ES una rectificativa, cargamos la factura original
    docRow.rectification_of_invoice_id
      ? supabase
          .from("documents")
          .select("*")
          .eq("id", docRow.rectification_of_invoice_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    // Si esta factura fue RECTIFICADA, buscamos la rectificativa
    doc.status === "rectificada"
      ? supabase
          .from("documents")
          .select("*")
          .eq("rectification_of_invoice_id", doc.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const globalMarkupPct = Number(
    (companyResult.data as { metal_markup_pct?: number } | null)
      ?.metal_markup_pct ?? 4
  );

  const lines = linesResult.data ?? [];
  const allClients = clientsResult.data ?? [];
  const docClient = allClients.find((c) => c.id === doc.client_id) ?? null;
  const company = companyResult.data ?? null;
  const allLots = lotsResult.data ?? [];
  const canDownload = doc.status !== "borrador" && docClient !== null;
  const canConvert =
    doc.doc_type === "albaran" &&
    doc.status === "emitido" &&
    !doc.converted_to_invoice_id;
  const canRectify =
    doc.doc_type === "factura" &&
    (doc.status === "emitido" || doc.status === "pagado");

  const originalDoc = originalResult.data as typeof doc | null;
  const rectificationDoc = rectificationResult.data as typeof doc | null;

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
            lot_id: l.lot_id ?? null,
            unit_cost: l.unit_cost != null ? Number(l.unit_cost) : null,
          }))
        : [
            {
              product_id: null,
              description: "",
              quantity: 1,
              unit_price: 0,
              discount_pct: 0,
              igic_rate: 0,
              lot_id: null,
              unit_cost: null,
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
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Badge variant={statusToBadge[doc.status] ?? "neutral"} />
            {canConvert && <ConvertButton documentId={doc.id} />}
            {canRectify && <RectifyButton documentId={doc.id} />}
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
            {isAdmin && (
              <DeleteDocumentButton documentId={doc.id} docCode={doc.code} />
            )}
          </div>
        }
      />

      {/* Banner: este documento es una rectificativa */}
      {originalDoc && (
        <div className="flex items-center gap-3 rounded-none border border-purple-700/25 bg-purple-50/60 px-5 py-3">
          <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-purple-700" strokeWidth={1.5} />
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-purple-700">
            Factura rectificativa de
          </span>
          <Link
            href={`/documentos/${originalDoc.id}`}
            className="font-mono text-[11px] font-medium tracking-[0.18em] text-purple-800 underline-offset-2 hover:underline"
          >
            {originalDoc.code ?? "factura original"}
          </Link>
        </div>
      )}

      {/* Banner: esta factura ya fue rectificada */}
      {rectificationDoc && (
        <div className="flex items-center gap-3 rounded-none border border-purple-700/25 bg-purple-50/60 px-5 py-3">
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-purple-700" strokeWidth={1.5} />
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-purple-700">
            Esta factura fue rectificada —
          </span>
          <Link
            href={`/documentos/${rectificationDoc.id}`}
            className="font-mono text-[11px] font-medium tracking-[0.18em] text-purple-800 underline-offset-2 hover:underline"
          >
            ver rectificativa {rectificationDoc.code ?? "(borrador)"}
          </Link>
        </div>
      )}

      <div className="rounded-md border border-border bg-surface p-6">
        <DocumentEditor
          mode="edit"
          documentId={doc.id}
          defaultValues={initial}
          status={doc.status}
          clients={allClients}
          products={productsResult.data ?? []}
          categories={categoriesResult.data ?? []}
          lots={allLots}
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
