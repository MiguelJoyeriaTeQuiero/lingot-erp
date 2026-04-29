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
        >
          {children}
        </AppShell>
      </div>
    </div>
  );
}
