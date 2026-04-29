"use server";

import { revalidatePath } from "next/cache";
import { createTypedClient } from "@/lib/supabase/typed";
import {
  productSchema,
  stockMovementSchema,
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

export async function createProductAction(
  raw: unknown
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

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
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

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
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

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
