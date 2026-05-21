"use server";

import { createTypedClient } from "@/lib/supabase/typed";
import { createRawAdminClient } from "@/lib/supabase/admin";

export async function createReservationAction(data: {
  product_id: string;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  price_snapshot: number;
  phone: string;
  note: string;
}): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = createTypedClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Debes iniciar sesión para hacer una reserva." };
    }

    // Get customer profile name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const customerName =
      (profile as { full_name?: string | null } | null)?.full_name ?? null;

    const admin = createRawAdminClient();

    const { error } = await admin.from("reservations").insert({
      customer_id: user.id,
      customer_name: customerName,
      customer_email: user.email ?? null,
      product_id: data.product_id,
      product_name: data.product_name,
      product_sku: data.product_sku,
      quantity: data.quantity,
      price_snapshot: data.price_snapshot,
      phone: data.phone || null,
      note: data.note || null,
      status: "pendiente",
    });

    if (error) {
      return { error: "Error al crear la reserva. Inténtalo de nuevo." };
    }

    return { success: true };
  } catch {
    return { error: "Error inesperado. Inténtalo de nuevo." };
  }
}
