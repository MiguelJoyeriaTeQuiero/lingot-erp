"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useLabLang } from "./lab-lang";
import { LabMotion } from "./lab-motion";
import { LabFoot, LabSubNav } from "./lab-chrome";
import { Eyebrow, Rise } from "./lab-parts";
import { LEGAL_LINKS, type LegalDoc } from "./lab-paths";
import { LEGAL_UPDATED, TITULAR } from "./lab-legal-data";

/* ═══════════════════════════════════════════════════════════════════════════
   Textos legales: aviso legal, privacidad, cookies y condiciones.

   Como el blog, la interfaz va en los tres idiomas y el texto en español, que
   es la versión que vincula; fuera del español se avisa. El contenido lo
   escribe cada página (de servidor) y llega aquí ya montado, por secciones:
   esta capa solo pone la cabecera, el índice que sigue la lectura y el pie.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LegalSection {
  id:    string;
  title: string;
  body:  ReactNode;
}

/** Lo que tapa la barra al saltar a una sección. */
const JUMP_OFFSET = 96;

export function LabLegalPage({
  doc, title, lead, sections,
}: {
  doc:      LegalDoc;
  title:    string;
  lead:     string;
  sections: LegalSection[];
}) {
  const { lang, t, date } = useLabLang();
  const [here, setHere] = useState(sections[0]?.id);
  const ids = sections.map((s) => s.id).join(",");

  // El índice marca la última sección cuyo título ya pasó el primer tercio
  useEffect(() => {
    const els = ids.split(",").map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const onScroll = () => {
      const line = window.innerHeight * 0.33;
      let current = els[0]?.id;
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id;
      setHere(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ids]);

  // El motor de movimiento lleva el desplazamiento: un salto nativo lo cortaría en seco
  const jump = (e: React.MouseEvent, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const top = window.scrollY + el.getBoundingClientRect().top - JUMP_OFFSET;
    window.dispatchEvent(new CustomEvent("lab:scrollto", { detail: { top } }));
    history.replaceState(null, "", `#${id}`);
  };

  const n = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <>
      <LabMotion curtain={false} />
      <div className="lab-atmos" aria-hidden>
        <i className="lab-atmos-frio" />
        <i className="lab-atmos-hondo" />
        <i className="lab-atmos-oro" />
      </div>
      <LabSubNav />

      <header className="lab-page-head lab-legal-head" data-lab-track>
        <div className="lab-page-head-inner" data-lab-in>
          <Eyebrow>{t("lg.eyebrow")}</Eyebrow>
          <h1 className="lab-page-title lab-legal-title" lang="es">
            <Rise>{title}</Rise>
          </h1>
          <p className="lab-page-lead" lang="es">{lead}</p>
          <p className="lab-label lab-legal-updated">
            {t("lg.updated")} · {date(`${LEGAL_UPDATED}T12:00:00`, { day: "numeric", month: "long", year: "numeric" })}
          </p>
          {lang !== "es" && <p className="lab-blog-lang lab-label">{t("lg.esOnly")}</p>}
        </div>
      </header>

      <div className="lab-legal">
        <nav className="lab-legal-toc" aria-label={t("lg.toc")}>
          <span className="lab-label lab-legal-toc-head">{t("lg.toc")}</span>
          <ol lang="es">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} onClick={(e) => jump(e, s.id)} aria-current={here === s.id ? "true" : undefined}>
                  <span className="lab-num">{n(i)}</span>
                  <span>{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="lab-legal-body lab-prose" lang="es">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="lab-legal-sec" aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`}>
                <span className="lab-legal-n lab-num" aria-hidden>{n(i)}</span>
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </article>
      </div>

      <nav className="lab-legal-related" aria-label={t("lg.related")}>
        <span className="lab-label" style={{ color: "var(--lab-metal)" }}>{t("lg.related")}</span>
        <div className="lab-legal-related-grid">
          {LEGAL_LINKS.filter((l) => l.doc !== doc).map((l) => (
            <Link key={l.doc} href={l.href} className="lab-article-step">
              <span className="lab-label">{t("lg.eyebrow")}</span>
              <span className="lab-h">{t(`${l.key}Full`)}</span>
            </Link>
          ))}
        </div>
      </nav>

      <LabFoot />
    </>
  );
}

/**
 * Primera capa de información (art. 11 LOPDGDD) bajo los formularios que
 * recogen datos: quién, para qué, qué derechos, y el enlace a la política. En
 * la reserva, además, las condiciones que se aceptan al enviarla.
 */
export function LabLegalBasic({ purpose }: { purpose: "reserve" | "login" }) {
  const { t } = useLabLang();
  const docs = LEGAL_LINKS.filter((l) => l.doc === "privacy" || (purpose === "reserve" && l.doc === "terms"));
  return (
    <p className="lab-legal-basic">
      {t(purpose === "reserve" ? "lg.basicReserve" : "lg.basicLogin", { owner: TITULAR.razonSocial })}{" "}
      {docs.map((l, i) => (
        <span key={l.doc}>
          {i > 0 && " · "}
          <Link href={l.href}>{t(`${l.key}Full`)}</Link>
        </span>
      ))}
    </p>
  );
}
