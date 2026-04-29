import { redirect } from "next/navigation";
import { createTypedClient } from "@/lib/supabase/typed";

/**
 * Verifica que el usuario autenticado tenga uno de los roles requeridos.
 * Si no, redirige a /documentos (página de inicio para contabilidad).
 */
export async function requireRole(allowed: ("admin" | "contabilidad")[]) {
  const supabase = createTypedClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  const role = (profile as { role?: string } | null)?.role ?? "contabilidad";

  if (!allowed.includes(role as "admin" | "contabilidad")) {
    redirect("/documentos");
  }

  return { user, profile, role: role as "admin" | "contabilidad" };
}
