import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { createTypedClient } from "@/lib/supabase/typed";
import { DocumentsTable } from "./documents-table";

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const supabase = createTypedClient();

  const [docsResult, clientsResult] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, doc_type, status, code, number, client_id, issue_date, due_date, total, notes, created_at, updated_at, subtotal, igic_total, series_id, converted_to_invoice_id, source_albaran_id, created_by"
      )
      .order("issue_date", { ascending: false })
      .limit(500),
    supabase
      .from("clients")
      .select(
        "id, type, name, tax_id, contact_name, email, phone, address, city, postal_code, country, price_tier, notes, active, created_at, updated_at"
      )
      .order("name"),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Documentos"
        description="Albaranes y facturas. Crear borradores, emitir y consultar."
        action={
          <Link href="/documentos/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo documento
            </Button>
          </Link>
        }
      />

      {docsResult.error ? (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          No se han podido cargar los documentos: {docsResult.error.message}
        </div>
      ) : (
        <DocumentsTable
          documents={docsResult.data ?? []}
          clients={clientsResult.data ?? []}
        />
      )}
    </div>
  );
}
