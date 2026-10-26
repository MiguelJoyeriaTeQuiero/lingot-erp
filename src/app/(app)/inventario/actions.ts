"use server";

import { revalidatePath } from "next/cache";
import { createTypedClient } from "@/lib/supabase/typed";
import { createRawAdminClient } from "@/lib/supabase/admin";
import {
  productSchema,
  stockMovementSchema,
  purchaseOrderSchema,
  type ProductInput,
} from "@/lib/validations/product";

type ActionResult = { success: boolean; error?: string; id?: string };

function toDbPayload(input: ProductInput) {
  return {
    type: input.type,
    sku: input.sku,
    name: input.name,
    description: input.description,
    category_id: input.category_id,
    metal: input.metal,
    weight_g: input.weight_g,
    purity: input.purity,
    markup_per_gram: input.markup_per_gram,
    markup_per_piece: input.markup_per_piece,
    cost_price: input.cost_price,
    stock_min: input.stock_min,
    igic_rate: input.igic_rate,
    active: input.active,
    catalog_out_of_stock: input.catalog_out_of_stock ?? false,
    image_urls: input.image_urls ?? [],
    retail_markup_pct: input.retail_markup_pct ?? 0,
  };
}

async function requireUser() {
  const supabase = createTypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function requireAdmin(): Promise<
  | { supabase: ReturnType<typeof createTypedClient>; user: NonNullable<Awaited<ReturnType<ReturnType<typeof createTypedClient>["auth"]["getUser"]>>["data"]["user"]>; ok: true }
  | { ok: false; error: string }
> {
  const supabase = createTypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión no válida" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin") {
    return { ok: false, error: "Solo los administradores pueden modificar productos" };
  }
  return { supabase, user, ok: true };
}

export async function createProductAction(
  raw: unknown
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };
  const { supabase } = guard;

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Datos no válidos" };
  }

  const { data, error } = await supabase
    .from("products")
    .insert(toDbPayload(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Error desconocido" };
  }

  revalidatePath("/inventario");
  return { success: true, id: data.id };
}

export async function updateProductAction(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };
  const { supabase } = guard;

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Datos no válidos" };
  }

  const { error } = await supabase
    .from("products")
    .update(toDbPayload(parsed.data))
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/inventario");
  revalidatePath(`/inventario/${id}`);
  return { success: true, id };
}

export async function toggleProductActive(
  id: string,
  active: boolean
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };
  const { supabase } = guard;

  const { error } = await supabase
    .from("products")
    .update({ active })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/inventario");
  revalidatePath(`/inventario/${id}`);
  return { success: true, id };
}

export interface InventoryCountItem {
  productId: string;
  productName: string;
  productSku: string | null;
  expected: number;
  counted: number;
}

