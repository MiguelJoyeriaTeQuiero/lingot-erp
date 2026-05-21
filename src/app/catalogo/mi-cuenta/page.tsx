import { redirect } from "next/navigation";
import { createTypedClient } from "@/lib/supabase/typed";
import { createRawAdminClient } from "@/lib/supabase/admin";
import { MiCuentaView } from "./mi-cuenta-view";

export const dynamic = "force-dynamic";

export default async function MiCuentaPage() {
  const supabase = createTypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/catalogo");
  }

  const admin = createRawAdminClient();

  const [profileRes, reservationsRes, clientRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, is_wholesale")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("reservations")
      .select(
        "id, created_at, product_name, product_sku, quantity, price_snapshot, phone, note, status"
      )
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("clients")
      .select("id, name")
      .ilike("email", user.email ?? "")
      .limit(1),
  ]);

  const profile = profileRes.data;
  const reservations = reservationsRes.data ?? [];
  const clientMatch = clientRes.data?.[0] ?? null;
  const clientId = clientMatch?.id ?? null;

  let documents: Array<{
    id: string;
    code: string | null;
    doc_type: string;
    issue_date: string;
    total: number | null;
    status: string;
  }> = [];

  if (clientId) {
    const docsRes = await admin
      .from("documents")
      .select("id, code, doc_type, issue_date, total, status")
      .eq("client_id", clientId)
      .neq("status", "borrador")
      .order("issue_date", { ascending: false });
    documents = (docsRes.data ?? []) as typeof documents;
  }

  return (
    <MiCuentaView
      user={{
        email: user.email ?? "",
        name:
          (profile as { full_name?: string } | null)?.full_name ??
          user.email ??
          "",
      }}
      isWholesale={
        (profile as { is_wholesale?: boolean } | null)?.is_wholesale ?? false
      }
      reservations={
        reservations as Array<{
          id: string;
          created_at: string;
          product_name: string;
          product_sku: string | null;
          quantity: number;
          price_snapshot: number;
          phone: string | null;
          note: string | null;
          status: string;
        }>
      }
      documents={documents}
    />
  );
}
