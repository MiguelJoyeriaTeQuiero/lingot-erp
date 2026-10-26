import type { Metadata } from "next";
import Link from "next/link";
import { CatalogFooter } from "../catalog-footer";

export const metadata: Metadata = {
  title: "Quiénes somos · Lingot — Metales Preciosos",
  description:
    "Conoce a Lingot: especialistas en metales preciosos de alta pureza. Nuestra filosofía, valores y compromiso con la calidad verificable.",
  openGraph: {
    title: "Quiénes somos · Lingot",
    description: "Especialistas en metales preciosos de alta pureza. Oro y plata certificados.",
    images: ["/og-nosotros.jpg"],
  },
};

const VALUES = [
  { number: "01", title: "Pureza verificable", body: "Cada pieza que comercializamos lleva su certificado de pureza. No vendemos promesas, vendemos hechos medibles con instrumentos de análisis." },
  { number: "02", title: "Precio transparente", body: "Nuestras tarifas se calculan en tiempo real sobre el precio spot de mercado. Sin márgenes ocultos, sin sorpresas en factura." },
  { number: "03", title: "Custodia responsable", body: "Conocemos la cadena de custodia de cada lote. Trabajamos únicamente con refinerías y distribuidores certificados por la LBMA." },
  { number: "04", title: "Discreción absoluta", body: "La privacidad financiera de nuestros clientes es un principio, no una política. Cada operación se trata con la máxima confidencialidad." },
];

