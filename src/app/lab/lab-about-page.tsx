"use client";

import Link from "next/link";
import { useLabLang } from "./lab-lang";
import { LabMotion } from "./lab-motion";
import { LabFoot, LabSubNav } from "./lab-chrome";
import { LabPrinciples, usePrincipleItems } from "./lab-principles";
import { Eyebrow, FUNDADA, Rise, useBackingFacts } from "./lab-parts";
import { LAB_PATHS } from "./lab-paths";

/* ═══════════════════════════════════════════════════════════════════════════
   Nosotros. Todo el texto sale de lo que ya publicaba el catálogo
   (src/app/catalogo/nosotros/page.tsx) y de la sección «El respaldo» de la
   portada: aquí no se afirma nada que no estuviera ya escrito.
   ═══════════════════════════════════════════════════════════════════════════ */

type Vars = React.CSSProperties & Record<string, string | number>;

export function LabAboutPage({ spotOro }: { spotOro: number | null }) {
  const { t } = useLabLang();
  const facts = useBackingFacts();
  const principles = usePrincipleItems(spotOro);

  return (
    <>
      <LabMotion curtain={false} />
      <div className="lab-atmos" aria-hidden>
        <i className="lab-atmos-frio" />
        <i className="lab-atmos-hondo" />
        <i className="lab-atmos-oro" />
      </div>
      <LabSubNav current="about" />

      {/* ══ ENTRADA ═════════════════════════════════════════════════════ */}
      <header className="lab-page-head" data-lab-track>
        <span className="lab-page-mark" aria-hidden>Ag</span>
        <div className="lab-page-head-inner" data-lab-in>
          <Eyebrow>{t("ab.eyebrow")}</Eyebrow>
          <h1 className="lab-page-title">
            <Rise>{t("ab.title")}</Rise>
          </h1>
          <p className="lab-page-lead">{t("ab.lead")}</p>
        </div>
      </header>

      {/* ══ FILOSOFÍA ═══════════════════════════════════════════════════ */}
      <section className="lab-ethos lab-seam" data-lab-track>
        <div className="lab-ethos-inner">
          <div data-lab-in>
            <i className="lab-ethos-rule" aria-hidden />
            <blockquote className="lab-ethos-quote">{t("ab.quote")}</blockquote>
            <p className="lab-label" style={{ color: "var(--lab-metal)", marginTop: 28 }}>{t("ab.quoteBy")}</p>
          </div>
          <div className="lab-ethos-text" data-lab-in style={{ "--d": "140ms" } as Vars}>
            <p className="lab-body">{t("ab.p1")}</p>
            <p className="lab-body">{t("ab.p2")}</p>
            <p className="lab-body">{t("ab.p3")}</p>
          </div>
        </div>
      </section>

      {/* ══ EL RESPALDO ═════════════════════════════════════════════════ */}
      <section className="lab-about lab-seam" data-lab-track>
        <span className="lab-about-mark" aria-hidden>{FUNDADA}</span>
        <div className="lab-about-inner">
          <div data-lab-in>
            <Eyebrow>{t("about.eyebrow")}</Eyebrow>
            <h2 className="lab-h" style={{ fontSize: "clamp(34px, 5.8vw, 84px)", marginTop: "clamp(20px, 3vw, 34px)" }}>
              <Rise>{t("about.title1")}</Rise>
              <Rise delay={110} className="lab-about-accent">{t("about.title2")}</Rise>
            </h2>
            <p className="lab-about-lead">{t("about.lead")}</p>
          </div>

          <dl className="lab-about-facts" data-lab-in style={{ "--d": "160ms" } as Vars}>
            {facts.map((f, i) => (
              <div key={i} className="lab-about-fact">
                <dt className="lab-num">{f.k}</dt>
                <dd className="lab-label">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ══ PRINCIPIOS ══════════════════════════════════════════════════ */}
      <section className="lab-layers lab-seam" data-lab-track>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: "clamp(40px, 6vw, 72px)", gridTemplateColumns: "minmax(0, 1fr)" }}>
          <div data-lab-in>
            <Eyebrow>{t("principles.eyebrow")}</Eyebrow>
            <h2 className="lab-h" style={{ fontSize: "clamp(32px, 5.4vw, 76px)", marginTop: "clamp(20px, 3vw, 34px)" }}>
              <Rise>{t("principles.title")}</Rise>
            </h2>
            <p className="lab-body" style={{ marginTop: 26, fontSize: "clamp(15px, 1.6vw, 18px)", maxWidth: "46ch" }}>
              {t("principles.lead")}
            </p>
          </div>
          <div data-lab-in style={{ "--d": "120ms" } as Vars}>
            <LabPrinciples items={principles} />
          </div>
        </div>
      </section>

      {/* ══ CIERRE ══════════════════════════════════════════════════════ */}
      <section className="lab-close lab-seam" data-lab-track>
        <div data-lab-in style={{ maxWidth: 1120, margin: "0 auto" }}>
          <h2 className="lab-h" style={{ fontSize: "clamp(32px, 6vw, 88px)", marginBottom: "clamp(34px, 5vw, 54px)" }}>
            <Rise>{t("ab.cta1")}</Rise>
            <Rise delay={110} className="lab-about-accent">{t("ab.cta2")}</Rise>
          </h2>
          <Link href={LAB_PATHS.collection} className="lab-cta">{t("ab.ctaBtn")}</Link>
        </div>
      </section>

      <LabFoot />
    </>
  );
}
