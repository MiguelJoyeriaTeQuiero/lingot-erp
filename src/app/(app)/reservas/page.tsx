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
};

export default async function ReservasPage() {
  await requireRole(["admin"]);

  const admin = createRawAdminClient();

  const { data } = await admin
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false });

  const reservations = (data ?? []) as ReservationRow[];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Gestión · 08" title="Reservas" />
      <ReservasClient rows={reservations} />
    </div>
  );
}
