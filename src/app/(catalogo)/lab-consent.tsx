"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useLabLang } from "./lab-lang";
import { LAB_PATHS } from "./lab-paths";
import {
  CONSENT_EVENT, CONSENT_OPEN_EVENT, openConsentSettings, readConsent, writeConsent,
  type Consent, type ConsentCategory,
} from "./lab-consent-store";

/* ═══════════════════════════════════════════════════════════════════════════
   Aviso de cookies.

   Lo que pide la Guía de cookies de la AEPD, y por eso está así:
   · rechazar cuesta lo mismo que aceptar: mismo botón, mismo nivel;
   · nada viene marcado y nada opcional se carga antes de elegir;
   · no bloquea la página (sin muro de cookies): se puede navegar sin decidir;
   · se vuelve a abrir en cualquier momento desde «Configurar cookies».

   La elección y sus reglas viven en lab-consent-store.ts.
   ═══════════════════════════════════════════════════════════════════════════ */

type Choice = Pick<Consent, ConsentCategory>;

const NONE: Choice = { analytics: false, marketing: false };
const ALL:  Choice = { analytics: true,  marketing: true  };
const CATEGORIES: ConsentCategory[] = ["analytics", "marketing"];

/** Si nadie lo abre, el aviso sale igual pasado este tiempo (cortina atascada). */
const CURTAIN_FALLBACK_MS = 6000;

/** La elección vigente; null mientras no hay ninguna. */
export function useConsent() {
  const [consent, setConsent] = useState<Consent | null>(null);
  useEffect(() => {
    setConsent(readConsent());
    const on = (e: Event) => setConsent((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, on);
    return () => window.removeEventListener(CONSENT_EVENT, on);
  }, []);
  return consent;
}

/** Monta lo que lleva dentro (el script de Analytics, un píxel…) solo con permiso. */
export function ConsentGate({ category, children }: { category: ConsentCategory; children: ReactNode }) {
  const consent = useConsent();
  return consent?.[category] ? <>{children}</> : null;
}

/** «Configurar cookies»: el pie y la política de cookies lo usan para reabrir el panel. */
export function ConsentSettingsButton({ className }: { className?: string }) {
  const { t } = useLabLang();
  return (
    <button type="button" className={className} onClick={openConsentSettings}>
      {t("ck.manage")}
    </button>
  );
}

export function LabConsent() {
  const { t } = useLabLang();
  const [view, setView] = useState<"banner" | "settings" | null>(null);
  const [choice, setChoice] = useState<Choice>(NONE);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const saved = readConsent();
    if (saved) setChoice({ analytics: saved.analytics, marketing: saved.marketing });

    // En la portada manda la cortina de entrada: el aviso sale cuando se levanta
    let mo: MutationObserver | null = null;
    let fallback = 0;
    if (!saved) {
      const curtain = document.querySelector<HTMLElement>(".lab-curtain");
      if (curtain && curtain.dataset["done"] !== "true") {
        const show = () => { mo?.disconnect(); clearTimeout(fallback); setView((v) => v ?? "banner"); };
        mo = new MutationObserver(() => { if (curtain.dataset["done"] === "true") show(); });
        mo.observe(curtain, { attributes: true, attributeFilter: ["data-done"] });
        fallback = window.setTimeout(show, CURTAIN_FALLBACK_MS);
      } else {
        setView("banner");
      }
    }

    const onOpen = () => {
      const current = readConsent();
      setChoice(current ? { analytics: current.analytics, marketing: current.marketing } : NONE);
      setView("settings");
    };
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen);
    return () => {
      mo?.disconnect();
      clearTimeout(fallback);
      window.removeEventListener(CONSENT_OPEN_EVENT, onOpen);
    };
  }, []);

  // Al abrir la configuración el foco va al panel, para quien navega con teclado
  useEffect(() => {
    if (view === "settings") ref.current?.focus();
  }, [view]);

  const save = (next: Choice) => {
    const prev = readConsent();
    writeConsent(next);
    setChoice(next);
    setView(null);
    // Retirar un permiso no detiene los scripts que ya corren en la página: recargar sí
    if (prev && CATEGORIES.some((c) => prev[c] && !next[c])) location.reload();
  };

  if (!view) return null;

  return (
    <section
      ref={ref}
      className="lab-consent"
      data-view={view}
      role="dialog"
      aria-modal="false"
      aria-labelledby="lab-consent-title"
      aria-describedby="lab-consent-text"
      tabIndex={-1}
      data-lab-native
    >
      <div className="lab-consent-head">
        <h2 id="lab-consent-title" className="lab-label">{t("ck.title")}</h2>
        {view === "settings" && (
          <button
            type="button"
            className="lab-consent-x"
            aria-label={t("ck.close")}
            // Sin elección guardada, cerrar la configuración es volver al aviso
            onClick={() => setView(readConsent() ? null : "banner")}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
              <path d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <p id="lab-consent-text" className="lab-consent-text">
        {t("ck.text")} <Link href={LAB_PATHS.cookies}>{t("ck.policy")}</Link>
      </p>

      {view === "settings" && (
        <ul className="lab-consent-cats">
          <li className="lab-consent-cat">
            <div>
              <span className="lab-consent-cat-name">{t("ck.necessary")}</span>
              <p>{t("ck.necessaryBody")}</p>
            </div>
            <span className="lab-consent-always">{t("ck.always")}</span>
          </li>
          {CATEGORIES.map((cat) => (
            <li key={cat} className="lab-consent-cat">
              <div>
                <label htmlFor={`lab-ck-${cat}`} className="lab-consent-cat-name">{t(`ck.${cat}`)}</label>
                <p id={`lab-ck-${cat}-d`}>{t(`ck.${cat}Body`)}</p>
              </div>
              <input
                id={`lab-ck-${cat}`}
                type="checkbox"
                role="switch"
                className="lab-switch"
                aria-describedby={`lab-ck-${cat}-d`}
                checked={choice[cat]}
                onChange={(e) => setChoice((c) => ({ ...c, [cat]: e.target.checked }))}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="lab-consent-actions">
        <button type="button" className="lab-consent-btn" onClick={() => save(NONE)}>{t("ck.reject")}</button>
        <button type="button" className="lab-consent-btn" onClick={() => save(ALL)}>{t("ck.accept")}</button>
        {view === "banner" ? (
          <button type="button" className="lab-consent-more" onClick={() => setView("settings")}>
            {t("ck.settings")}
          </button>
        ) : (
          <button type="button" className="lab-consent-btn lab-consent-btn--wide" onClick={() => save(choice)}>
            {t("ck.save")}
          </button>
        )}
      </div>
    </section>
  );
}
