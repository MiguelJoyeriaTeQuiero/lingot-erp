import "server-only";
import { createTypedClient } from "@/lib/supabase/typed";
import { loadClientArea } from "@/app/catalogo/client-area";
import type { LabDocumento, LabEstado, LabReserva, LabSession } from "./lab-session";

const ESTADOS: LabEstado[] = ["pendiente", "confirmada", "entregada", "cancelada"];

/**
 * Quién está mirando el catálogo y, si es cliente, su zona privada. Mismas
 * reglas que /catalogo: el personal del ERP ve precio mayorista y solo el
 * administrador ve el catálogo mientras está desactivado.
 */
export async function loadLabViewer(supabase: ReturnType<typeof createTypedClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { session: null, isAdmin: false, orders: [] as LabReserva[], documents: [] as LabDocumento[] };
  }

  const [profileRes, area] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, is_wholesale, full_name")
      .eq("id", user.id)
      .single(),
    loadClientArea(user.id, user.email ?? null),
  ]);

  const profile = profileRes.data;
  const role = profile?.role;

  const session: LabSession = {
    name:
      (profile as { full_name?: string | null } | null)?.full_name
      ?? user.email?.split("@")[0]
      ?? "",
    email: user.email ?? "",
    isWholesale:
      role === "admin" || role === "contabilidad" ||
      ((profile as { is_wholesale?: boolean } | null)?.is_wholesale ?? false),
  };

  const orders: LabReserva[] = area.reservations.map((r) => ({
    id:       r.id,
    name:     r.product_name,
    sku:      r.product_sku,
    quantity: r.quantity,
    price:    Number(r.price_snapshot),
    at:       r.created_at,
    // Un estado desconocido se muestra como pendiente antes que como etiqueta vacía
    estado:   ESTADOS.includes(r.status as LabEstado) ? (r.status as LabEstado) : "pendiente",
  }));

  const documents: LabDocumento[] = area.documents.map((d) => ({
    id:     d.id,
    code:   d.code,
    type:   d.doc_type,
    date:   d.issue_date,
    total:  d.total != null ? Number(d.total) : null,
    estado: d.status,
  }));

  return { session, isAdmin: role === "admin", orders, documents };
}
