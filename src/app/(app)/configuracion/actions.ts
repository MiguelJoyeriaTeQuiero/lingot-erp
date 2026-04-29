"use server";

import { revalidatePath } from "next/cache";
import { createTypedClient } from "@/lib/supabase/typed";
import { companySettingsSchema } from "@/lib/validations/company";
import type { CompanySettingsRow } from "@/lib/supabase/typed";

type ActionResult = { success: boolean; error?: string };

async function requireUser() {
  const supabase = createTypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function updateCompanySettingsAction(
  raw: unknown
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const parsed = companySettingsSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Datos no válidos" };
  }

  const payload = parsed.data as Partial<CompanySettingsRow>;

  const { error } = await supabase
    .from("company_settings")
    .update(payload)
    .eq("id", 1);

  if (error) return { success: false, error: error.message };

  revalidatePath("/configuracion");
  revalidatePath("/dashboard");
  return { success: true };
}
