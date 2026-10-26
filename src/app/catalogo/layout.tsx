import type { ReactNode } from "react";
import { Suspense } from "react";
import localFont from "next/font/local";
import { createTypedClient } from "@/lib/supabase/typed";
import { CatalogNav } from "./catalog-nav";
import { CatalogReveal } from "./catalog-reveal";

// ── Open Sauce Sans — la tipografía oficial de la marca Lingot ────────────────
// Superfamilia única: el drama tipográfico nace de la escala y el peso, no de
// una serif ornamentada (fiel al manual: "minimalismo y reducción como estrategia").
const openSauce = localFont({
  src: [
    { path: "../../../public/fonts/open-sauce-sans-300.woff2", weight: "300", style: "normal" },
    { path: "../../../public/fonts/open-sauce-sans-400.otf",   weight: "400", style: "normal" },
    { path: "../../../public/fonts/open-sauce-sans-500.woff2", weight: "500", style: "normal" },
    { path: "../../../public/fonts/open-sauce-sans-600.woff2", weight: "600", style: "normal" },
    { path: "../../../public/fonts/open-sauce-sans-700.woff2", weight: "700", style: "normal" },
    { path: "../../../public/fonts/open-sauce-sans-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-catalog",
  display:  "swap",
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
});

export default async function CatalogoLayout({ children }: { children: ReactNode }) {
  // Identidad para la barra de navegación (botón de acceso / cuenta).
  // Se envuelve en try/catch para que una sesión caducada (refresh token
  // inválido) no rompa el layout: simplemente se muestra "Acceso profesional".
  let isLoggedIn = false;
  let isWholesale = false;
  let userName = "";
  try {
    const supabase = createTypedClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      isLoggedIn = true;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_wholesale, full_name")
        .eq("id", user.id)
        .single();
      isWholesale = (profile as { is_wholesale?: boolean } | null)?.is_wholesale ?? false;
      if (profile?.role === "admin" || profile?.role === "contabilidad") isWholesale = true;
      userName = (profile as { full_name?: string } | null)?.full_name
        ?? (user as unknown as { user_metadata?: { full_name?: string } }).user_metadata?.full_name
        ?? user.email?.split("@")[0]
        ?? "";
    }
  } catch {
    /* sesión inválida — nav sin usuario */
  }

  return (
    <div className={`${openSauce.variable} lg-scope`} style={{ isolation: "isolate" }}>
      <CatalogNav isLoggedIn={isLoggedIn} isWholesale={isWholesale} userName={userName} />
      {/* CatalogReveal uses useSearchParams() — must be inside Suspense */}
      <Suspense fallback={null}>
        <CatalogReveal />
      </Suspense>
      {children}
    </div>
  );
}
