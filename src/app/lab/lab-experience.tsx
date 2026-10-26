"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/utils";
import { LabMotion, labScrollTo } from "./lab-motion";
import { LabProductDetail } from "./lab-product-detail";
import { LabMarketChart, type LabSerie } from "./lab-market-chart";
import { LabThemeToggle, useLabTheme } from "./lab-theme";
import { LabLangToggle, useLabLang } from "./lab-lang";
import { LabAccess } from "./lab-access";
import { LabPrinciples } from "./lab-principles";
import { useLabSession } from "./lab-session";
import {
  LabFilters, applyFilters, isPristine, purities, weightRange,
  type FilterState,
} from "./lab-filters";

// three.js pesa: se carga en su propio chunk después de la hidratación, mientras
// la cortina de entrada sigue en pantalla. El hero nunca depende de él para leerse.
const LabHeroScene = dynamic(() => import("./lab-hero-scene").then((m) => m.LabHeroScene), {
  ssr: false,
});

const TROY_OZ = 31.1034768;

/**
 * Encadenado de capítulos: atmósfera continua, costuras y elevación.
 * Ponlo en false y la página vuelve a ser siete fondos independientes,
 * como antes. Es el interruptor para comparar las dos versiones.
 */
const CADENA = true;
const PREVIEW  = 8;

/** Año de fundación de Te Quiero: el mismo dato que publica /catalogo. */
const FUNDADA = 1988;

export interface LabProduct {
  id:       string;
  name:     string;
  sku:      string | null;
  metal:    string;
  weight_g: number;
  purity:   number;
  price:    number | null;
  image:    string | null;
  inStock:  boolean;
}

/** Datos del emisor que imprime la factura. Los mismos que usa el ERP. */
export type LabCompany = {
  legal_name?:      string | null;
  trade_name?:      string | null;
  tax_id?:          string | null;
  address?:         string | null;
  city?:            string | null;
  postal_code?:     string | null;
  country?:         string | null;
  email?:           string | null;
  phone?:           string | null;
  website?:         string | null;
  iban?:            string | null;
  default_igic_rate?: number | null;
  invoice_footer?:  string | null;
} | null;

interface Props {
  brandName: string;
  company:   LabCompany;
  history:   { oro: LabSerie; plata: LabSerie };
  products:  LabProduct[];
  isDemo:    boolean;
  spots:     { oro: number | null; plata: number | null };
}

/* ── Utilidades de composición ─────────────────────────────────────────── */

type Vars = React.CSSProperties & Record<string, string | number>;

/** Título enmascarado: cada línea sube desde debajo de su propio recorte. */
function Rise({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <span className="lab-mask" style={{ "--d": `${delay}ms` } as Vars}>
      <span className={className}>{children}</span>
    </span>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
      <i style={{
        width: 40, height: 1, display: "block",
        background: "linear-gradient(90deg, var(--lab-metal), transparent)",
      }} />
      <span className="lab-label" style={{ color: "var(--lab-metal)" }}>{children}</span>
    </span>
  );
}

/** Contador que se dispara al entrar en pantalla. */
function Count({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }

    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const run = (now: number) => {
        const t = Math.min(1, (now - start) / 1500);
        setShown(value * (1 - Math.pow(1 - t, 4)));
        if (t < 1) raf = requestAnimationFrame(run);
      };
      raf = requestAnimationFrame(run);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);

  return <span ref={ref}>{format(shown)}</span>;
}

