"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { CatalogHeroWebGL } from "./catalog-hero-webgl";
import { CatalogGrid, type CatalogProduct } from "./catalog-grid";
import { CatalogScrollTransition } from "./catalog-scroll-transition";
import { TradingViewChart } from "./trading-view-chart";
import { CatalogFooter } from "./catalog-footer";
import type { BlogPost } from "./blog/data";

const TROY_OZ = 31.1034768;

interface Props {
  products:       CatalogProduct[];
  brandName:      string;
  year:           number;
  latestPosts:    BlogPost[];
  isLoggedIn:     boolean;
  isWholesale:    boolean;
  isAdmin:        boolean;
  catalogEnabled: boolean;
  userName:       string;
  spots:          { oro: number | null; plata: number | null };  // €/g
}

// ── Hero line: masked slide-up ────────────────────────────────────────────────
function HeroLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <div style={{ overflow: "hidden" }}>
      <div style={{ animation: `lg-rise 1.15s var(--lg-expo) ${delay}ms both` }}>
        {children}
      </div>
    </div>
  );
}

// ── Section eyebrow (gold thread + mono label) ────────────────────────────────
function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div style={{ height: "1px", width: "44px", background: "linear-gradient(to right, var(--lg-gold), transparent)" }} />
      <span
        className="lg-label"
        style={{
          fontSize: "10px",
          letterSpacing: "0.42em",
          color: dark ? "rgba(228,200,143,0.75)" : "var(--lg-gold-deep)",
        }}
      >
        {children}
      </span>
    </div>
  );
}