export async function applyInventoryCountAction(
  items: InventoryCountItem[],
  notes?: string | null
): Promise<ActionResult & { appliedCount?: number; countId?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  if (items.length === 0) return { success: true, appliedCount: 0 };

  // Normaliza y calcula la diferencia por producto (contado - esperado).
  const lines = items.map((i) => ({
    ...i,
    delta: Number(i.counted) - Number(i.expected),
  }));
  const changes = lines.filter((l) => l.delta !== 0);

  // 1) Aplicar los ajustes de stock (solo las líneas con diferencia).
  for (const item of changes) {
    const { error } = await supabase.rpc("record_stock_movement", {
      p_product_id: item.productId,
      p_movement_type: "ajuste",
      p_quantity: item.delta,
      p_reason: "Conteo de inventario",
      p_invoice_url: null,
    });
    if (error) return { success: false, error: error.message };
  }

  // 2) Registrar la sesión de conteo en el histórico (siempre, incluso sin
  //    diferencias) con fecha, usuario y el detalle por producto.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const countedByName =
    (profile as { full_name?: string | null; email?: string | null } | null)
      ?.full_name ||
    (profile as { email?: string | null } | null)?.email ||
    user.email ||
    null;

  const totalDelta = lines.reduce((s, l) => s + l.delta, 0);
  const unitsOver = lines.reduce((s, l) => s + (l.delta > 0 ? l.delta : 0), 0);
  const unitsShort = lines.reduce((s, l) => s + (l.delta < 0 ? -l.delta : 0), 0);

  const admin = createRawAdminClient();
  const { data: countRow, error: countErr } = await admin
    .from("inventory_counts")
    .insert({
      counted_by: user.id,
      counted_by_name: countedByName,
      lines_total: lines.length,
      diff_count: changes.length,
      total_delta: totalDelta,
      units_over: unitsOver,
      units_short: unitsShort,
      notes: notes?.trim() || null,
    })
    .select("id")
    .single();

  if (countErr || !countRow) {
    // Los ajustes ya se aplicaron; avisamos de que el histórico falló.
    return {
      success: false,
      error: `Ajustes aplicados, pero no se pudo guardar el histórico: ${countErr?.message ?? "error desconocido"}`,
    };
  }

  const { error: linesErr } = await admin.from("inventory_count_lines").insert(
    lines.map((l) => ({
      count_id: countRow.id,
      product_id: l.productId,
      product_name: l.productName,
      product_sku: l.productSku,
      expected: l.expected,
      counted: l.counted,
      delta: l.delta,
    }))
  );

  if (linesErr) {
    return {
      success: false,
      error: `Ajustes aplicados, pero el detalle del histórico falló: ${linesErr.message}`,
    };
  }

  revalidatePath("/inventario");
  revalidatePath("/inventario/conteo");
  revalidatePath("/inventario/conteo/historico");
  return { success: true, appliedCount: changes.length, countId: countRow.id };
}

export async function createPurchaseOrderAction(
  productId: string,
  raw: unknown,
  invoiceUrls?: string[]
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const parsed = purchaseOrderSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Datos no válidos" };
  }

  // Necesitamos weight_g antes de insertar para derivar cost_per_gram
  const { data: product } = await supabase
    .from("products")
    .select("weight_g")
    .eq("id", productId)
    .single();

  const weightG = Number((product as { weight_g?: number } | null)?.weight_g ?? 0);

  // Pedidos y lotes guardan el coste SIN IGIC: el IGIC de la compra se deduce
  // y no es coste. Si el importe introducido lo lleva, se descuenta aquí y se
  // deja constancia en las notas del pedido.
  const igicRate = parsed.data.cost_includes_igic ? parsed.data.igic_rate : 0;
  const netOf = (v: number) => (igicRate > 0 ? v / (1 + igicRate / 100) : v);
  const costPerUnit = Math.round(netOf(parsed.data.cost_per_unit) * 10000) / 10000;
  // cost_per_gram = coste/u ÷ gramos por unidad (para seguimiento de fluctuación de metal)
  const costPerGram = weightG > 0 ? costPerUnit / weightG : costPerUnit;
  const totalCost =
    parsed.data.total_cost != null
      ? Math.round(netOf(parsed.data.total_cost) * 100) / 100
      : Math.round(costPerUnit * parsed.data.quantity * 100) / 100;

  const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const igicNote = igicRate > 0
    ? `Coste registrado sin IGIC: se descontó el ${igicRate} % de ${eur(parsed.data.cost_per_unit)} €/u introducidos.`
    : null;
  const notes = [parsed.data.notes, igicNote].filter(Boolean).join(" · ") || null;

  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({
      product_id: productId,
      order_date: parsed.data.order_date,
      supplier_name: parsed.data.supplier_name,
      quantity: parsed.data.quantity,
      cost_per_gram: costPerGram,
      spot_price_per_g: parsed.data.spot_price_per_g,
      total_cost: totalCost,
      notes,
      created_by: user.id,
      invoice_url: invoiceUrls?.[0] ?? null,
      invoice_urls: invoiceUrls ?? [],
      received: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Error desconocido" };
  }

  // Crear el lote en el momento del pedido para permitir asignarlo a ventas
  // antes de que llegue la mercancía (stock en tránsito)
  await supabase.from("stock_lots").insert({
    product_id: productId,
    purchase_order_id: data.id,
    quantity_total: parsed.data.quantity,
    quantity_remaining: parsed.data.quantity,
    cost_per_gram: costPerGram,
    cost_per_unit: costPerUnit,
    order_date: parsed.data.order_date,
  });

  revalidatePath("/inventario");
  revalidatePath(`/inventario/${productId}`);
  return { success: true, id: data.id };
}

