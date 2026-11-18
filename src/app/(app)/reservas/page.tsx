import { createRawAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/require-role";
import { PageHeader } from "@/components/layout/page-header";
import { ReservasClient } from "./reservas-client";

export const dynamic = "force-dynamic";

export type ReservationRow = {
  id: string;
  created_at: string;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  price_snapshot: number;
  phone: string | null;
  note: string | null;
  status: string;
  /** Factura creada desde la reserva (migración 031). */
  invoice_id?: string | null;
  invoice?: { id: string; code: string | null; status: string } | null;
};

export default async function ReservasPage() {
  await requireRole(["admin", "contabilidad"]);

  const admin = createRawAdminClient();

  const { data } = await admin
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false });

  const reservations = (data ?? []) as ReservationRow[];

  // Facturas enlazadas: se consultan aparte para no depender de la relación
  const invoiceIds = reservations
    .map((r) => r.invoice_id)
    .filter((id): id is string => Boolean(id));
  if (invoiceIds.length > 0) {
    const { data: invoices } = await admin
      .from("documents")
      .select("id, code, status")
      .in("id", invoiceIds);
    const byId = new Map(
      ((invoices ?? []) as { id: string; code: string | null; status: string }[]).map((d) => [d.id, d])
    );
    for (const r of reservations) {
      r.invoice = r.invoice_id ? (byId.get(r.invoice_id) ?? null) : null;
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Gestión · 08" title="Reservas" />
      <ReservasClient rows={reservations} />
    </div>
  );
}
