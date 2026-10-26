import "server-only";
import { createRawAdminClient } from "@/lib/supabase/admin";

export interface ClientReservation {
  id: string;
  created_at: string;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  price_snapshot: number;
  phone: string | null;
  note: string | null;
  status: string;
}

export interface ClientDocument {
  id: string;
  code: string | null;
  doc_type: string;
  issue_date: string;
  total: number | null;
  status: string;
}

/**
 * Zona privada del cliente del catálogo: sus reservas y los documentos emitidos
 * a su ficha de cliente. Reservas y documentos no están relacionados en la base:
 * las reservas cuelgan del usuario y los documentos de la ficha `clients` cuyo
 * email coincide con el de la cuenta.
 */
export async function loadClientArea(userId: string, email: string | null) {
  const admin = createRawAdminClient();

  const [reservationsRes, clientRes] = await Promise.all([
    admin
      .from("reservations")
      .select("id, created_at, product_name, product_sku, quantity, price_snapshot, phone, note, status")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("clients")
      .select("id")
      .ilike("email", email ?? "")
      .limit(1),
  ]);

  const clientId = clientRes.data?.[0]?.id ?? null;

  let documents: ClientDocument[] = [];
  if (clientId) {
    const docsRes = await admin
      .from("documents")
      .select("id, code, doc_type, issue_date, total, status")
      .eq("client_id", clientId)
      .neq("status", "borrador")
      .order("issue_date", { ascending: false });
    documents = (docsRes.data ?? []) as ClientDocument[];
  }

  return {
    reservations: (reservationsRes.data ?? []) as ClientReservation[],
    documents,
  };
}
