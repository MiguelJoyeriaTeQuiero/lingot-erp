"use server";

import { createRawAdminClient } from "@/lib/supabase/admin";

export async function updateReservationStatusAction(
  id: string,
  status: string
): Promise<{ success: true } | { error: string }> {
  try {
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
