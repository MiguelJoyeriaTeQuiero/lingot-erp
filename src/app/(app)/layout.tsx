import { redirect } from "next/navigation";
import { createTypedClient } from "@/lib/supabase/typed";
import { Sidebar } from "@/components/layout/sidebar";

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
        <Sidebar
          email={profile?.email ?? user.email ?? ""}
          fullName={profile?.full_name ?? null}
          role={(profile?.role as "admin" | "contabilidad") ?? "contabilidad"}
        />
        <main className="ml-[260px] flex-1">
          <div className="mx-auto max-w-7xl px-10 py-12">{children}</div>
        </main>
      </div>
    </div>
  );
}
