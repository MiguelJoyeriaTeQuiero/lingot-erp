"use client";

import { useCallback, useEffect, useState } from "react";
import { LANGS, LANG_KEY, LOCALES, translate, type LabLang } from "./lab-i18n";

/* ═══════════════════════════════════════════════════════════════════════════
   Idioma: español, inglés y alemán.

   Mismo mecanismo que el tema — un atributo en .lab-scope, escrito antes del
   primer pintado por el script de lab-i18n y observado desde aquí. Ni contexto
   de React ni proveedor: el DOM es la única fuente y el conmutador el único
   que escribe.

   Las fechas y los importes también cambian de locale: un cliente alemán
   esperando «1.234,56 €» y viendo «1,234.56 €» nota que la traducción es
   superficial.
   ═══════════════════════════════════════════════════════════════════════════ */

const root = () => document.querySelector<HTMLElement>(".lab-scope");

export function useLabLang() {
  const [lang, setLang] = useState<LabLang>("es");

  useEffect(() => {
    const read = () => {
      const v = root()?.getAttribute("data-lab-lang");
      setLang(v === "en" || v === "de" ? v : "es");
    };
    read();
    const el = root();
    if (!el) return;
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["data-lab-lang"] });
    return () => mo.disconnect();
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  );

  const locale = LOCALES[lang];

  /** Importe en euros con la puntuación del idioma activo. */
  const money = useCallback(
    (n: number) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n),
    [locale]
  );

  // Siempre en hora de Canarias, la del negocio. Con la del navegador, el
  // servidor (UTC) escribe «10 de mayo» y quien navega desde América lee «9»:
  // React ve un texto distinto al del HTML, tira la página y la repinta entera
  // (error #425). Le pasaba a Googlebot, que renderiza en hora de California.
  const date = useCallback(
    (iso: string, opts: Intl.DateTimeFormatOptions) =>
      new Date(iso).toLocaleDateString(locale, { timeZone: "Atlantic/Canary", ...opts }),
    [locale]
  );

  return { lang, t, locale, money, date };
}

export function LabLangToggle() {
  const { lang, t } = useLabLang();

  const apply = (next: LabLang) => {
    root()?.setAttribute("data-lab-lang", next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* navegación privada */ }
  };

  return (
    <div className="lab-lang" role="group" aria-label={t("lang.aria")}>
      {LANGS.map((l) => (
        <button
          key={l.v}
          type="button"
          className="lab-lang-btn"
          data-on={l.v === lang ? "true" : "false"}
          aria-label={l.nombre}
          aria-pressed={l.v === lang}
          onClick={() => apply(l.v)}
        >
          {l.t}
        </button>
      ))}
    </div>
  );
}
