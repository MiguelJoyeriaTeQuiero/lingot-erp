import { PageHeader } from "@/components/layout/page-header";
import { createTypedClient } from "@/lib/supabase/typed";
import { LibroView } from "./libro-view";
import { requireRole } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export default async function LibroPage() {
  await requireRole(["admin"]);
  const supabase = createTypedClient();

  const [docsResult, clientsResult] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("doc_type", "factura")
      .order("issue_date", { ascending: false })
      .limit(2000),
    supabase
      .from("clients")
      .select("id, type, name, tax_id, created_at, updated_at, contact_name, email, phone, address, city, postal_code, country, price_tier, notes, active")
      .order("name"),
  ]);

  const docs = (docsResult.data ?? []).filter(
    (d) => d.status !== "borrador" && d.status !== "cancelado"
  );

  const clientMap: Record<string, string> = {};
  for (const c of clientsResult.data ?? []) {
    clientMap[c.id] = c.name;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Contabilidad · 05"
        title="Libro de facturación"
        description="Histórico de facturas emitidas agrupado por período."
      />
      <LibroView docs={docs} clientMap={clientMap} />
    </div>
  );
}
