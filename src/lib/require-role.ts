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

/**
 * Para acciones de servidor: no redirige. Devuelve el rol si quien llama es
 * personal del ERP y null en cualquier otro caso (sin sesión o cliente del
 * catálogo). Las acciones se pueden invocar desde fuera de la interfaz, así
 * que cada una tiene que comprobarlo por su cuenta.
 */
export async function getStaffRole(): Promise<"admin" | "contabilidad" | null> {
  const supabase = createTypedClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile as { role?: string } | null)?.role;
  return role === "admin" || role === "contabilidad" ? role : null;
}
