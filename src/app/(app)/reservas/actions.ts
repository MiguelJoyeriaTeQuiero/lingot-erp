"use server";

import { revalidatePath } from "next/cache";
import { createRawAdminClient } from "@/lib/supabase/admin";
import { createTypedClient } from "@/lib/supabase/typed";
import { getStaffRole } from "@/lib/require-role";
import { SILVER_IGIC_RATE } from "@/lib/pricing";
import { round2 } from "@/lib/validations/document";
import { formatDate } from "@/lib/utils";
import { createDocumentDraft } from "../documentos/actions";

const STATUSES = ["pendiente", "confirmada", "entregada", "cancelada"];

type ReservationForInvoice = {
  id: string;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price_snapshot: number;
  phone: string | null;
  note: string | null;
  status: string;
  invoice_id?: string | null;
};

/** Escapa los comodines de ILIKE para buscar el email tal cual. */
function likeExact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Crea una factura en borrador a partir de una reserva del catálogo.
 *
 * - Cliente: la ficha de Clientes con el mismo email que la cuenta del
 *   catálogo (mismo criterio que la zona privada del cliente). Si no existe,
 *   la crea un admin; contabilidad no puede dar de alta clientes.
 * - Precio: el de la reserva (unitario, con IGIC), desglosado en base + IGIC
 *   para que el total sea el que vio el cliente.
 * - Lote: el más antiguo con unidades suficientes, priorizando los recibidos.
 *   Se puede cambiar en el borrador antes de emitir.
 *
 * La reserva queda enlazada a la factura para no facturarla dos veces.
 */
export async function createInvoiceFromReservationAction(
  reservationId: string
): Promise<{ success: true; id: string; existing?: boolean } | { error: string }> {
  try {
    const role = await getStaffRole();
    if (!role) return { error: "No autorizado." };

    const admin = createRawAdminClient();
    const supabase = createTypedClient();

    const { data: resData, error: resErr } = await admin
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .maybeSingle();
    if (resErr || !resData) return { error: "Reserva no encontrada." };
    const reservation = resData as ReservationForInvoice;

    if (reservation.status === "cancelada") {
      return { error: "La reserva está cancelada." };
    }

    // Ya facturada: se abre la factura existente en vez de crear otra
    if (reservation.invoice_id) {
      const { data: existing } = await supabase
        .from("documents")
        .select("id")
        .eq("id", reservation.invoice_id)
        .maybeSingle();
      if (existing) return { success: true, id: existing.id, existing: true };
    }

    if (!reservation.product_id) {
      return { error: "La reserva no tiene un producto del inventario asociado." };
    }

    const { data: product } = await supabase
      .from("products")
      .select("id, name, metal, igic_rate, category_id, type")
      .eq("id", reservation.product_id)
      .maybeSingle();
    if (!product) return { error: "El producto de la reserva ya no existe en el inventario." };

    // ── Cliente ────────────────────────────────────────────────────────────
    const email = reservation.customer_email?.trim() ?? "";
    if (!email) return { error: "La reserva no tiene email de cliente." };

    // Búsqueda sin distinguir mayúsculas, como la zona privada del catálogo
    const { data: clientMatch } = await admin
      .from("clients")
      .select("id")
      .ilike("email", likeExact(email))
      .limit(1);
    let clientId = (clientMatch?.[0] as { id?: string } | undefined)?.id ?? null;

    if (!clientId) {
      if (role !== "admin") {
        return {
          error: `No hay ficha de cliente con el email ${email}. Un administrador debe darla de alta en Clientes.`,
        };
      }
      const { data: created, error: clientErr } = await supabase
        .from("clients")
        .insert({
          type: "particular",
          name: reservation.customer_name?.trim() || email,
          email,
          phone: reservation.phone,
          notes: "Alta automática desde una reserva del catálogo web.",
        })
        .select("id")
        .single();
      if (clientErr || !created) {
        return { error: "No se pudo crear la ficha de cliente." };
      }
      clientId = created.id;
    }

    // ── IGIC y precio ──────────────────────────────────────────────────────
    // Mismo IGIC con el que la web calculó el precio de la reserva.
    let igicRate = 0;
    if (product.metal === "plata") {
      igicRate = SILVER_IGIC_RATE;
    } else if (product.igic_rate !== null) {
      igicRate = Number(product.igic_rate);
    } else if (product.category_id) {
      const { data: cat } = await supabase
        .from("product_categories")
        .select("igic_rate")
        .eq("id", product.category_id)
        .maybeSingle();
      igicRate = Number(cat?.igic_rate ?? 0);
    }
    const unitPrice = round2(Number(reservation.price_snapshot) / (1 + igicRate / 100));

    // ── Lote ───────────────────────────────────────────────────────────────
    const quantity = Number(reservation.quantity) || 1;
    let lotId: string | null = null;
    let unitCost: number | null = null;
    if (product.type === "producto") {
      const [lotsRes, pendingRes] = await Promise.all([
        supabase
          .from("stock_lots")
          .select("id, purchase_order_id, quantity_remaining, cost_per_unit, order_date")
          .eq("product_id", product.id)
          .gte("quantity_remaining", quantity)
          .order("order_date", { ascending: true }),
        supabase
          .from("purchase_orders")
          .select("id")
          .eq("product_id", product.id)
          .eq("received", false),
      ]);
      const pendingIds = new Set((pendingRes.data ?? []).map((o) => o.id));
      const lots = lotsRes.data ?? [];
      const lot =
        lots.find((l) => !l.purchase_order_id || !pendingIds.has(l.purchase_order_id)) ??
        lots[0] ??
        null;
      if (lot) {
        lotId = lot.id;
        unitCost = Number(lot.cost_per_unit);
      }
    }

    // ── Borrador ───────────────────────────────────────────────────────────
    const created = await createDocumentDraft({
      doc_type: "factura",
      client_id: clientId,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      notes:
        `Reserva web del ${formatDate(reservation.created_at)}` +
        (reservation.note ? `\n${reservation.note}` : ""),
      lines: [
        {
          product_id: product.id,
          description: product.name,
          quantity,
          unit_price: unitPrice,
          discount_pct: 0,
          igic_rate: igicRate,
          lot_id: lotId,
          unit_cost: unitCost,
        },
      ],
    });
    if (!created.success || !created.id) {
      return { error: created.error ?? "No se pudo crear la factura." };
    }

    // Enlace reserva → factura (migración 031)
    await admin
      .from("reservations")
      .update({ invoice_id: created.id })
      .eq("id", reservation.id);

    revalidatePath("/reservas");
    return { success: true, id: created.id };
  } catch {
    return { error: "Error inesperado. Inténtalo de nuevo." };
  }
}

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
