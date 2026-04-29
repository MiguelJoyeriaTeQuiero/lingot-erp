"use server";

import { revalidatePath } from "next/cache";
import { createTypedClient } from "@/lib/supabase/typed";
import { clientSchema, type ClientInput } from "@/lib/validations/client";

type ActionResult = { success: boolean; error?: string; id?: string };

function toDbPayload(input: ClientInput) {
  return {
    type: input.type,
    name: input.name,
    tax_id: input.tax_id,
    contact_name:
      input.type === "empresa" ? input.contact_name : input.contact_name ?? null,
    email: input.email,
    phone: input.phone,
    address: input.address,
    city: input.city,
    postal_code: input.postal_code,
    price_tier: input.price_tier,
    notes: input.notes,
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

export async function createClientAction(
  raw: unknown
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Datos no válidos" };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert(toDbPayload(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Error desconocido" };
  }

  revalidatePath("/clientes");
  return { success: true, id: data.id };
}

export async function updateClientAction(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Datos no válidos" };
  }

  const { error } = await supabase
    .from("clients")
    .update(toDbPayload(parsed.data))
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { success: true, id };
}

export async function toggleClientActive(
  id: string,
  active: boolean
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const { error } = await supabase
    .from("clients")
    .update({ active })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { success: true, id };
}
