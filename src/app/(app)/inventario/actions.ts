"use server";

import { revalidatePath } from "next/cache";
import { createTypedClient } from "@/lib/supabase/typed";
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

export async function applyInventoryCountAction(
  items: { productId: string; delta: number }[]
): Promise<ActionResult & { appliedCount?: number }> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const changes = items.filter((i) => i.delta !== 0);
  if (changes.length === 0) return { success: true, appliedCount: 0 };

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

  revalidatePath("/inventario");
  revalidatePath("/inventario/conteo");
  return { success: true, appliedCount: changes.length };
}

export async function createPurchaseOrderAction(
  productId: string,
  raw: unknown,
  invoiceUrl?: string | null
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
  const costPerUnit = parsed.data.cost_per_unit;
  // cost_per_gram = coste/u ÷ gramos por unidad (para seguimiento de fluctuación de metal)
  const costPerGram = weightG > 0 ? costPerUnit / weightG : costPerUnit;
  const totalCost =
    parsed.data.total_cost ??
    Math.round(costPerUnit * parsed.data.quantity * 100) / 100;

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
      notes: parsed.data.notes,
      created_by: user.id,
      invoice_url: invoiceUrl ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Error desconocido" };
  }

  const reason = parsed.data.supplier_name
    ? `Reposición — ${parsed.data.supplier_name}`
    : "Reposición de stock";

  const { error: movError } = await supabase.rpc("record_stock_movement", {
    p_product_id: productId,
    p_movement_type: "entrada",
    p_quantity: parsed.data.quantity,
    p_reason: reason,
    p_invoice_url: null,
  });

  if (movError) {
    return { success: false, error: `Pedido guardado pero error en stock: ${movError.message}` };
  }

  // Crear lote con el coste por unidad exacto introducido por el usuario
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
