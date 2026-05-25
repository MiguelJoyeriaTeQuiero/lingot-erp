import type { Metadata } from "next";
import Link from "next/link";

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

const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

const VALUES = [
  {
    number: "01",
    title: "Pureza verificable",
    body: "Cada pieza que comercializamos lleva su certificado de pureza. No vendemos promesas, vendemos hechos medibles con instrumentos de análisis.",
  },
  {
    number: "02",
    title: "Precio transparente",
    body: "Nuestras tarifas se calculan en tiempo real sobre el precio spot de mercado. Sin márgenes ocultos, sin sorpresas en factura.",
  },
  {
    number: "03",
    title: "Custodia responsable",
    body: "Conocemos la cadena de custodia de cada lote. Trabajamos únicamente con refinerías y distribuidores certificados por la LBMA.",
  },
  {
    number: "04",
    title: "Discreción absoluta",
    body: "La privacidad financiera de nuestros clientes es un principio, no una política. Cada operación se trata con la máxima confidencialidad.",
  },
];

export default function NosotrosPage() {
  return (
    <div style={{ background: "#F9F4EC", minHeight: "100dvh" }}>

      {/* ── Film grain ────────────────────────────────────────────────── */}
      <div aria-hidden className="catalog-grain-overlay" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <header
        className="relative overflow-hidden px-6"
        style={{
          background: "linear-gradient(175deg, #EDE5D4 0%, #F4EDE0 50%, #F9F4EC 100%)",
          paddingTop: "clamp(120px, 18vw, 180px)",
          paddingBottom: "clamp(80px, 12vw, 120px)",
        }}
      >
        {/* Decorative number */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 select-none"
          style={{
            fontFamily:  "var(--font-catalog-serif, Georgia, serif)",
            fontSize:    "clamp(200px, 40vw, 500px)",
            fontWeight:  300,
            lineHeight:  0.85,
            color:       "rgba(10,31,43,0.03)",
            letterSpacing: "-0.06em",
            userSelect:  "none",
          }}
        >
          N
        </div>

        <div className="relative mx-auto max-w-5xl" style={{ zIndex: 2 }}>
          {/* Eyebrow */}
          <div
            className="data-reveal mb-6 inline-flex items-center rounded-full px-4 py-1.5"
            data-reveal
            style={{
              background: "rgba(10,31,43,0.05)",
              border:     "1px solid rgba(10,31,43,0.12)",
            }}
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.42em]"
              style={{ color: "rgba(10,31,43,0.40)" }}>
              Quiénes somos
            </span>
          </div>

          <h1
            data-reveal
            className="font-serif font-light italic"
            style={{
              fontSize:      "clamp(40px, 7vw, 88px)",
              color:         "#0a1f2b",
              lineHeight:    1.05,
              letterSpacing: "-0.02em",
              maxWidth:      "14ch",
              marginTop:     "16px",
            }}
          >
            El metal sin la retórica
          </h1>

          <p
            data-reveal
            style={{
              marginTop:  "28px",
              fontSize:   "clamp(15px, 2vw, 19px)",
              color:      "rgba(10,31,43,0.52)",
              maxWidth:   "50ch",
              lineHeight: 1.65,
            }}
          >
            En Lingot creemos que la inversión en metales preciosos merece la misma claridad
            que exige cualquier otra decisión financiera seria. Sin mitología, sin opacidad.
          </p>
        </div>
      </header>

      {/* ── Story section ─────────────────────────────────────────────── */}
      <section
        data-reveal
        className="px-6"
        style={{
          paddingTop: "clamp(80px, 12vw, 120px)",
          paddingBottom: "clamp(80px, 12vw, 120px)",
          borderBottom: "1px solid rgba(10,31,43,0.07)",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">

            {/* Left: quote */}
            <div className="flex flex-col justify-center">
              <div
                className="h-px w-12 mb-8"
                style={{ background: "linear-gradient(to right, rgba(154,114,48,0.60), transparent)" }}
              />
              <blockquote
                className="font-serif italic"
                style={{
                  fontSize:      "clamp(20px, 3vw, 30px)",
                  color:         "rgba(10,31,43,0.70)",
                  lineHeight:    1.45,
                  letterSpacing: "0.01em",
                }}
              >
                "El valor del oro no está en su brillo.
                Está en su resistencia a todo lo que intenta
                erosionarlo."
              </blockquote>
              <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.38em]"
                style={{ color: "rgba(154,114,48,0.55)" }}>
                Filosofía Lingot
              </p>
            </div>

            {/* Right: text */}
            <div className="flex flex-col gap-6" style={{ color: "rgba(10,31,43,0.58)", fontSize: "15px", lineHeight: 1.75 }}>
              <p>
                Lingot nació de una premisa sencilla: el mercado de metales preciosos lleva décadas
                rodeado de una opacidad innecesaria que favorece a los intermediarios a expensas
                del comprador final.
              </p>
              <p>
                Somos especialistas en oro y plata de alta pureza — lingotes, monedas de inversión
                y productos certificados — dirigidos tanto a inversores profesionales como a
                particulares que buscan preservar su patrimonio fuera del sistema financiero
                convencional.
              </p>
              <p>
                Trabajamos exclusivamente con metales trazables, con cadena de custodia documentada
                desde la refinería hasta el cliente. La transparencia en el precio es otro principio
                irrenunciable: nuestras tarifas reflejan en tiempo real el precio spot de los
                mercados internacionales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Image full-bleed ──────────────────────────────────────────── */}
      <div
        data-reveal
        className="relative overflow-hidden"
        style={{ height: "clamp(260px, 45vw, 520px)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1600&q=80"
          alt="Lingotes de oro de alta pureza"
          style={{
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center", display: "block",
            filter: "sepia(0.38) saturate(0.78) brightness(0.84) contrast(1.04)",
          }}
        />
        {/* Parchment tint */}
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          background: "rgba(232, 218, 190, 0.42)",
          mixBlendMode: "multiply",
        }} />
        {/* Top/bottom fade */}
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, #F9F4EC 0%, transparent 20%, transparent 80%, #F9F4EC 100%)",
        }} />
        {/* Side vignette */}
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, rgba(10,31,43,0.16) 0%, transparent 28%, transparent 72%, rgba(10,31,43,0.12) 100%)",
          mixBlendMode: "multiply",
        }} />
      </div>

      {/* ── Values ────────────────────────────────────────────────────── */}
      <section
        className="px-6"
        style={{
          paddingTop:    "clamp(80px, 12vw, 120px)",
          paddingBottom: "clamp(80px, 12vw, 120px)",
          borderBottom:  "1px solid rgba(10,31,43,0.07)",
          background:    "#F9F4EC",
        }}
      >
        <div className="mx-auto max-w-5xl">
          {/* Section label */}
          <div className="mb-16 flex items-center gap-5" data-reveal>
            <div className="h-px flex-1 max-w-[60px]"
              style={{ background: "linear-gradient(to right, rgba(154,114,48,0.40), transparent)" }} />
            <span className="font-mono text-[9px] uppercase tracking-[0.42em]"
              style={{ color: "rgba(154,114,48,0.60)" }}>
              Nuestros principios
            </span>
          </div>

          <div className="grid gap-12 sm:grid-cols-2 lg:gap-16">
            {VALUES.map((v) => (
              <div key={v.number} data-reveal className="group">
                {/* Double-Bezel value card */}
                <div
                  style={{
                    padding:      "3px",
                    borderRadius: "24px",
                    background:   "rgba(154,114,48,0.03)",
                    border:       "1px solid rgba(154,114,48,0.12)",
                  }}
                >
                  <div
                    style={{
                      borderRadius: "21px",
                      background:   "#FFFFFF",
                      boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
                      padding:      "32px",
                    }}
                  >
                    <span
                      className="font-mono"
                      style={{
                        display:       "block",
                        fontSize:      "11px",
                        color:         "rgba(154,114,48,0.45)",
                        letterSpacing: "0.28em",
                        marginBottom:  "16px",
                      }}
                    >
                      {v.number}
                    </span>
                    <h3
                      className="font-serif font-light"
                      style={{
                        fontSize:     "clamp(18px, 2.2vw, 22px)",
                        color:        "#0a1f2b",
                        marginBottom: "12px",
                        lineHeight:   1.2,
                      }}
                    >
                      {v.title}
                    </h3>
                    <p
                      style={{
                        fontSize:   "14px",
                        color:      "rgba(10,31,43,0.55)",
                        lineHeight: 1.70,
                      }}
                    >
                      {v.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ─────────────────────────────────────────────────── */}
      <section
        data-reveal
        className="relative overflow-hidden px-6 py-24 text-center"
        style={{ background: "#EDE5D4" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 55% 70% at 50% 100%, rgba(154,114,48,0.08), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-xl" style={{ zIndex: 2 }}>
          <p
            className="font-serif italic"
            style={{
              fontSize:   "clamp(20px, 3.5vw, 32px)",
              color:      "rgba(10,31,43,0.65)",
              lineHeight: 1.4,
              marginBottom: "32px",
            }}
          >
            El metal sin intermediarios.<br />
            <span style={{ color: "rgba(154,114,48,0.70)" }}>Directo, verificable, tuyo.</span>
          </p>

          {/* Button-in-Button CTA */}
          <Link
            href="/catalogo"
            className="cta-btn-dark"
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              gap:           "12px",
              padding:       "14px 20px 14px 24px",
              borderRadius:  "99px",
              color:         "rgba(249,244,236,0.88)",
              fontFamily:    "monospace",
              fontSize:      "10px",
              textTransform: "uppercase",
              letterSpacing: "0.28em",
              textDecoration: "none",
              boxShadow:     "0 4px 20px -4px rgba(10,31,43,0.22)",
            }}
          >
            <span>Ver la colección</span>
            <span
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                width:          "24px",
                height:         "24px",
                borderRadius:   "99px",
                background:     "rgba(249,244,236,0.12)",
                fontSize:       "12px",
              }}
            >
              ↗
            </span>
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer
        className="px-6 py-16 text-center"
        style={{ background: "#EDE5D4", borderTop: "1px solid rgba(10,31,43,0.06)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-px w-12"
            style={{ background: "linear-gradient(to right, transparent, rgba(154,114,48,0.35), transparent)" }} />
          <p className="font-serif italic text-[14px]"
            style={{ color: "rgba(154,114,48,0.45)" }}>Lingot</p>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              { href: "/catalogo",          label: "Inicio"    },
              { href: "/catalogo/nosotros", label: "Nosotros"  },
              { href: "/catalogo/blog",     label: "Blog"      },
              { href: "/catalogo/mi-cuenta",label: "Mi cuenta" },
            ].map((l) => (
              <Link key={l.href} href={l.href}
                className="font-mono text-[9px] uppercase tracking-[0.28em]"
                style={{ color: "rgba(10,31,43,0.28)", textDecoration: "none" }}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
