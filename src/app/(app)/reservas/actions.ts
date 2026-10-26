"use server";

import { createRawAdminClient } from "@/lib/supabase/admin";
import { getStaffRole } from "@/lib/require-role";

const STATUSES = ["pendiente", "confirmada", "entregada", "cancelada"];

export async function updateReservationStatusAction(
  id: string,
  status: string
): Promise<{ success: true } | { error: string }> {
  try {
    // Usa el cliente de servicio: sin esta comprobación cualquiera podría
    // invocar la acción y cambiar reservas ajenas.
    if (!(await getStaffRole())) {
      return { error: "No autorizado." };
    }
    if (!STATUSES.includes(status)) {
      return { error: "Estado no válido." };
    }

    const admin = createRawAdminClient();

    const { error } = await admin
      .from("reservations")
      .update({ status })
      .eq("id", id);

    if (error) {
      return { error: "Error al actualizar el estado." };
    }

    return { success: true };
  } catch {
    return { error: "Error inesperado. Inténtalo de nuevo." };
  }
}

export type FreshReservation = {
  id: string;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  product_name: string;
  quantity: number;
  price_snapshot: number;
};

export type ReservationPulse = {
  /** Reservas en estado «pendiente»: lo que falta por gestionar. */
  pending: number;
  /** Reservas creadas después de `since`, de la más antigua a la más reciente. */
  fresh: FreshReservation[];
};

/**
 * Pulso de reservas para los avisos del ERP. `since` es el created_at de la
 * última reserva ya conocida, tal cual lo devolvió la base: con microsegundos,
 * para no volver a avisar de la misma reserva.
 */
export async function reservationPulseAction(since: string): Promise<ReservationPulse | null> {
  if (!(await getStaffRole())) return null;
  if (Number.isNaN(Date.parse(since))) return null;

  const admin = createRawAdminClient();

  const [pendingRes, freshRes] = await Promise.all([
    admin
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendiente"),
    admin
      .from("reservations")
      .select("id, created_at, customer_name, customer_email, product_name, quantity, price_snapshot")
      .gt("created_at", since)
      .order("created_at", { ascending: true })
      .limit(10),
  ]);

  return {
    pending: pendingRes.count ?? 0,
    fresh: (freshRes.data ?? []) as FreshReservation[],
  };
}
