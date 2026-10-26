import { redirect } from "next/navigation";
import { createTypedClient } from "@/lib/supabase/typed";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createTypedClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  const erpRoles = ["admin", "contabilidad"];
  if (!erpRoles.includes((profile as { role?: string } | null)?.role ?? "")) {
    redirect("/");
  }

  return (
    // overflow-clip y no overflow-hidden: recorta igual, pero no crea un
    // contenedor de scroll, así que los elementos `sticky` (la barra del
    // conteo de inventario) se pueden quedar fijos al bajar por la página.
    <div className="relative min-h-screen overflow-clip bg-ink">
      {/* Ambient gradient orbs */}
      <div className="ambient-canvas" aria-hidden />
      {/* Film grain */}
      <div className="grain-overlay" aria-hidden />

      <div className="relative z-10 flex min-h-screen">
        <AppShell
          email={profile?.email ?? user.email ?? ""}
          fullName={profile?.full_name ?? null}
          role={(profile?.role as "admin" | "contabilidad") ?? "contabilidad"}
        >
          {children}
        </AppShell>
      </div>
    </div>
  );
}
