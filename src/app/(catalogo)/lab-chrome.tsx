"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LabLangToggle, useLabLang } from "./lab-lang";
import { LabThemeToggle } from "./lab-theme";
import { LAB_PATHS, LEGAL_LINKS } from "./lab-paths";

/* ═══════════════════════════════════════════════════════════════════════════
   Navegación y pie de las páginas interiores (Nosotros, blog).

   La portada tiene su propia nav, que desplaza entre capítulos de la misma
   página. Aquí los enlaces llevan a otras páginas y el acceso es la página de
   cuenta, no la pantalla superpuesta.
   ═══════════════════════════════════════════════════════════════════════════ */

type Section = "about" | "blog";

/**
 * Rótulo del botón de acceso. En móvil no caben marca, idioma, tema y un botón
 * de 180 px: por debajo de 560 px queda solo el icono (el CSS decide) y el
 * nombre accesible lo pone quien lo usa con aria-label.
 */
export function NavAccessLabel({ label }: { label: string }) {
  return (
    <>
      <span className="lab-cta-text">{label}</span>
      <span className="lab-cta-icon" aria-hidden>
        <svg viewBox="0 0 16 16" width="14" height="14">
          <circle cx="8" cy="5.4" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2.8 14c.6-2.8 2.7-4.4 5.2-4.4s4.6 1.6 5.2 4.4" fill="none"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </span>
    </>
  );
}

export function LabSubNav({ current }: { current?: Section }) {
  const { t } = useLabLang();
  // Solo decide el rótulo del botón: la cookie de sesión basta, sin ir al servidor
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    createClient().auth.getSession()
      .then(({ data }) => setSignedIn(!!data.session))
      .catch(() => {});
  }, []);

  const here = (s: Section) => (current === s ? "page" : undefined);

  return (
    <nav className="lab-nav lab-nav--sub" data-solid="false" data-hidden="false" data-top="false">
      <Link href={LAB_PATHS.home} className="lab-nav-mark">Lingot</Link>
      <div className="lab-nav-links">
        <Link href={LAB_PATHS.collection} className="lab-nav-link lab-nav-section">{t("nav.collection")}</Link>
        <Link href={LAB_PATHS.about} className="lab-nav-link lab-nav-section" aria-current={here("about")}>{t("nav.about")}</Link>
        <Link href={LAB_PATHS.blog} className="lab-nav-link lab-nav-section" aria-current={here("blog")}>{t("nav.blog")}</Link>
        <LabLangToggle />
        <LabThemeToggle />
        <Link href={LAB_PATHS.account} className="lab-cta" aria-label={t(signedIn ? "ac.account" : "nav.access")}>
          <NavAccessLabel label={t(signedIn ? "ac.account" : "nav.access")} />
        </Link>
      </div>
    </nav>
  );
}

export function LabFoot({ brandName = "Lingot" }: { brandName?: string }) {
  const { t } = useLabLang();
  return (
    <footer className="lab-foot">
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
        <Link href={LAB_PATHS.home} className="lab-nav-mark">{brandName}</Link>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: "clamp(18px, 3vw, 36px)" }}>
          <Link href={LAB_PATHS.collection} className="lab-foot-link">{t("ft.catalog")}</Link>
          <Link href={LAB_PATHS.about} className="lab-foot-link">{t("ft.about")}</Link>
          <Link href={LAB_PATHS.blog} className="lab-foot-link">{t("ft.blog")}</Link>
          <Link href={LAB_PATHS.account} className="lab-foot-link">{t("ft.account")}</Link>
        </nav>
        <span className="lab-label" style={{ color: "var(--lab-ink-4)", letterSpacing: "0.34em" }}>
          Te Quiero Group · {new Date().getFullYear()}
        </span>
      </div>
      {/* Accesible desde cualquier página, como pide el art. 10 LSSI */}
      <nav className="lab-foot-legal" aria-label={t("lg.eyebrow")}>
        {LEGAL_LINKS.map((l) => (
          <Link key={l.doc} href={l.href} className="lab-foot-legal-link">{t(l.key)}</Link>
        ))}
      </nav>
    </footer>
  );
}