export async function markPurchaseOrderReceivedAction(
  orderId: string,
  productId: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };
  // Recibir lo pueden hacer admin y contabilidad (así lo ofrece la ficha), pero
  // la política de la base solo deja modificar pedidos al admin: el cambio de
  // estado va con el cliente de servicio tras comprobar el rol.
  const staff = await requireStaff();
  if (!staff) return { success: false, error: "No autorizado" };

  const { data: order } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order) return { success: false, error: "Pedido no encontrado" };
  if (order.received) return { success: false, error: "Este pedido ya fue marcado como recibido" };

  // Solo pasa de «en envío» a recibido si seguía sin recibir: dos clics
  // seguidos no pueden sumar el stock dos veces.
  const { data: updated, error: updErr } = await staff
    .from("purchase_orders")
    .update({ received: true, received_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("received", false)
    .select("id");

  if (updErr) return { success: false, error: updErr.message };
  if (!updated?.length) {
    return { success: false, error: "El pedido no se ha podido marcar como recibido (puede que ya lo estuviera)" };
  }

  const { data: product } = await supabase
    .from("products")
    .select("weight_g")
    .eq("id", productId)
    .single();

  const weightG = Number((product as { weight_g?: number } | null)?.weight_g ?? 0);
  const costPerGram = Number(order.cost_per_gram);
  const costPerUnit = weightG > 0 ? costPerGram * weightG : costPerGram;

  const reason = order.supplier_name
    ? `Reposición — ${order.supplier_name}`
    : "Reposición de stock";

  const { error: movErr } = await supabase.rpc("record_stock_movement", {
    p_product_id: productId,
    p_movement_type: "entrada",
    p_quantity: order.quantity,
    p_reason: reason,
    // Si el pedido ya tiene factura, el movimiento de entrada la enlaza
    p_invoice_url: order.invoice_urls?.[0] ?? order.invoice_url ?? null,
  });

  if (movErr) return { success: false, error: `Estado actualizado pero error en stock: ${movErr.message}` };

  // El lote se crea al registrar el pedido. Solo crearlo aquí si no existe
  // (backward compat con pedidos anteriores a esta migración)
  const { data: existingLot } = await supabase
    .from("stock_lots")
    .select("id")
    .eq("purchase_order_id", orderId)
    .maybeSingle();

  if (!existingLot) {
    await supabase.from("stock_lots").insert({
      product_id: productId,
      purchase_order_id: orderId,
      quantity_total: order.quantity,
      quantity_remaining: order.quantity,
      cost_per_gram: costPerGram,
      cost_per_unit: costPerUnit,
      order_date: order.order_date,
    });
  }

  revalidatePath("/inventario");
  revalidatePath(`/inventario/${productId}`);
  return { success: true, id: orderId };
}

/**
 * Solo personal del ERP (admin o contabilidad), igual que quien puede recibir
 * pedidos. Devuelve el cliente de servicio: las políticas de la base solo dejan
 * modificar pedidos al admin, y con la sesión de contabilidad el UPDATE no
 * fallaba, simplemente no cambiaba nada.
 */
async function requireStaff() {
  const supabase = createTypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  return role === "admin" || role === "contabilidad" ? createRawAdminClient() : null;
}

/** Solo se aceptan archivos subidos al bucket de facturas de compra. */
function isPurchaseInvoiceUrl(url: unknown): url is string {
  return typeof url === "string" && url.includes("/storage/v1/object/public/purchase-invoices/");
}

/**
 * Adjunta facturas a un pedido de reposición ya registrado. La factura no es
 * obligatoria al dar de alta la mercancía: se puede incorporar después, con el
 * pedido en envío o ya recibido.
 */
export async function attachPurchaseOrderInvoicesAction(
  orderId: string,
  productId: string,
  urls: string[]
): Promise<ActionResult> {
  const supabase = await requireStaff();
  if (!supabase) return { success: false, error: "No autorizado" };
  if (!Array.isArray(urls) || urls.length === 0 || !urls.every(isPurchaseInvoiceUrl)) {
    return { success: false, error: "Documentos no válidos" };
  }

  const { data: order, error: readErr } = await supabase
    .from("purchase_orders")
    .select("invoice_url, invoice_urls")
    .eq("id", orderId)
    .single();
  if (readErr || !order) return { success: false, error: "Pedido no encontrado" };

  const current = (order as { invoice_urls?: string[] | null; invoice_url?: string | null });
  // Los pedidos antiguos guardaban un único documento en invoice_url
  const existing = current.invoice_urls?.length
    ? current.invoice_urls
    : current.invoice_url ? [current.invoice_url] : [];
  const merged = [...existing, ...urls.filter((u) => !existing.includes(u))];

  const { data: saved, error } = await supabase
    .from("purchase_orders")
    .update({ invoice_urls: merged, invoice_url: merged[0] ?? null })
    .eq("id", orderId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!saved?.length) return { success: false, error: "No se ha podido guardar el documento" };

  revalidatePath(`/inventario/${productId}`);
  return { success: true, id: orderId };
}

/**
 * Quita un documento adjuntado por error. Solo desvincula: el archivo se queda
 * en el almacenamiento, por si hiciera falta recuperarlo.
 */
export async function detachPurchaseOrderInvoiceAction(
  orderId: string,
  productId: string,
  url: string
): Promise<ActionResult> {
  const supabase = await requireStaff();
  if (!supabase) return { success: false, error: "No autorizado" };

  const { data: order, error: readErr } = await supabase
    .from("purchase_orders")
    .select("invoice_url, invoice_urls")
    .eq("id", orderId)
    .single();
  if (readErr || !order) return { success: false, error: "Pedido no encontrado" };

  const current = (order as { invoice_urls?: string[] | null; invoice_url?: string | null });
  const existing = current.invoice_urls?.length
    ? current.invoice_urls
    : current.invoice_url ? [current.invoice_url] : [];
  const remaining = existing.filter((u) => u !== url);

  const { data: saved, error } = await supabase
    .from("purchase_orders")
    .update({ invoice_urls: remaining, invoice_url: remaining[0] ?? null })
    .eq("id", orderId)
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!saved?.length) return { success: false, error: "No se ha podido quitar el documento" };

  revalidatePath(`/inventario/${productId}`);
  return { success: true, id: orderId };
}

export async function recordStockMovementAction(
  productId: string,
  raw: unknown,
  invoiceUrl?: string | null
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const parsed = stockMovementSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Datos no válidos" };
  }

  const { error } = await supabase.rpc("record_stock_movement", {
    p_product_id: productId,
    p_movement_type: parsed.data.movement_type,
    p_quantity: parsed.data.quantity,
    p_reason: parsed.data.reason,
    p_invoice_url: invoiceUrl ?? null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/inventario");
  revalidatePath(`/inventario/${productId}`);
  return { success: true, id: productId };
}

export async function adjustLotQuantityAction(
  lotId: string,
  newQuantity: number,
  productId: string
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  if (newQuantity < 0 || !Number.isInteger(newQuantity)) {
    return { success: false, error: "La cantidad debe ser un entero ≥ 0" };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { error } = await admin
    .from("stock_lots")
    .update({ quantity_remaining: newQuantity })
    .eq("id", lotId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/inventario");
  revalidatePath(`/inventario/${productId}`);
  return { success: true };
}
