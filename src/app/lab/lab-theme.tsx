"use client";

import { useEffect, useState } from "react";
import { THEME_KEY, type LabTheme } from "./lab-theme-boot";
import { useLabLang } from "./lab-lang";

/* ═══════════════════════════════════════════════════════════════════════════
   Conmutador de tema: Au (bóveda) / Ag (galería a plena luz).

   Los símbolos del metal en vez de un sol y una luna: el tema no es «claro u
   oscuro», es qué metal conduce la página. Y son los dos que vendéis.

   El atributo vive en el contenedor .lab-scope. El fondo del documento lo sigue
   con html:has(...), así que el rebote del scroll también cambia de color sin
   que el tema se escape de /lab. Lo escribe antes del primer pintado el script
   de lab-theme-boot; esto solo lo conmuta después.
   ═══════════════════════════════════════════════════════════════════════════ */

export type { LabTheme };

const root = () => document.querySelector<HTMLElement>(".lab-scope");

/** El tema vive en un atributo del DOM: lo observamos en vez de duplicarlo en
 *  un contexto de React, así el conmutador sigue siendo la única fuente. */
export function useLabTheme(): LabTheme {
  const [theme, setTheme] = useState<LabTheme>("oro");

  useEffect(() => {
    const read = () => {
      const v = root()?.getAttribute("data-lab-theme");
      setTheme(v === "plata" ? "plata" : "oro");
    };
    read();
    const el = root();
    if (!el) return;
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["data-lab-theme"] });
    return () => mo.disconnect();
  }, []);

  return theme;
}

export function LabThemeToggle() {
  const theme = useLabTheme();
  const { t } = useLabLang();

  const apply = (next: LabTheme) => {
    root()?.setAttribute("data-lab-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* navegación privada */ }
  };

  return (
    <button
      type="button"
      className="lab-theme"
      onClick={() => apply(theme === "oro" ? "plata" : "oro")}
      aria-label={t(theme === "oro" ? "theme.toSilver" : "theme.toGold")}
      title={t(theme === "oro" ? "theme.toSilver" : "theme.toGold")}
    >
      <span className="lab-theme-pill" aria-hidden />
      <span className="lab-theme-side" data-on={theme === "oro" ? "true" : "false"} aria-hidden>Au</span>
      <span className="lab-theme-side" data-on={theme === "plata" ? "true" : "false"} aria-hidden>Ag</span>
    </button>
  );
}