/** Lingote dibujado en CSS para las fichas sin fotografía. */
function BarGlyph({ metal }: { metal: string }) {
  const gold = metal === "oro";
  const face = gold ? "#e2ba76" : "#cfd8dd";
  const side = gold ? "#a8813f" : "#97a4ab";
  const top  = gold ? "#f3dcae" : "#eef2f4";
  return (
    <svg viewBox="0 0 200 130" width="62%" role="img" aria-label={gold ? "Lingote de oro" : "Lingote de plata"}>
      <defs>
        <linearGradient id={`bg-${metal}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="52%" stopColor={face} />
          <stop offset="100%" stopColor={side} />
        </linearGradient>
      </defs>
      <polygon points="46,44 154,44 176,96 24,96" fill={`url(#bg-${metal})`} />
      <polygon points="46,44 154,44 148,52 52,52" fill={top} opacity="0.85" />
      <polygon points="24,96 176,96 176,102 24,102" fill={side} opacity="0.8" />
      <line x1="66" y1="66" x2="134" y2="66" stroke={side} strokeWidth="2" opacity="0.55" />
      <line x1="60" y1="78" x2="140" y2="78" stroke={side} strokeWidth="2" opacity="0.4" />
    </svg>
  );
}


/* ── FAQ ────────────────────────────────────────────────────────────────── */

function FaqP({ children }: { children: React.ReactNode }) {
  return <p className="lab-body" style={{ fontSize: "clamp(14px, 1.5vw, 16px)" }}>{children}</p>;
}

function FaqList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: "14px 0", display: "flex", flexDirection: "column", gap: 11 }}>
      {items.map((t, i) => (
        <li key={i} className="lab-body" style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: "clamp(14px, 1.5vw, 16px)", lineHeight: 1.6 }}>
          <span aria-hidden style={{ marginTop: 9, flexShrink: 0, width: 5, height: 5, borderRadius: 999, background: "var(--lab-metal)" }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function FaqItem({ q, children, defaultOpen = false }: { q: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="lab-faq-item">
      <button type="button" className="lab-faq-q" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="lab-h" style={{ fontSize: "clamp(16px, 2.1vw, 24px)", lineHeight: 1.3 }}>{q}</span>
        <span aria-hidden className="lab-faq-sign">
          <i />
          <i data-v="" style={{ transform: `translateX(-50%) scaleY(${open ? 0 : 1})` }} />
        </span>
      </button>
      {/* grid-template-rows 0fr→1fr: despliegue con altura automática y sin JS de medida */}
      <div className="lab-faq-a" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ paddingBottom: "clamp(22px, 3.2vw, 34px)", maxWidth: "62ch" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Experiencia ───────────────────────────────────────────────────────── */


export function LabExperience({ brandName, company, history, products, isDemo, spots }: Props) {
  const { t, money } = useLabLang();
  const goldOz   = spots.oro   != null ? spots.oro   * TROY_OZ : null;
  const silverOz = spots.plata != null ? spots.plata * TROY_OZ : null;

  const tickerItems = [
    goldOz   != null ? t("ticker.oz", { sym: "XAU/EUR", price: money(goldOz) })   : t("ticker.spot", { sym: "XAU/EUR" }),
    t("ticker.purity"),
    silverOz != null ? t("ticker.oz", { sym: "XAG/EUR", price: money(silverOz) }) : t("ticker.spot", { sym: "XAG/EUR" }),
    t("hero.custody"),
    t("ticker.buyback"),
    t("ticker.place"),
  ];

  // El respaldo del grupo, en cifras. Los años se calculan: escritos a mano
  // caducarían cada enero.
  const facts = [
    { k: String(FUNDADA), v: t("about.s1") },
    { k: <Count value={17} format={(n) => `+${Math.round(n)}`} />, v: t("about.s2") },
    { k: <Count value={new Date().getFullYear() - FUNDADA} format={(n) => String(Math.round(n))} />, v: t("about.s3") },
  ];

  // La rejilla abre con ocho piezas; el resto se despliega en vertical
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<LabProduct | null>(null);
  // Cambiar de metal exige rehacer el entorno PMREM: se remonta la escena
  const theme = useLabTheme();
  const { session, ready, reserve } = useLabSession();
  const [access, setAccess] = useState(false);
  // Confirmación por ficha: el aviso se queda donde se pulsó, no en una esquina
  const [justReserved, setJustReserved] = useState<string | null>(null);
  // Unidades elegidas en cada ficha. Solo se guarda lo que difiere de 1, así
  // que el objeto se mantiene vacío mientras nadie toque nada.
  const [unidades, setUnidades] = useState<Record<string, number>>({});
  const uds = (id: string) => unidades[id] ?? 1;
  const acotar = (n: number) => Math.max(1, Math.min(99, n || 1));
  /** Valor absoluto: lo usa el campo de texto. */
  const setUds = (id: string, n: number) =>
    setUnidades((u) => ({ ...u, [id]: acotar(n) }));
  /**
   * Incremento relativo para − y +. Tiene que leer el estado dentro del
   * actualizador: con dos pulsaciones seguidas React las agrupa y, leyendo
   * fuera, la segunda parte del valor viejo y se pierde un incremento.
   */
  const sumaUds = (id: string, d: number) =>
    setUnidades((u) => ({ ...u, [id]: acotar((u[id] ?? 1) + d) }));

  /** Reserva de una unidad sin salir de la rejilla. Sin sesión, pide entrar. */
  const quickReserve = (p: LabProduct) => {
    if (!session) { setAccess(true); return; }
    reserve(p, uds(p.id));
    setJustReserved(p.id);
    // La ficha vuelve a una unidad: dejarla en 5 invita a reservar cinco más
    setUnidades((u) => ({ ...u, [p.id]: 1 }));
    window.setTimeout(() => setJustReserved((id) => (id === p.id ? null : id)), 3200);
  };

  // Los cuatro principios son los de src/app/catalogo/nosotros/page.tsx.
  // El texto vive en el diccionario; aquí solo se compone.
  const principles = ([1, 2, 3, 4] as const).map((k) => ({
    n:    `0${k}`,
    name: t(`p${k}.name`),
    tag:  t(`p${k}.tag`),
    display:
      k === 1 ? <Count value={999.9} format={(n) => n.toFixed(1)} />
      : k === 2 ? (spots.oro != null ? money(spots.oro) : t("p2.tag"))
      : k === 3 ? "LBMA"
      : t("p4.display"),
    unit: k === 2 && spots.oro == null ? t("p2.unitAlt") : t(`p${k}.unit`),
    d:    t(`p${k}.body`),
  }));

  const bounds        = useMemo(() => weightRange(products), [products]);
  const purityOptions = useMemo(() => purities(products), [products]);
  const [filters, setFilters] = useState<FilterState>(() => ({
    metal: "todo", kind: "todo", purity: "todo", min: bounds.min, max: bounds.max,
  }));

  const pristine = isPristine(filters, bounds);
  const matched  = useMemo(() => applyFilters(products, filters), [products, filters]);

  // Con filtro activo se enseña todo lo que encaja: el corte de ocho es para la
  // vista de partida, no para un resultado que ya viene acotado.
  const shown  = pristine && !expanded ? matched.slice(0, PREVIEW) : matched;
  const hidden = matched.length - shown.length;

  // Firma del filtro: remonta la rejilla para que la entrada se repita
  const gridKey = `${filters.metal}|${filters.kind}|${filters.purity}|${filters.min}|${filters.max}|${expanded}`;

  const faqItems: { q: string; a: React.ReactNode }[] = [
    { q: t("faq.q1"), a: <FaqP>{t("faq.a1")}</FaqP> },
    { q: t("faq.q2"), a: <FaqP>{t("faq.a2")}</FaqP> },
    {
      q: t("faq.q3"),
      a: (
        <>
          <FaqP>{t("faq.a3a")}</FaqP>
          <FaqList items={[t("faq.a3l1"), t("faq.a3l2"), t("faq.a3l3")]} />
          <FaqP>{t("faq.a3b")}</FaqP>
        </>
      ),
    },
    {
      q: t("faq.q4"),
      a: (
        <>
          <FaqP>{t("faq.a4a")}</FaqP>
          <FaqList items={[t("faq.a4l1"), t("faq.a4l2"), t("faq.a4l3")]} />
          <FaqP>{t("faq.a4b")}</FaqP>
        </>
      ),
    },
    {
      q: t("faq.q5"),
      a: (
        <>
          <FaqP>{t("faq.a5a")}</FaqP>
          <FaqList items={[t("faq.a5l1"), t("faq.a5l2")]} />
          <FaqP>{t("faq.a5b")}</FaqP>
        </>
      ),
    },
  ];


  return (
    <>
      <LabMotion chain={CADENA} />

      {/* Fondo continuo de la página: las secciones se recortan sobre él */}
      <div className="lab-atmos" aria-hidden>
        <i className="lab-atmos-frio" />
        <i className="lab-atmos-hondo" />
        <i className="lab-atmos-oro" />
      </div>

      {/* ══ NAVEGACIÓN ══════════════════════════════════════════════════ */}
      <nav className="lab-nav" data-solid="false" data-hidden="false" data-top="true">
        <Link href="/lab" className="lab-nav-mark">{brandName}</Link>
        <div className="lab-nav-links">
          <button type="button" className="lab-nav-link lab-nav-section" onClick={() => labScrollTo("#nosotros")}>{t("nav.about")}</button>
          <button type="button" className="lab-nav-link lab-nav-section" onClick={() => labScrollTo("#principios")}>{t("nav.principles")}</button>
          <button type="button" className="lab-nav-link lab-nav-section" onClick={() => labScrollTo("#coleccion")}>{t("nav.collection")}</button>
          <button type="button" className="lab-nav-link lab-nav-section" onClick={() => labScrollTo("#mercado")}>{t("nav.market")}</button>
          <button type="button" className="lab-nav-link lab-nav-section" onClick={() => labScrollTo("#faq")}>{t("nav.faq")}</button>
          <LabLangToggle />
          <LabThemeToggle />
          <button type="button" className="lab-cta" onClick={() => setAccess(true)}>
            {ready && session ? session.name.split(" ")[0] : t("nav.access")}
          </button>
        </div>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════════════ */}
      <header className="lab-hero" data-lab-track>
        <LabHeroScene key={theme} theme={theme} />
        <div className="lab-hero-halo" aria-hidden />
        <div className="lab-hero-veil" aria-hidden />

        <div className="lab-hero-body">
          <span
            className="lab-label"
            style={{ color: "var(--lab-metal)", marginBottom: "clamp(18px, 2.6vw, 32px)", animation: "lab-down 1.1s var(--e-expo) 50ms both" }}
          >
            {t("hero.eyebrow")}
          </span>

          <h1 className="lab-hero-word" aria-label={brandName}>
            <span aria-hidden style={{ display: "block", overflow: "hidden", paddingBottom: "0.34em", marginBottom: "-0.06em" }}>
              {brandName.split("").map((ch, i) => (
                <span
                  key={`c${i}`}
                  style={{ animation: `lab-rise 1.35s var(--e-expo) ${130 + i * 70}ms both` }}
                >
                  {ch === " " ? " " : ch}
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

          <p
            className="lab-h"
            style={{ fontSize: "clamp(21px, 3.4vw, 44px)", color: "var(--lab-ink-2)", margin: 0, animation: "lab-up 1.2s var(--e-expo) 710ms both" }}
          >
            {t("hero.claim")}
          </p>

        </div>

        {/* Los datos viven en el pie: el centro se reserva para la masa */}
        <div className="lab-hero-foot" style={{ animation: "lab-fade 1s var(--e-expo) 1250ms both" }}>
          <span className="lab-label lab-only-desktop" style={{ color: "var(--lab-ink-3)" }}>
            {t("hero.refs", { n: products.length })}
          </span>
          <div className="lab-scrollcue-line" />
          <span className="lab-label lab-only-desktop" style={{ color: "var(--lab-ink-3)", textAlign: "right" }}>
            {t("hero.custody")}
          </span>
        </div>

        <div className="lab-ticker" style={{ animation: "lab-fade 1s var(--e-expo) 1350ms both" }}>
          <div className="lab-ticker-track">
            {[0, 1].map((dup) => (
              <div key={dup} style={{ display: "flex" }} aria-hidden={dup === 1}>
                {tickerItems.map((item, i) => (
                  <span key={`${dup}-${i}`} className="lab-ticker-item">
                    <i style={{ width: 4, height: 4, borderRadius: 999, background: "var(--lab-metal)", display: "block" }} />
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ══ NOSOTROS · EL RESPALDO ══════════════════════════════════════ */}
      <section id="nosotros" className="lab-about" data-lab-track>
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
      <section id="principios" className="lab-layers lab-seam" data-lab-track>
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

      {/* ══ COLECCIÓN ═══════════════════════════════════════════════════ */}
      <section id="coleccion" className="lab-gallery lab-lift" data-lab-track>
        <div className="lab-gallery-inner">
          <div className="lab-gallery-head" data-lab-in>
            <div>
              <Eyebrow>{t("col.eyebrow")}</Eyebrow>
              <h2 className="lab-h" style={{ fontSize: "clamp(32px, 5.6vw, 78px)", marginTop: "clamp(16px, 2.4vw, 28px)" }}>
                {t("col.title")}
              </h2>
            </div>
            <p className="lab-body" style={{ maxWidth: "34ch", fontSize: 15 }}>
              {t(isDemo ? "col.noteDemo" : "col.noteReal")}
            </p>
          </div>

          <LabFilters
            state={filters}
            onChange={(next) => { setFilters(next); setExpanded(false); }}
            bounds={bounds}
            purityOptions={purityOptions}
            matches={matched.length}
            total={products.length}
          />

          {matched.length === 0 ? (
            <p className="lab-empty lab-h">
              {t("col.empty")}
            </p>
          ) : (
          <div className="lab-grid" key={gridKey}>
            {shown.map((p, i) => (
              <article
                key={p.id}
                className={`lab-card${pristine && !expanded && i < PREVIEW ? "" : " lab-card--new"}`}
                data-lab-hot
                {...(pristine && !expanded && i < PREVIEW ? { "data-lab-in": "" } : {})}
                style={{ "--d": `${(i % 4) * 70}ms`, "--i": i % 12 } as Vars}
              >
                <div className={`lab-card-shot${p.image ? "" : " lab-card-shot--empty"}`}>
                  {p.image
                    ? /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.image} alt={p.name} loading="lazy" />
                    : <BarGlyph metal={p.metal} />}
                  {!p.inStock && (
                    <span className="lab-label" style={{
                      position: "absolute", top: 14, right: 14, padding: "5px 10px", borderRadius: 999,
                      background: "var(--lab-inset-2)", color: "var(--lab-ink-3)", fontSize: 8, letterSpacing: "0.24em",
                    }}>
                      {t("col.backorder")}
                    </span>
                  )}
                </div>
                <div className="lab-card-body">
                  <span className="lab-chip">{t(p.metal === "oro" ? "f.gold" : "f.silver")} · {p.purity.toFixed(4).replace(/0+$/, "")}</span>
                  <h3 className="lab-h" style={{ fontSize: "clamp(17px, 1.9vw, 21px)", color: "var(--lab-ink)" }}>{p.name}</h3>
                  <div style={{ marginTop: "auto", paddingTop: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                    <span className="lab-label" style={{ color: "var(--lab-ink-3)" }}>
                      {p.weight_g >= 1000 ? `${(p.weight_g / 1000).toFixed(2)} kg` : `${p.weight_g} g`}
                    </span>
                    <span className="lab-num" style={{ fontSize: "clamp(19px, 2.2vw, 25px)", color: "var(--lab-ink)" }}>
                      {p.price != null ? money(p.price) : t("d.ask")}
                    </span>
                  </div>

                  <div className="lab-card-actions">
                    {/* Sin sesión no se puede reservar, así que tampoco se
                        ofrece: elegir unidades que no vas a poder usar es una
                        trampa. `ready` evita el parpadeo de quien sí tiene sesión. */}
                    {!ready || session ? (
                      <>
                        <div className="lab-uds" role="group" aria-label={t("col.units", { name: p.name })}>
                          <button
                            type="button" className="lab-uds-btn" aria-label={t("col.minus")}
                            disabled={uds(p.id) <= 1}
                            onClick={() => sumaUds(p.id, -1)}
                          >−</button>
                          <input
                            type="number" className="lab-uds-n" min={1} max={99}
                            aria-label={t("col.units", { name: p.name })}
                            value={uds(p.id)}
                            onChange={(e) => setUds(p.id, Number(e.target.value))}
                          />
                          <button
                            type="button" className="lab-uds-btn" aria-label={t("col.plus")}
                            disabled={uds(p.id) >= 99}
                            onClick={() => sumaUds(p.id, 1)}
                          >+</button>
                        </div>

                        <button
                          type="button"
                          className="lab-card-reserve"
                          data-done={justReserved === p.id ? "true" : "false"}
                          onClick={() => quickReserve(p)}
                        >
                          {t(justReserved === p.id ? "col.reserved" : "col.reserve")}
                        </button>
                      </>
                    ) : (
                      <button type="button" className="lab-card-login" onClick={() => setAccess(true)}>
                        <span aria-hidden className="lab-card-lock">
                          <svg viewBox="0 0 16 16" width="11" height="11">
                            <rect x="3.5" y="7" width="9" height="6.5" rx="1.4" fill="none"
                                  stroke="currentColor" strokeWidth="1.3" />
                            <path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7" fill="none"
                                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                        </span>
                        {t("col.login")}
                      </button>
                    )}

                    <button type="button" className="lab-card-ghost" onClick={() => setDetail(p)}>
                      {t("col.view")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          )}

          <div className="lab-gallery-foot">
            <div className="lab-hair-line" />
            {hidden > 0 ? (
              <button type="button" className="lab-cta" onClick={() => setExpanded(true)}>
                {t("col.more", { n: hidden, piece: t(hidden === 1 ? "col.piece" : "col.pieces") })}
              </button>
            ) : (
              <button type="button" className="lab-cta" onClick={() => labScrollTo("#contacto")}>
                {t("col.other")}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ══ MERCADO ═════════════════════════════════════════════════════ */}
      <section id="mercado" className="lab-market lab-seam" data-lab-track>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div data-lab-in style={{ marginBottom: "clamp(32px, 5vw, 56px)" }}>
            <Eyebrow>{t("mk.eyebrow")}</Eyebrow>
            <h2 className="lab-h" style={{ fontSize: "clamp(32px, 5.6vw, 78px)", marginTop: "clamp(16px, 2.4vw, 30px)", maxWidth: "18ch" }}>
              <Rise>{t("mk.title1")}</Rise>
              <Rise delay={110}>{t("mk.title2")}</Rise>
            </h2>
          </div>

          <div data-lab-in>
            <LabMarketChart history={history} />
          </div>

          <p data-lab-in className="lab-body" style={{ marginTop: 30, fontSize: 13, color: "var(--lab-ink-3)", maxWidth: "68ch" }}>
            {t("mk.note")}
          </p>
        </div>
      </section>

      {/* ══ FAQ ═════════════════════════════════════════════════════════ */}
      <section id="faq" className="lab-faq lab-seam" data-lab-track>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div data-lab-in style={{ marginBottom: "clamp(34px, 5vw, 60px)" }}>
            <Eyebrow>{t("faq.eyebrow")}</Eyebrow>
            <h2 className="lab-h" style={{ fontSize: "clamp(30px, 5.2vw, 72px)", marginTop: "clamp(16px, 2.4vw, 30px)" }}>
              <Rise>{t("faq.title")}</Rise>
            </h2>
          </div>

          <div data-lab-in>
            {faqItems.map((item, i) => (
              <FaqItem key={i} q={item.q} defaultOpen={i === 0}>{item.a}</FaqItem>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CIERRE ══════════════════════════════════════════════════════ */}
      <section id="contacto" className="lab-close lab-seam" data-lab-track>
        <div data-lab-in style={{ maxWidth: 1120, margin: "0 auto" }}>
          <Eyebrow>{t("ct.eyebrow")}</Eyebrow>
          <h2 className="lab-close-word" style={{ margin: "clamp(24px, 4vw, 44px) 0" }}>
            <Rise>{t("ct.title")}</Rise>
          </h2>
          <p className="lab-body" style={{ fontSize: "clamp(16px, 1.8vw, 20px)", maxWidth: "42ch", margin: "0 auto clamp(34px, 5vw, 54px)" }}>
            {t("ct.lead")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
            <a className="lab-cta" href="mailto:info@lingot.com">info@lingot.com</a>
            <a className="lab-cta" href="tel:+34669393197">669 39 31 97</a>
          </div>
        </div>
      </section>

      {detail && (
        <LabProductDetail
          product={detail}
          initialQty={uds(detail.id)}
          onClose={() => setDetail(null)}
          onNeedsAccess={() => { setDetail(null); setAccess(true); }}
        />
      )}

      {access && <LabAccess products={products} company={company} onClose={() => setAccess(false)} />}

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer className="lab-foot">
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
          <span className="lab-nav-mark">{brandName}</span>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: "clamp(18px, 3vw, 36px)" }}>
            <Link href="/catalogo" className="lab-foot-link">{t("ft.catalog")}</Link>
            <Link href="/catalogo/nosotros" className="lab-foot-link">{t("ft.about")}</Link>
            <Link href="/catalogo/blog" className="lab-foot-link">{t("ft.blog")}</Link>
          </nav>
          <span className="lab-label" style={{ color: "var(--lab-ink-4)", letterSpacing: "0.34em" }}>
            Te Quiero Group · {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </>
  );
}
