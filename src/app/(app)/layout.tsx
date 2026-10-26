import { redirect } from "next/navigation";
import { createTypedClient } from "@/lib/supabase/typed";
import { createRawAdminClient } from "@/lib/supabase/admin";
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

  // Punto de partida de los avisos de reservas: cuántas hay por gestionar y la
  // última que existe, para no avisar al entrar de las que ya estaban.
  const admin = createRawAdminClient();
  const [pendingRes, latestRes] = await Promise.all([
    admin
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendiente"),
    admin
      .from("reservations")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  const reservations = {
    pending: pendingRes.count ?? 0,
    since: (latestRes.data?.[0] as { created_at?: string } | undefined)?.created_at ?? new Date().toISOString(),
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      {/* Ambient gradient orbs */}
      <div className="ambient-canvas" aria-hidden />
      {/* Film grain */}
      <div className="grain-overlay" aria-hidden />

      <div className="relative z-10 flex min-h-screen">
        <AppShell
          email={profile?.email ?? user.email ?? ""}
          fullName={profile?.full_name ?? null}
          role={(profile?.role as "admin" | "contabilidad") ?? "contabilidad"}
          reservations={reservations}
        >
          {children}
        </AppShell>
      </div>
    </div>
  );
}
