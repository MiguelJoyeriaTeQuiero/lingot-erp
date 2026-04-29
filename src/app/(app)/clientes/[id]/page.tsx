import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { createTypedClient } from "@/lib/supabase/typed";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ClientInput } from "@/lib/validations/client";
import { ClientForm } from "../client-form";
import { requireRole } from "@/lib/require-role";

export const dynamic = "force-dynamic";

const statusToBadge: Record<string, BadgeVariant> = {
  borrador: "borrador",
  emitido: "emitido",
  pagado: "pagado",
  vencido: "vencido",
  cancelado: "cancelado",
  convertido: "convertido",
};

export default async function ClienteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["admin"]);
  const supabase = createTypedClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !client) notFound();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, doc_type, status, code, issue_date, total")
    .eq("client_id", params.id)
    .order("issue_date", { ascending: false })
    .limit(20);

  const formDefaults: Partial<ClientInput> =
    client.type === "empresa"
      ? {
          type: "empresa",
          name: client.name,
          tax_id: client.tax_id ?? "",
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
          postal_code: client.postal_code,
          price_tier: client.price_tier,
          notes: client.notes,
          active: client.active,
          contact_name: client.contact_name ?? "",
        }
      : {
          type: "particular",
          name: client.name,
          tax_id: client.tax_id ?? "",
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
          postal_code: client.postal_code,
          price_tier: client.price_tier,
          notes: client.notes,
          active: client.active,
          contact_name: client.contact_name,
        };

  return (
    <div className="space-y-8">
      <PageHeader
        title={client.name}
        description={client.tax_id ?? "Sin identificador fiscal"}
        action={
          <Link href={`/documentos/nuevo?client_id=${client.id}`}>
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo documento
            </Button>
          </Link>
        }
      />

      <section className="space-y-4">
        <h2 className="font-display text-sm uppercase tracking-widest text-text-muted">
          Datos
        </h2>
        <div className="rounded-md border border-border bg-surface p-6">
          <ClientForm
            mode="edit"
            clientId={client.id}
            defaultValues={formDefaults}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-sm uppercase tracking-widest text-text-muted">
          Historial
        </h2>
        <div className="rounded-md border border-border bg-surface">
          {!documents || documents.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-text-muted">
              Aún no hay documentos para este cliente.
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Nº</TH>
                  <TH>Fecha</TH>
                  <TH>Tipo</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Estado</TH>
                </TR>
              </THead>
              <TBody>
                {documents.map((d) => (
                  <TR key={d.id}>
                    <TD className="font-medium text-text">
                      {d.code ?? "—"}
                    </TD>
                    <TD className="text-text-muted">
                      {formatDate(d.issue_date)}
                    </TD>
                    <TD className="text-text-muted">
                      {d.doc_type === "factura" ? "Factura" : "Albarán"}
                    </TD>
                    <TD className="text-right">{formatCurrency(d.total)}</TD>
                    <TD>
                      <Badge
                        variant={statusToBadge[d.status] ?? "neutral"}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