export default function NosotrosPage() {
  return (
    <div className="lg-scope" style={{ background: "var(--lg-paper)", minHeight: "100dvh" }}>
      <div aria-hidden className="lg-grain" />

      {/* ── Hero bóveda ─────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden px-6 sm:px-14"
        style={{ background: "radial-gradient(120% 100% at 78% 0%, #0f4a5c 0%, #0a3746 46%, #06272f 100%)", paddingTop: "clamp(140px, 20vw, 210px)", paddingBottom: "clamp(90px, 13vw, 140px)" }}>
        <div aria-hidden className="pointer-events-none absolute select-none"
          style={{ right: "-2vw", top: "-4vh", fontSize: "clamp(220px, 42vw, 560px)", fontWeight: 300, lineHeight: 0.82, color: "rgba(238,242,244,0.03)", letterSpacing: "-0.06em" }}>N</div>

        <div className="relative mx-auto max-w-5xl" style={{ zIndex: 2 }}>
          <div data-lg-reveal className="mb-7 inline-flex items-center rounded-full px-4 py-1.5"
            style={{ background: "rgba(238,242,244,0.05)", border: "1px solid rgba(238,242,244,0.14)" }}>
            <span className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.42em", color: "rgba(228,200,143,0.72)" }}>Quiénes somos</span>
          </div>
          <h1 data-lg-reveal className="lg-display" style={{ fontSize: "clamp(42px, 8vw, 104px)", color: "var(--lg-light)", fontWeight: 300, maxWidth: "15ch", marginTop: "14px" }}>
            El metal sin la retórica.
          </h1>
          <p data-lg-reveal style={{ marginTop: "30px", fontSize: "clamp(15px, 2vw, 20px)", color: "var(--lg-light-soft)", maxWidth: "52ch", lineHeight: 1.65 }}>
            En Lingot creemos que la inversión en metales preciosos merece la misma claridad que exige cualquier otra decisión financiera seria. Sin mitología, sin opacidad.
          </p>
        </div>
      </header>

      {/* ── Historia ────────────────────────────────────────────────────── */}
      <section className="px-6 sm:px-14" style={{ paddingTop: "clamp(80px, 12vw, 130px)", paddingBottom: "clamp(80px, 12vw, 130px)" }}>
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
            <div data-lg-reveal className="flex flex-col justify-center">
              <div className="mb-8 h-px w-12" style={{ background: "linear-gradient(to right, var(--lg-gold), transparent)" }} />
              <blockquote className="lg-heading" style={{ fontSize: "clamp(21px, 3vw, 32px)", color: "var(--lg-ink)", fontWeight: 300, lineHeight: 1.4, letterSpacing: "-0.01em" }}>
                El valor del oro no está en su brillo. Está en su resistencia a todo lo que intenta erosionarlo.
              </blockquote>
              <p className="lg-label mt-7" style={{ fontSize: "9px", letterSpacing: "0.38em", color: "var(--lg-gold-deep)" }}>Filosofía Lingot</p>
            </div>

            <div data-lg-reveal className="flex flex-col gap-6" style={{ color: "var(--lg-ink-soft)", fontSize: "15px", lineHeight: 1.78 }}>
              <p>Lingot nació de una premisa sencilla: el mercado de metales preciosos lleva décadas rodeado de una opacidad innecesaria que favorece a los intermediarios a expensas del comprador final.</p>
              <p>Somos especialistas en oro y plata de alta pureza — lingotes, monedas de inversión y productos certificados — dirigidos tanto a inversores profesionales como a particulares que buscan preservar su patrimonio fuera del sistema financiero convencional.</p>
              <p>Trabajamos exclusivamente con metales trazables, con cadena de custodia documentada desde la refinería hasta el cliente. La transparencia en el precio es otro principio irrenunciable: nuestras tarifas reflejan en tiempo real el precio spot de los mercados internacionales.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Imagen full-bleed ───────────────────────────────────────────── */}
      <div data-lg-reveal className="relative overflow-hidden" style={{ height: "clamp(280px, 46vw, 540px)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1600&q=80"
          alt="Lingotes de oro de alta pureza"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block", filter: "saturate(0.85) brightness(0.7) contrast(1.05)" }} />
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(10,55,70,0.34)", mixBlendMode: "multiply" }} />
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, var(--lg-paper) 0%, transparent 22%, transparent 78%, var(--lg-paper) 100%)" }} />
      </div>

      {/* ── Principios ──────────────────────────────────────────────────── */}
      <section className="px-6 sm:px-14" style={{ paddingTop: "clamp(80px, 12vw, 130px)", paddingBottom: "clamp(80px, 12vw, 130px)", background: "var(--lg-paper)" }}>
        <div className="mx-auto max-w-5xl">
          <div data-lg-reveal className="mb-16 flex items-center gap-5">
            <div className="h-px w-[60px]" style={{ background: "linear-gradient(to right, var(--lg-gold), transparent)" }} />
            <span className="lg-label" style={{ fontSize: "10px", letterSpacing: "0.42em", color: "var(--lg-gold-deep)" }}>Nuestros principios</span>
          </div>

          <div data-lg-reveal data-lg-stagger className="grid gap-4 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.number} className="lg-card flex flex-col rounded-2xl p-9"
                style={{ background: "var(--lg-surface)", border: "1px solid var(--lg-ink-faint)", transition: "border-color 0.35s var(--lg-spring), box-shadow 0.35s var(--lg-spring), transform 0.45s var(--lg-spring)" }}>
                <span className="lg-num" style={{ fontSize: "12px", color: "var(--lg-gold-deep)", letterSpacing: "0.28em", marginBottom: "18px" }}>{v.number}</span>
                <h3 className="lg-heading" style={{ fontSize: "clamp(19px, 2.2vw, 24px)", color: "var(--lg-ink)", fontWeight: 400, marginBottom: "12px", lineHeight: 1.2 }}>{v.title}</h3>
                <p style={{ fontSize: "14px", color: "var(--lg-ink-soft)", lineHeight: 1.72 }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA (bóveda) ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 text-center"
        style={{ background: "var(--lg-vault)", paddingTop: "clamp(90px, 13vw, 150px)", paddingBottom: "clamp(90px, 13vw, 150px)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(200,161,100,0.08), transparent 60%)" }} />
        <div className="relative mx-auto max-w-2xl" style={{ zIndex: 2 }}>
          <p data-lg-reveal className="lg-display" style={{ fontSize: "clamp(26px, 5vw, 52px)", color: "var(--lg-light)", fontWeight: 300, lineHeight: 1.15, marginBottom: "40px" }}>
            El metal sin intermediarios.<br />
            <span style={{ color: "rgba(228,200,143,0.85)" }}>Directo, verificable, tuyo.</span>
          </p>
          <div data-lg-reveal>
            <Link href="/catalogo" className="lg-btn lg-label inline-flex items-center gap-3"
              style={{ padding: "15px 20px 15px 26px", borderRadius: "99px", background: "var(--lg-gold)", color: "var(--lg-vault-deep)", fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", textDecoration: "none", boxShadow: "0 10px 30px -10px rgba(200,161,100,0.5)" }}>
              <span>Ver la colección</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-[12px]" style={{ background: "rgba(6,39,47,0.16)" }}>↗</span>
            </Link>
          </div>
        </div>
      </section>

      <CatalogFooter compact />
    </div>
  );
}
