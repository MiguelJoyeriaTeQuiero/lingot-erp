"use server";

import { revalidatePath } from "next/cache";
import { createTypedClient } from "@/lib/supabase/typed";
import { createRawAdminClient } from "@/lib/supabase/admin";

type ActionResult = { success: boolean; error?: string };

async function requireAdmin() {
  const supabase = createTypedClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión no válida" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if ((profile as { role?: string } | null)?.role !== "admin") {
    return { ok: false as const, error: "Solo administradores" };
  }
  return { ok: true as const };
}

export async function createCatalogUserAction(data: {
  full_name: string;
  email: string;
  password: string;
  is_wholesale: boolean;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  const admin = createRawAdminClient();
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name },
  });

  if (authError || !authUser.user) {
    return { success: false, error: authError?.message ?? "Error al crear usuario" };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: data.full_name,
      role: "customer",
      is_wholesale: data.is_wholesale,
    })
    .eq("id", authUser.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { success: false, error: profileError.message };
  }

  revalidatePath("/accesos");
  return { success: true };
}

export async function updateCatalogUserAction(
  userId: string,
  data: { full_name: string; email: string; is_wholesale: boolean; password?: string }
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  const admin = createRawAdminClient();

  const authUpdate: { email?: string; email_confirm?: boolean; password?: string } = {};
  if (data.email && data.email.trim()) {
    authUpdate.email = data.email.trim();
    authUpdate.email_confirm = true;
  }
  if (data.password && data.password.length >= 6) {
    authUpdate.password = data.password;
  }

  if (Object.keys(authUpdate).length > 0) {
    const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdate);
    if (authError) return { success: false, error: authError.message };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: data.full_name,
      email: data.email.trim(),
      is_wholesale: data.is_wholesale,
    })
    .eq("id", userId);

  if (profileError) return { success: false, error: profileError.message };

  revalidatePath("/accesos");
  return { success: true };
}

export async function deleteCatalogUserAction(userId: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  const admin = createRawAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/accesos");
  return { success: true };
}
