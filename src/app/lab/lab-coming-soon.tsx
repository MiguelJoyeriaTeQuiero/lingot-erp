"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useLabTheme } from "./lab-theme";
import { useLabLang } from "./lab-lang";

const LabHeroScene = dynamic(() => import("./lab-hero-scene").then((m) => m.LabHeroScene), {
  ssr: false,
});

/* ═══════════════════════════════════════════════════════════════════════════
   «Próximamente»: lo que ve el público mientras el catálogo está desactivado
   en Configuración (company_settings.catalog_enabled). Solo el hero, sin
   colección ni precios. El administrador sigue viendo el catálogo completo.
   ═══════════════════════════════════════════════════════════════════════════ */

export function LabComingSoon({ brandName }: { brandName: string }) {
  const theme = useLabTheme();
  const { t } = useLabLang();

  // Aquí no hay motor de movimiento que dé la salida: el hero arranca solo
  useEffect(() => {
    document.documentElement.setAttribute("data-lab-ready", "true");
  }, []);

  return (
    <header className="lab-hero">
      <LabHeroScene key={theme} theme={theme} />
      <div className="lab-hero-halo" aria-hidden />
      <div className="lab-hero-veil" aria-hidden />

      <div className="lab-hero-body">
        <span
          className="lab-label"
          style={{ color: "var(--lab-metal)", marginBottom: "clamp(18px, 2.6vw, 32px)", animation: "lab-down 1.1s var(--e-expo) 50ms both" }}
        >
          {t("soon.label")}
        </span>

        <h1 className="lab-hero-word" aria-label={brandName}>
          <span aria-hidden style={{ display: "block", overflow: "hidden", paddingBottom: "0.34em", marginBottom: "-0.06em" }}>
            {brandName.split("").map((ch, i) => (
              <span key={`c${i}`} style={{ animation: `lab-rise 1.35s var(--e-expo) ${130 + i * 70}ms both` }}>
                {ch === " " ? " " : ch}
              </span>
            ))}
          </span>
        </h1>

        <div
          className="lab-hero-rule"
          style={{ margin: "clamp(14px, 2vw, 30px) 0 clamp(22px, 3.2vw, 40px)", animation: "lab-fade 1.2s var(--e-expo) 850ms both" }}
        >
          <i /><span style={{ fontSize: 8, color: "var(--lab-metal)" }}>✦</span><i />
        </div>

        <p className="lab-label" style={{ color: "var(--lab-ink-3)", animation: "lab-up 1.2s var(--e-expo) 710ms both" }}>
          {t("hero.eyebrow")}
        </p>
      </div>
    </header>
  );
}