export function CatalogLanding({
  products, brandName, latestPosts,
  isLoggedIn, isAdmin, catalogEnabled, spots,
}: Props) {
  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
  }

  const goldOz   = spots.oro   != null ? spots.oro   * TROY_OZ : null;
  const silverOz = spots.plata != null ? spots.plata * TROY_OZ : null;

  const marketRows = [
    { sym: "XAU / EUR", label: "Oro · onza troy",   val: goldOz,   perG: spots.oro   },
    { sym: "XAG / EUR", label: "Plata · onza troy", val: silverOz, perG: spots.plata },
  ];

  const faqItems: { q: string; a: React.ReactNode }[] = [
    {
      q: "¿Puedo obtener un descuento?",
      a: <FaqP>Sí. Dependiendo del volumen de compra —puntual o recurrente— siempre estamos dispuestos a negociar la prima.</FaqP>,
    },
    {
      q: "¿Pueden enviarlo a cualquier lugar de España?",
      a: <FaqP>Por supuesto. En Lingot trabajamos con paqueterías nacionales e internacionales para garantizar el mejor servicio.</FaqP>,
    },
    {
      q: "¿Por qué el precio que pago es superior al precio «spot» del oro o la plata?",
      a: (
        <>
          <FaqP>Porque incluye una «prima» que cubre:</FaqP>
          <FaqList items={["Fabricación del lingote o moneda", "Distribución y logística", "Certificación y trazabilidad", "Margen del distribuidor"]} />
          <FaqP>Esta prima suele ser menor en lingotes grandes y mayor en piezas pequeñas o monedas. En Lingot tenemos primas muy ajustadas al mercado.</FaqP>
        </>
      ),
    },
    {
      q: "¿Es fácil vender el oro o la plata cuando lo necesite?",
      a: (
        <>
          <FaqP>Sí. El oro y la plata física son activos con alta liquidez global. Se pueden vender:</FaqP>
          <FaqList items={["A distribuidores especializados", "En mercados secundarios", "A compradores privados, en algunos casos"]} />
          <FaqP>El valor de recompra dependerá del precio del metal en ese momento y del formato (lingote o moneda). En Lingot ofrecemos este servicio a nuestros clientes.</FaqP>
        </>
      ),
    },
    {
      q: "¿Tengo que pagar impuestos al comprar o vender?",
      a: (
        <>
          <FaqP>Depende del país y del tipo de producto. En España funciona así:</FaqP>
          <FaqList items={[
            "Los lingotes y monedas de oro de inversión pueden estar exentos de IVA/IGIC si su pureza es superior a 21,6 quilates (900 milésimas).",
            "Todas las monedas y lingotes de plata incluyen IVA/IGIC (21 % o 15 %).",
          ]} />
          <FaqP>Al vender tu lingote o moneda, las ganancias pueden tributar como plusvalías (IRPF o Impuesto sobre Sociedades), igual que cualquier otro beneficio.</FaqP>
        </>
      ),
    },
  ];

  return (
    <div style={{ background: "var(--lg-paper)" }}>
      <div aria-hidden className="lg-grain" />

      {/* Admin preview banner */}
      {isAdmin && !catalogEnabled && (
        <div className="relative z-50 px-6 py-2.5 text-center"
          style={{ background: "rgba(200,161,100,0.10)", borderBottom: "1px solid rgba(200,161,100,0.20)" }}>
          <span className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.3em", color: "var(--lg-gold-deep)" }}>
            Vista previa · El catálogo no está publicado
          </span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          HERO — Bóveda acorazada (oscuro)
      ══════════════════════════════════════════════════════════════════ */}
      <header
        className="relative flex min-h-[100dvh] flex-col overflow-hidden"
        style={{ background: "radial-gradient(120% 90% at 50% 8%, #0f4a5c 0%, #0a3746 42%, #06272f 100%)" }}
      >
        {/* Vignette (parallax target) */}
        <div id="hero-bg-vignette" aria-hidden className="pointer-events-none absolute inset-0" style={{ zIndex: 2 }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(140% 120% at 50% 40%, transparent 40%, rgba(4,20,26,0.55) 100%)" }} />
        </div>

        <CatalogHeroWebGL />
        <CatalogScrollTransition />

        {/* Hero body (parallax + fade target) */}
        <div id="hero-content" className="relative flex flex-1 flex-col items-center justify-center px-8 pb-14 pt-4 text-center sm:px-14" style={{ zIndex: 5 }}>
          <div style={{ marginBottom: "clamp(18px, 2.6vw, 30px)", animation: "lg-fade-down 0.8s var(--lg-expo) 140ms both" }}>
            <span className="lg-label" style={{ fontSize: "10px", letterSpacing: "0.5em", color: "rgba(228,200,143,0.72)" }}>
              Metales preciosos · Alta pureza
            </span>
          </div>

          <HeroLine delay={220}>
            <h1 className="lg-display select-none"
              style={{ fontSize: "clamp(84px, 17vw, 260px)", color: "var(--lg-light)", lineHeight: 0.86, fontWeight: 300, margin: 0, paddingBottom: "0.12em" }}>
              {brandName}
            </h1>
          </HeroLine>

          <div style={{ margin: "clamp(8px, 1.6vw, 26px) 0 clamp(24px, 3.6vw, 46px)", width: "clamp(200px, 30vw, 360px)", animation: "lg-fade-up 0.9s var(--lg-expo) 460ms both" }}>
            <div className="flex items-center gap-5">
              <div className="lg-goldline-shimmer flex-1" />
              <span style={{ fontSize: "8px", color: "rgba(228,200,143,0.55)" }}>✦</span>
              <div className="lg-goldline-shimmer flex-1" style={{ animationDirection: "reverse" }} />
            </div>
          </div>

          <HeroLine delay={380}>
            <p className="lg-heading select-none"
              style={{ fontSize: "clamp(22px, 3.6vw, 46px)", color: "var(--lg-light-soft)", fontWeight: 300, letterSpacing: "-0.02em", margin: 0 }}>
              El metal sin ruido.
            </p>
          </HeroLine>

          <div style={{ marginTop: "clamp(22px, 3vw, 38px)", animation: "lg-fade-up 0.9s var(--lg-expo) 680ms both" }}>
            <p className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.4em", color: "var(--lg-light-dim)" }}>
              {products.length} {products.length === 1 ? "referencia" : "referencias"} · Custodia con cita previa
            </p>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="relative flex justify-center pb-9" style={{ zIndex: 5, animation: "lg-fade-up 0.9s var(--lg-expo) 1020ms both" }}>
          <div className="flex flex-col items-center gap-2.5">
            <div className="lg-cue" style={{ width: "1px", height: "44px", background: "linear-gradient(to bottom, transparent, var(--lg-gold))" }} />
            <span className="lg-label" style={{ fontSize: "7px", letterSpacing: "0.55em", color: "var(--lg-light-dim)" }}>Explorar</span>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          STATEMENT (oscuro) — capítulo cinematográfico
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, var(--lg-vault-deep) 0%, var(--lg-vault) 240px)", padding: "clamp(96px, 15vw, 180px) clamp(24px, 6vw, 80px)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(90% 80% at 80% 20%, rgba(200,161,100,0.06), transparent 60%)" }} />
        <div aria-hidden style={{
          position: "absolute", right: "-2vw", bottom: "-10vh",
          fontSize: "clamp(200px, 40vw, 520px)", fontWeight: 300, lineHeight: 0.8,
          color: "rgba(238,242,244,0.03)", userSelect: "none", pointerEvents: "none", letterSpacing: "-0.06em",
        }}>Au</div>

        <div className="relative mx-auto max-w-4xl" style={{ zIndex: 2 }}>
          <div data-lg-reveal><Eyebrow dark>La tesis</Eyebrow></div>
          <blockquote data-lg-reveal className="lg-display"
            style={{ marginTop: "clamp(32px, 5vw, 56px)", fontSize: "clamp(28px, 5vw, 66px)", color: "var(--lg-light)", fontWeight: 300, lineHeight: 1.12, letterSpacing: "-0.03em" }}>
            El oro es dinero.<br />
            <span style={{ color: "rgba(228,200,143,0.85)" }}>Todo lo demás es crédito.</span>
          </blockquote>
          <p data-lg-reveal className="lg-label" style={{ marginTop: "clamp(28px, 4vw, 44px)", fontSize: "9px", letterSpacing: "0.34em", color: "var(--lg-light-dim)" }}>
            J. P. Morgan · 1912
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          RESPALDO (oscuro) — Te Quiero Group
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden"
        style={{ background: "var(--lg-vault)", padding: "0 clamp(24px, 6vw, 80px) clamp(96px, 14vw, 170px)" }}>
        <div className="relative mx-auto max-w-6xl">
          <div aria-hidden style={{ height: "1px", background: "var(--lg-vault-line)", marginBottom: "clamp(64px, 10vw, 120px)" }} />

          <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <div data-lg-reveal><Eyebrow dark>El respaldo</Eyebrow></div>
              <h2 data-lg-reveal className="lg-display"
                style={{ marginTop: "clamp(28px, 4vw, 44px)", fontSize: "clamp(30px, 3.9vw, 52px)", color: "var(--lg-light)", fontWeight: 300, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
                Detrás de Lingot,<br />
                Te&nbsp;Quiero.<br />
                <span style={{ color: "rgba(228,200,143,0.85)" }}>Joyería canaria desde&nbsp;1988.</span>
              </h2>
              <div data-lg-reveal style={{ marginTop: "clamp(28px, 4vw, 44px)", maxWidth: "54ch", fontSize: "clamp(15px, 1.5vw, 17px)", lineHeight: 1.72, color: "var(--lg-light-soft)" }}>
                <p>
                  Lingot forma parte de Te Quiero Group. Te Quiero nació en Tenerife en 1988, en barrios donde pocas
                  joyerías apostaban por ofrecer oro y plata con honestidad y a precios reales.
                </p>
                <p style={{ marginTop: "1.1em" }}>
                  Hoy son más de 17 joyerías en Canarias y la misma idea de entonces: que el metal precioso no sea
                  algo lejano. Lingot la lleva a la inversión, con el mismo equipo y la misma forma de hacer las cosas.
                </p>
              </div>
              <p data-lg-reveal className="lg-label" style={{ marginTop: "clamp(28px, 4vw, 40px)", fontSize: "9px", letterSpacing: "0.34em", color: "var(--lg-light-dim)" }}>
                Se puede empezar en un barrio de Tenerife y crecer.
              </p>
            </div>

            <dl data-lg-reveal data-lg-stagger className="lg:col-span-4 lg:col-start-9 lg:self-end">
              {[
                { k: "1988",        v: "Fundada en Tenerife" },
                { k: "+17",         v: "Joyerías en Canarias" },
                { k: "Oro y plata", v: "Con honestidad y a precios reales" },
              ].map((s) => (
                <div key={s.k} style={{ borderTop: "1px solid var(--lg-vault-line)", padding: "22px 0" }}>
                  <dt className="lg-display" style={{ fontSize: "clamp(28px, 3.4vw, 40px)", color: "var(--lg-light)", fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {s.k}
                  </dt>
                  <dd className="lg-label" style={{ marginTop: "10px", fontSize: "9px", letterSpacing: "0.3em", color: "rgba(228,200,143,0.72)" }}>
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          GALERÍA (claro) — la bóveda se abre
      ══════════════════════════════════════════════════════════════════ */}
      <div className="lg-gallery-lift" style={{ background: "var(--lg-paper)" }}>
        {/* Gold seam at the crease */}
        <div aria-hidden style={{ height: "1px", background: "linear-gradient(to right, transparent, var(--lg-gold-line), transparent)" }} />

        {/* Market strip */}
        {(goldOz != null || silverOz != null) && (
          <section data-lg-reveal className="px-6 sm:px-14" style={{ paddingTop: "clamp(40px, 6vw, 72px)" }}>
            <div className="mx-auto mb-5 flex max-w-5xl items-center gap-2.5">
              <span className="lg-live inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--lg-gold)" }} />
              <span className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.34em", color: "var(--lg-gold-deep)" }}>En vivo · Mercado spot</span>
            </div>
            <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2">
              {marketRows.filter((r) => r.val != null).map((r) => (
                <div key={r.sym}
                  className="flex items-center justify-between rounded-2xl px-6 py-5"
                  style={{ background: "var(--lg-surface)", border: "1px solid var(--lg-ink-faint)", boxShadow: "0 1px 2px rgba(10,43,54,0.03)" }}>
                  <div>
                    <div className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.3em", color: "var(--lg-gold-deep)" }}>{r.sym}</div>
                    <div className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.18em", color: "var(--lg-ink-dim)", marginTop: "5px" }}>{r.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="lg-num" style={{ fontSize: "26px", color: "var(--lg-ink)", fontWeight: 500 }}>{formatCurrency(r.val!)}</div>
                    <div className="lg-num" style={{ fontSize: "10px", color: "var(--lg-ink-dim)", marginTop: "3px" }}>{r.perG != null ? `${formatCurrency(r.perG)} / g` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Product grid */}
        <main id="catalogo">
          {products.length === 0 ? (
            <div className="py-40 text-center">
              <p className="lg-label" style={{ fontSize: "10px", letterSpacing: "0.4em", color: "var(--lg-ink-dim)" }}>Sin productos disponibles</p>
            </div>
          ) : (
            <CatalogGrid products={products} isLoggedIn={isLoggedIn} />
          )}
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          GRÁFICO DEL ORO (claro)
      ══════════════════════════════════════════════════════════════════ */}
      <section data-lg-reveal className="px-6 sm:px-14"
        style={{ paddingTop: "clamp(72px, 11vw, 120px)", paddingBottom: "clamp(72px, 11vw, 120px)", background: "var(--lg-paper)" }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-9"><Eyebrow>Oro · XAU/EUR · Onza troy</Eyebrow></div>
          <div style={{ height: "480px", borderRadius: "20px", overflow: "hidden", border: "1px solid var(--lg-ink-faint)", background: "var(--lg-surface)", boxShadow: "0 20px 60px -30px rgba(10,43,54,0.18)" }}>
            <TradingViewChart />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          BLOG (claro)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="px-6 sm:px-14"
        style={{ paddingTop: "clamp(40px, 6vw, 60px)", paddingBottom: "clamp(80px, 12vw, 130px)", background: "var(--lg-paper)" }}>
        <div className="mx-auto max-w-7xl">
          <div data-lg-reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="mb-5"><Eyebrow>Análisis</Eyebrow></div>
              <h2 className="lg-heading" style={{ fontSize: "clamp(30px, 5vw, 60px)", color: "var(--lg-ink)", fontWeight: 300 }}>
                El mercado del oro, explicado.
              </h2>
            </div>
            <Link href="/catalogo/blog" className="lg-label"
              style={{ fontSize: "9px", letterSpacing: "0.28em", color: "var(--lg-ink-soft)", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
              Ver todos →
            </Link>
          </div>
          <div data-lg-reveal data-lg-stagger className="grid gap-4 sm:grid-cols-3">
            {latestPosts.map((post) => (
              <Link key={post.slug} href={`/catalogo/blog/${post.slug}`} style={{ textDecoration: "none", display: "block" }}>
                <article className="lg-card group flex h-full flex-col rounded-2xl p-7"
                  style={{ background: "var(--lg-surface)", border: "1px solid var(--lg-ink-faint)", transition: "border-color 0.35s var(--lg-spring), box-shadow 0.35s var(--lg-spring), transform 0.45s var(--lg-spring)" }}>
                  <span className="lg-label mb-5 inline-block w-fit rounded-full px-3 py-1"
                    style={{ fontSize: "8px", letterSpacing: "0.28em", background: "rgba(200,161,100,0.08)", border: "1px solid var(--lg-gold-line)", color: "var(--lg-gold-deep)" }}>
                    {post.category}
                  </span>
                  <h3 className="lg-heading flex-1"
                    style={{ fontSize: "clamp(17px, 1.9vw, 21px)", color: "var(--lg-ink)", fontWeight: 400, lineHeight: 1.24 }}>
                    {post.title}
                  </h3>
                  <div className="mt-6 flex items-center gap-3">
                    <span className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.12em", color: "var(--lg-ink-dim)" }}>{fmtDate(post.date)}</span>
                    <div className="h-px flex-1" style={{ background: "var(--lg-ink-faint)" }} />
                    <span style={{ color: "var(--lg-gold-deep)", fontSize: "12px" }}>→</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FAQ (claro)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="px-6 sm:px-14"
        style={{ paddingTop: "clamp(80px, 12vw, 130px)", paddingBottom: "clamp(80px, 12vw, 130px)", background: "var(--lg-paper)" }}>
        <div className="mx-auto max-w-3xl">
          <div data-lg-reveal className="mb-12">
            <div className="mb-5"><Eyebrow>Preguntas frecuentes</Eyebrow></div>
            <h2 className="lg-display" style={{ fontSize: "clamp(34px, 6vw, 72px)", color: "var(--lg-ink)", fontWeight: 300, maxWidth: "16ch" }}>
              Lo que conviene saber.
            </h2>
          </div>

          <div data-lg-reveal style={{ borderBottom: "1px solid var(--lg-ink-faint)" }}>
            {faqItems.map((item, i) => (
              <FaqItem key={i} q={item.q} defaultOpen={i === 0}>
                {item.a}
              </FaqItem>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CONTACTO (claro)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="contacto" className="px-6 sm:px-14"
        style={{ paddingTop: "clamp(80px, 12vw, 130px)", paddingBottom: "clamp(80px, 12vw, 130px)", background: "var(--lg-paper-deep)", borderTop: "1px solid var(--lg-ink-faint)" }}>
        <div className="mx-auto max-w-7xl">
          <div data-lg-reveal className="mb-14">
            <div className="mb-5"><Eyebrow>Contacto</Eyebrow></div>
            <h2 className="lg-display" style={{ fontSize: "clamp(34px, 6vw, 78px)", color: "var(--lg-ink)", fontWeight: 300, maxWidth: "16ch" }}>
              Acceso privado, con cita previa.
            </h2>
          </div>

          <div data-lg-reveal data-lg-stagger className="grid gap-4 sm:grid-cols-3">
            <ContactCard href="mailto:info@lingot.com" label="Email" value="info@lingot.com" icon="mail" />
            <ContactCard href="tel:+34669393197" label="Teléfono" value="669 39 31 97" icon="phone" />
            <ContactCard label="Atención" value="Solo con cita previa" sub="Santa Cruz de Tenerife" icon="clock" />
          </div>
        </div>
      </section>

      {/* FOOTER (oscuro) — bookend de la bóveda */}
      <CatalogFooter />
    </div>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────────────
function FaqP({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "clamp(14px, 1.5vw, 16px)", lineHeight: 1.72, color: "var(--lg-ink-soft)", fontWeight: 400 }}>
      {children}
    </p>
  );
}

function FaqList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: "14px 0", display: "flex", flexDirection: "column", gap: "11px" }}>
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-3"
          style={{ fontSize: "clamp(14px, 1.5vw, 16px)", lineHeight: 1.6, color: "var(--lg-ink-soft)" }}>
          <span aria-hidden style={{ marginTop: "9px", flexShrink: 0, width: "5px", height: "5px", borderRadius: "9999px", background: "var(--lg-gold)" }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function FaqItem({ q, children, defaultOpen = false }: { q: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: "1px solid var(--lg-ink-faint)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="lg-faq-q flex w-full items-center justify-between gap-6 text-left"
        style={{ padding: "clamp(20px, 3vw, 28px) 0", background: "none", border: "none", cursor: "pointer" }}
      >
        <span className="lg-heading" style={{ fontSize: "clamp(16px, 2.1vw, 22px)", color: "var(--lg-ink)", fontWeight: 400, lineHeight: 1.3, transition: "color 0.3s var(--lg-spring)" }}>
          {q}
        </span>
        <span aria-hidden className="flex flex-shrink-0 items-center justify-center"
          style={{ width: "38px", height: "38px", borderRadius: "9999px", border: "1px solid var(--lg-gold-line)", background: "rgba(200,161,100,0.05)" }}>
          <span className="relative" style={{ width: "14px", height: "14px" }}>
            <span style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: "1.4px", background: "var(--lg-gold-deep)", transform: "translateY(-50%)" }} />
            <span style={{ position: "absolute", left: "50%", top: 0, width: "1.4px", height: "100%", background: "var(--lg-gold-deep)", transform: `translateX(-50%) scaleY(${open ? 0 : 1})`, transformOrigin: "center", transition: "transform 0.4s var(--lg-spring)" }} />
          </span>
        </span>
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 0.5s var(--lg-expo)" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ paddingBottom: "clamp(24px, 3.4vw, 34px)", maxWidth: "60ch", display: "flex", flexDirection: "column", gap: "2px" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Contact card ──────────────────────────────────────────────────────────────
function ContactCard({
  href, label, value, sub, icon,
}: { href?: string; label: string; value: string; sub?: string; icon: "mail" | "phone" | "clock" }) {
  const inner = (
    <div className="lg-card flex h-full flex-col rounded-2xl p-8"
      style={{ background: "var(--lg-surface)", border: "1px solid var(--lg-ink-faint)", transition: "border-color 0.35s var(--lg-spring), box-shadow 0.35s var(--lg-spring), transform 0.45s var(--lg-spring)" }}>
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: "rgba(200,161,100,0.08)", border: "1px solid var(--lg-gold-line)" }}>
        <Icon name={icon} />
      </div>
      <div className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.32em", color: "var(--lg-ink-dim)", marginBottom: "8px" }}>{label}</div>
      <div className="lg-heading" style={{ fontSize: "clamp(15px, 1.6vw, 18px)", color: "var(--lg-ink)", fontWeight: 400 }}>{value}</div>
      {sub && <div className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "var(--lg-ink-dim)", marginTop: "6px" }}>{sub}</div>}
    </div>
  );
  if (href) return <a href={href} style={{ textDecoration: "none", display: "block", height: "100%" }}>{inner}</a>;
  return <div style={{ height: "100%" }}>{inner}</div>;
}

function Icon({ name }: { name: "mail" | "phone" | "clock" }) {
  const s = { stroke: "var(--lg-gold-deep)", strokeWidth: 1.3, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "mail") return (
    <svg width="17" height="17" viewBox="0 0 16 16" aria-hidden>
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" {...s} />
      <polyline points="1.8,4.2 8,9 14.2,4.2" {...s} />
    </svg>
  );
  if (name === "phone") return (
    <svg width="17" height="17" viewBox="0 0 16 16" aria-hidden>
      <path d="M3 2.5C3 2.22 3.22 2 3.5 2H5.5C5.74 2 5.95 2.16 6.01 2.39L6.76 5.14C6.82 5.36 6.73 5.59 6.54 5.72L5.3 6.56C6.06 8.24 7.42 9.6 9.1 10.36L9.94 9.12C10.07 8.93 10.3 8.84 10.52 8.9L13.27 9.65C13.5 9.71 13.66 9.92 13.66 10.16V12.16C13.66 12.44 13.44 12.66 13.16 12.66C7.35 12.66 2.66 7.97 2.66 2.16Z" {...s} />
    </svg>
  );
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="5.5" {...s} />
      <polyline points="8,5 8,8 10.5,9.5" {...s} />
    </svg>
  );
}
