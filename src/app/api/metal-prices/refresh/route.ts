import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createTypedClient } from "@/lib/supabase/typed";
import { refreshAllSpots } from "@/lib/metal-prices";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Refresco manual de cotizaciones desde la UI.
 * Sólo accesible para usuarios autenticados con rol `admin`.
 */
export async function POST() {
  const supabase = createTypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Sólo admin" }, { status: 403 });
  }

  const results = await refreshAllSpots();
  const ok = results.every((r) => r.status === "ok");

  revalidatePath("/configuracion");
  revalidatePath("/dashboard");

  return NextResponse.json(
    {
      success: ok,
      refreshed_at: new Date().toISOString(),
      results,
    },
    { status: ok ? 200 : 207 }
  );
}
