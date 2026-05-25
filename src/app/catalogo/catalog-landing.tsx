"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { CatalogHeroWebGL } from "./catalog-hero-webgl";
import { CatalogGrid, type CatalogProduct } from "./catalog-grid";
import { CatalogLoginButton } from "./catalog-login";
import { CatalogScrollTransition } from "./catalog-scroll-transition";
import type { BlogPost } from "./blog/data";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  goldSpot:       number | null;
  silverSpot:     number | null;
  products:       CatalogProduct[];
  brandName:      string;
  year:           number;
  goldCount:      number;
  silverCount:    number;
  latestPosts:    BlogPost[];
  isLoggedIn:     boolean;
  isWholesale:    boolean;
  isAdmin:        boolean;
  catalogEnabled: boolean;
  userName:       string;
}

// ── Custom cursor ─────────────────────────────────────────────────────────────

function CustomCursor() {
  const dotRef   = useRef<HTMLDivElement>(null);
  const ringRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let dx = 0, dy = 0, rx = 0, ry = 0, raf = 0, visible = false;

    const onMove = (e: MouseEvent) => {
      dx = e.clientX;
      dy = e.clientY;
      if (!visible) {
        visible = true;
        if (dotRef.current)  dotRef.current.style.opacity  = "1";
        if (ringRef.current) ringRef.current.style.opacity = "1";
      }
    };

    const tick = () => {
      rx += (dx - rx) * 0.09;
      ry += (dy - ry) * 0.09;
      if (dotRef.current)  dotRef.current.style.transform  = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Inner dot */}
      <div
        ref={dotRef}
        aria-hidden
        style={{
          position:      "fixed",
          top:           0,
          left:          0,
          width:         "6px",
          height:        "6px",
          borderRadius:  "99px",
          background:    "#0a1f2b",
          pointerEvents: "none",
          zIndex:        9999,
          opacity:       0,
          mixBlendMode:  "multiply",
          willChange:    "transform",
        }}
      />
      {/* Outer ring */}
      <div
        ref={ringRef}
        aria-hidden
        style={{
          position:      "fixed",
          top:           0,
          left:          0,
          width:         "32px",
          height:        "32px",
          borderRadius:  "99px",
          border:        "1px solid rgba(154,114,48,0.45)",
          pointerEvents: "none",
          zIndex:        9998,
          opacity:       0,
          willChange:    "transform",
        }}
      />
    </>
  );
}

// ── Hero line (CSS-animation slide-up — no React state needed) ───────────────

function HeroLine({
  children,
  delay,
  indent = false,
}: {
  children: React.ReactNode;
  delay: number;
  indent?: boolean;
}) {
  return (
    <div style={{ overflow: "hidden" }}>
      <div
        style={{
          paddingLeft: indent ? "clamp(32px, 6vw, 100px)" : undefined,
          animation:   `hero-line-in 1.10s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CatalogLanding({
  goldSpot, silverSpot, products, brandName, year,
  goldCount, silverCount, latestPosts,
  isLoggedIn, isWholesale, isAdmin, catalogEnabled, userName,
}: Props) {

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
  }

  return (
    <div style={{ background: "#F9F4EC" }}>
      <CustomCursor />

      {/* Film grain */}
      <div aria-hidden className="catalog-grain-overlay" />

      {/* Admin banner */}
      {isAdmin && !catalogEnabled && (
        <div className="relative z-50 px-6 py-2.5 text-center"
          style={{ background: "rgba(154,114,48,0.08)", borderBottom: "1px solid rgba(154,114,48,0.18)" }}>
          <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: "#9a7230" }}>
            Vista previa · El catálogo no está publicado
          </span>
        </div>
      )}

      {/* Floating login */}
      <div className="fixed right-5 top-5 z-50">
        <CatalogLoginButton isLoggedIn={isLoggedIn} isWholesale={isWholesale} userName={userName} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — cinematic editorial reveal
      ══════════════════════════════════════════════════════════════════ */}
      <header
        className="relative flex min-h-[100dvh] flex-col overflow-hidden"
        style={{ background: "linear-gradient(160deg, #E8DEC8 0%, #F0E7D5 40%, #F9F4EC 100%)" }}
      >
        <CatalogHeroWebGL />
        <CatalogScrollTransition />
        <div aria-hidden className="catalog-scan-line-light pointer-events-none absolute inset-x-0" style={{ height: "1px", zIndex: 3 }} />

        {/* Top bar — padding-top clears the 58px fixed nav */}
        <div
          className="relative flex items-center justify-between px-8 sm:px-14"
          style={{
            paddingTop: "clamp(74px, 9vh, 90px)",
            zIndex:     5,
            animation:  "hero-fade-down 0.70s cubic-bezier(0.16,1,0.3,1) 60ms both",
          }}
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.40em]"
            style={{ color: "rgba(10,31,43,0.25)" }}>
            {brandName}
          </span>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.40em] sm:block"
            style={{ color: "rgba(10,31,43,0.18)" }}>
            Oro · Plata · {year}
          </span>
        </div>

        {/* ── Main hero body: flex split ─────────────────────────────── */}
        <div
          id="hero-content"
          className="relative flex flex-1 items-center px-8 pb-24 pt-6 sm:px-14"
          style={{ zIndex: 5, gap: "clamp(32px, 5vw, 80px)" }}
        >
          {/* LEFT — typography */}
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <div style={{ marginBottom: "clamp(20px, 3vw, 40px)" }}>
              <HeroLine delay={180}>
                <span
                  className="font-serif font-light italic select-none"
                  style={{
                    fontSize:      "clamp(60px, 8.5vw, 130px)",
                    color:         "#0a1f2b",
                    letterSpacing: "-0.03em",
                    display:       "block",
                    whiteSpace:    "nowrap",
                  }}
                >
                  El metal
                </span>
              </HeroLine>
              <HeroLine delay={340} indent>
                <span
                  className="font-serif font-light italic select-none"
                  style={{
                    fontSize:      "clamp(60px, 8.5vw, 130px)",
                    color:         "#0a1f2b",
                    letterSpacing: "-0.03em",
                    display:       "block",
                    whiteSpace:    "nowrap",
                  }}
                >
                  sin ruido.
                </span>
              </HeroLine>
            </div>

            <div style={{ animation: "hero-fade-up 0.80s cubic-bezier(0.16,1,0.3,1) 600ms both" }}>
              <div className="mb-4 flex items-center gap-4" style={{ maxWidth: "min(300px, 70vw)" }}>
                <div className="gold-shimmer-light h-px flex-1" />
                <span className="font-mono text-[8px]" style={{ color: "rgba(154,114,48,0.35)" }}>✦</span>
                <div className="gold-shimmer-light h-px flex-1" style={{ animationDirection: "reverse" }} />
              </div>
              <p className="font-mono text-[9px] uppercase tracking-[0.40em]"
                style={{ color: "rgba(10,31,43,0.38)" }}>
                {products.length} {products.length === 1 ? "referencia" : "referencias"} · Oro · Plata
              </p>
            </div>
          </div>

          {/* RIGHT — live price card */}
          <div
            className="hidden lg:flex"
            style={{
              flex:           "0 0 auto",
              width:          "clamp(240px, 22vw, 320px)",
              justifyContent: "center",
              position:       "relative",
              animation:      "hero-card-in 1.0s cubic-bezier(0.16,1,0.3,1) 650ms both",
            }}
          >
            {/* Au watermark behind card */}
            <div
              aria-hidden
              style={{
                position:       "absolute",
                inset:          "-40px",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontFamily:     "var(--font-catalog-serif, Georgia, serif)",
                fontWeight:     300,
                fontStyle:      "italic",
                fontSize:       "clamp(160px, 20vw, 260px)",
                color:          "rgba(154,114,48,0.055)",
                userSelect:     "none",
                letterSpacing:  "-0.05em",
                lineHeight:     1,
                pointerEvents:  "none",
              }}
            >
              Au
            </div>

            {/* Double-Bezel price card */}
            <div
              style={{
                position:            "relative",
                zIndex:              2,
                padding:             "4px",
                borderRadius:        "28px",
                background:          "rgba(249,244,236,0.75)",
                border:              "1px solid rgba(154,114,48,0.18)",
                backdropFilter:      "blur(24px)",
                WebkitBackdropFilter:"blur(24px)",
                boxShadow:           "0 24px 64px -16px rgba(10,31,43,0.12), 0 4px 16px -4px rgba(154,114,48,0.10)",
                animation:           "heroFloat 6s ease-in-out infinite",
                width:               "100%",
              }}
            >
              <div
                style={{
                  borderRadius: "24px",
                  background:   "rgba(255,255,255,0.85)",
                  boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.95)",
                  padding:      "28px 24px",
                }}
              >
                {/* Header */}
                <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(10,31,43,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.38em", color: "rgba(10,31,43,0.30)", marginBottom: "3px" }}>
                      Precio spot
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.28em", color: "rgba(10,31,43,0.18)" }}>
                      En tiempo real
                    </div>
                  </div>
                  <span className="live-dot-light h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "#9a7230" }} />
                </div>

                {/* Gold row */}
                {goldSpot != null && (
                  <div style={{ marginBottom: "18px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                        <span style={{ fontFamily: "var(--font-catalog-serif, Georgia, serif)", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(26px, 2.6vw, 34px)", color: "rgba(154,114,48,0.82)", letterSpacing: "-0.03em", lineHeight: 1 }}>Au</span>
                        <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(154,114,48,0.42)", letterSpacing: "0.12em" }}>79</span>
                      </div>
                      <span style={{ fontFamily: "monospace", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(10,31,43,0.25)" }}>Oro</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-catalog-serif, Georgia, serif)", fontWeight: 300, fontSize: "clamp(20px, 2.2vw, 30px)", color: "#0a1f2b", letterSpacing: "-0.03em", lineHeight: 1 }}>
                      {formatCurrency(goldSpot)}
                      <span style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(10,31,43,0.28)", marginLeft: "3px" }}>/g</span>
                    </div>
                  </div>
                )}

                {goldSpot != null && silverSpot != null && (
                  <div style={{ height: "1px", background: "linear-gradient(to right, rgba(154,114,48,0.14), transparent)", marginBottom: "18px" }} />
                )}

                {/* Silver row */}
                {silverSpot != null && (
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                        <span style={{ fontFamily: "var(--font-catalog-serif, Georgia, serif)", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(26px, 2.6vw, 34px)", color: "rgba(42,96,112,0.65)", letterSpacing: "-0.03em", lineHeight: 1 }}>Ag</span>
                        <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(42,96,112,0.36)", letterSpacing: "0.12em" }}>47</span>
                      </div>
                      <span style={{ fontFamily: "monospace", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(10,31,43,0.25)" }}>Plata</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-catalog-serif, Georgia, serif)", fontWeight: 300, fontSize: "clamp(20px, 2.2vw, 30px)", color: "#0a1f2b", letterSpacing: "-0.03em", lineHeight: 1 }}>
                      {formatCurrency(silverSpot)}
                      <span style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(10,31,43,0.28)", marginLeft: "3px" }}>/g</span>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid rgba(10,31,43,0.05)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <div className="live-dot-light h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "#9a7230" }} />
                  <span style={{ fontFamily: "monospace", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.28em", color: "rgba(10,31,43,0.22)" }}>
                    Mercado LBMA
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar: prices + scroll */}
        <div
          className="relative flex items-end justify-between gap-4 flex-wrap px-8 pb-10 sm:px-14"
          style={{
            zIndex:    5,
            animation: "hero-fade-up 0.80s cubic-bezier(0.16,1,0.3,1) 850ms both",
          }}
        >
          {/* Price pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            {goldSpot != null && (
              <div style={{ padding: "3px", borderRadius: "99px", background: "rgba(154,114,48,0.06)", border: "1px solid rgba(154,114,48,0.20)" }}>
                <div className="flex items-center gap-3 px-5 py-2.5"
                  style={{ borderRadius: "99px", background: "rgba(255,255,255,0.60)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.80)" }}>
                  <span className="live-dot-light h-1.5 w-1.5 rounded-full" style={{ background: "#9a7230" }} />
                  <span className="font-mono text-[8px] uppercase tracking-[0.38em]" style={{ color: "rgba(154,114,48,0.80)" }}>Oro</span>
                  <div className="h-3 w-px" style={{ background: "rgba(10,31,43,0.10)" }} />
                  <span style={{ fontFamily: "var(--font-catalog-serif, Georgia, serif)", fontSize: "19px", lineHeight: 1, letterSpacing: "-0.03em", color: "#0a1f2b" }}>
                    {formatCurrency(goldSpot)}
                    <span className="font-mono" style={{ fontSize: "8px", color: "rgba(10,31,43,0.30)", marginLeft: "3px" }}>/g</span>
                  </span>
                </div>
              </div>
            )}
            {silverSpot != null && (
              <div style={{ padding: "3px", borderRadius: "99px", background: "rgba(42,96,112,0.05)", border: "1px solid rgba(42,96,112,0.16)" }}>
                <div className="flex items-center gap-3 px-5 py-2.5"
                  style={{ borderRadius: "99px", background: "rgba(255,255,255,0.60)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.80)" }}>
                  <span className="live-dot-light h-1.5 w-1.5 rounded-full" style={{ background: "#2a6070", animationDelay: "0.8s" }} />
                  <span className="font-mono text-[8px] uppercase tracking-[0.38em]" style={{ color: "rgba(42,96,112,0.70)" }}>Plata</span>
                  <div className="h-3 w-px" style={{ background: "rgba(10,31,43,0.10)" }} />
                  <span style={{ fontFamily: "var(--font-catalog-serif, Georgia, serif)", fontSize: "19px", lineHeight: 1, letterSpacing: "-0.03em", color: "#0a1f2b" }}>
                    {formatCurrency(silverSpot)}
                    <span className="font-mono" style={{ fontSize: "8px", color: "rgba(10,31,43,0.30)", marginLeft: "3px" }}>/g</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Scroll cue */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="catalog-scroll-cue"
              style={{ width: "1px", height: "42px", background: "linear-gradient(to bottom, transparent, rgba(154,114,48,0.45))" }} />
            <span className="font-mono text-[7px] uppercase tracking-[0.55em]"
              style={{ color: "rgba(10,31,43,0.22)" }}>Explorar</span>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          TICKER
      ══════════════════════════════════════════════════════════════════ */}
      {(goldSpot != null || silverSpot != null) && (
        <div className="overflow-hidden"
          style={{ background: "#0a1f2b", borderTop: "1px solid rgba(10,31,43,0.12)", borderBottom: "1px solid rgba(10,31,43,0.12)", padding: "9px 0" }}>
          <div className="ticker-track inline-flex whitespace-nowrap">
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i} className="inline-flex shrink-0 items-center gap-6 px-8 font-mono text-[8px] uppercase tracking-[0.32em]">
                {goldSpot   != null && <><span style={{ color: "rgba(184,144,58,0.80)" }}>Oro</span><span style={{ color: "rgba(255,255,255,0.35)" }}>{formatCurrency(goldSpot)} /g</span><span style={{ color: "rgba(184,144,58,0.22)" }}>✦</span></>}
                {silverSpot != null && <><span style={{ color: "rgba(140,195,210,0.65)" }}>Plata</span><span style={{ color: "rgba(255,255,255,0.35)" }}>{formatCurrency(silverSpot)} /g</span><span style={{ color: "rgba(184,144,58,0.22)" }}>✦</span></>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STATEMENT — dark, cinematic
      ══════════════════════════════════════════════════════════════════ */}
      <section
        data-reveal
        style={{
          background:  "#0a1f2b",
          padding:     "clamp(80px, 12vw, 140px) clamp(24px, 6vw, 80px)",
          position:    "relative",
          overflow:    "hidden",
        }}
      >
        {/* Watermark */}
        <div aria-hidden style={{
          position:      "absolute",
          right:         "-20px",
          bottom:        "-50px",
          fontFamily:    "var(--font-catalog-serif, Georgia, serif)",
          fontWeight:    300,
          fontStyle:     "italic",
          fontSize:      "clamp(180px, 36vw, 460px)",
          lineHeight:    0.8,
          color:         "rgba(255,255,255,0.022)",
          userSelect:    "none",
          pointerEvents: "none",
          letterSpacing: "-0.06em",
        }}>Au</div>

        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          {/* Quote */}
          <p style={{
            fontFamily:    "var(--font-catalog-serif, Georgia, serif)",
            fontWeight:    300,
            fontStyle:     "italic",
            fontSize:      "clamp(22px, 4vw, 54px)",
            color:         "rgba(249,244,236,0.82)",
            lineHeight:    1.30,
            letterSpacing: "-0.02em",
            maxWidth:      "24ch",
            marginBottom:  "clamp(40px, 6vw, 72px)",
          }}>
            "El valor del oro no está en su brillo. Está en su resistencia a todo lo que intenta erosionarlo."
          </p>

          {/* Stats strip */}
          <div className="flex flex-wrap gap-x-12 gap-y-8 lg:gap-x-20">
            {[
              { label: "Pureza máxima",    value: "999.9‰"           },
              { label: "Norma ref.",        value: "LBMA"             },
              { label: "Referencias",      value: `${products.length}`},
              ...(goldCount   > 0 ? [{ label: "Piezas oro",   value: `${goldCount}`   }] : []),
              ...(silverCount > 0 ? [{ label: "Piezas plata", value: `${silverCount}` }] : []),
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.32em", color: "rgba(184,144,58,0.50)", marginBottom: "6px" }}>
                  {s.label}
                </div>
                <div style={{
                  fontFamily:    "var(--font-catalog-serif, Georgia, serif)",
                  fontWeight:    300,
                  fontSize:      "clamp(26px, 3.2vw, 42px)",
                  color:         "rgba(249,244,236,0.82)",
                  letterSpacing: "-0.02em",
                  lineHeight:    1,
                }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FULL-BLEED IMAGE
      ══════════════════════════════════════════════════════════════════ */}
      <section data-reveal
        style={{ position: "relative", overflow: "hidden", height: "clamp(260px, 46vw, 560px)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1600&q=80"
          alt="Lingotes de oro de alta pureza certificados"
          style={{
            width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block",
            filter: "sepia(0.38) saturate(0.78) brightness(0.84) contrast(1.04)",
          }}
        />
        {/* Parchment tint — mix-blend-mode multiply warm-coats the photo */}
        <div aria-hidden style={{
          position:  "absolute", inset: 0,
          background: "rgba(232, 218, 190, 0.42)",
          mixBlendMode: "multiply",
        }} />
        {/* Top fade: melts into the section above */}
        <div aria-hidden style={{
          position:   "absolute", inset: 0,
          background: "linear-gradient(to bottom, #F4EDE0 0%, transparent 22%, transparent 78%, #F4EDE0 100%)",
        }} />
        {/* Side vignette for depth */}
        <div aria-hidden style={{
          position:   "absolute", inset: 0,
          background: "linear-gradient(to right, rgba(10,31,43,0.18) 0%, transparent 30%, transparent 70%, rgba(10,31,43,0.14) 100%)",
          mixBlendMode: "multiply",
        }} />
        {/* Caption pill */}
        <div style={{ position: "absolute", bottom: 0, left: 0, padding: "clamp(18px, 3vw, 36px)", zIndex: 2 }}>
          <div style={{ padding: "3px", borderRadius: "99px", background: "rgba(249,244,236,0.90)", border: "1px solid rgba(255,255,255,0.70)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex" }}>
            <div style={{ borderRadius: "99px", background: "rgba(255,255,255,0.60)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)", padding: "10px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="font-mono text-[9px] uppercase tracking-[0.38em]" style={{ color: "rgba(154,114,48,0.75)" }}>Nuestros metales</span>
              <span style={{ width: "1px", height: "14px", background: "rgba(10,31,43,0.12)", display: "inline-block" }} />
              <span className="font-serif italic text-[14px]" style={{ color: "rgba(10,31,43,0.58)" }}>Oro · Plata · Alta pureza</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          NOSOTROS TEASER
      ══════════════════════════════════════════════════════════════════ */}
      <section data-reveal className="px-6 sm:px-14"
        style={{ paddingTop: "clamp(80px, 12vw, 120px)", paddingBottom: "clamp(80px, 12vw, 120px)", background: "#F4EDE0", borderTop: "1px solid rgba(10,31,43,0.06)", borderBottom: "1px solid rgba(10,31,43,0.06)" }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
            <div>
              <div className="mb-6 flex items-center gap-4">
                <div className="h-px w-10" style={{ background: "linear-gradient(to right, rgba(154,114,48,0.45), transparent)" }} />
                <span className="font-mono text-[9px] uppercase tracking-[0.42em]" style={{ color: "rgba(154,114,48,0.60)" }}>Quiénes somos</span>
              </div>
              <h2 className="font-serif font-light italic"
                style={{ fontSize: "clamp(30px, 5vw, 56px)", color: "#0a1f2b", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "24px" }}>
                El metal sin la retórica
              </h2>
              <p style={{ fontSize: "clamp(14px, 1.8vw, 16px)", color: "rgba(10,31,43,0.55)", lineHeight: 1.75, maxWidth: "44ch", marginBottom: "32px" }}>
                Especialistas en metales preciosos de alta pureza. Precio transparente sobre el spot de mercado, cadena de custodia trazable y discreción absoluta en cada operación.
              </p>
              <Link href="/catalogo/nosotros" className="cta-btn-dark"
                style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "12px 18px 12px 22px", borderRadius: "99px", color: "rgba(249,244,236,0.88)", fontFamily: "monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.28em", textDecoration: "none", boxShadow: "0 4px 20px -4px rgba(10,31,43,0.22)" }}>
                <span>Conoce nuestra historia</span>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "99px", background: "rgba(249,244,236,0.12)", fontSize: "11px" }}>↗</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "999.9", unit: "‰",   label: "Pureza máxima garantizada" },
                { value: "LBMA",  unit: "",    label: "Refinerías certificadas"    },
                { value: "100%",  unit: "",    label: "Trazabilidad de cada lote"  },
                { value: "Real",  unit: "time",label: "Precios al momento del spot"},
              ].map((s) => (
                <div key={s.label} style={{ padding: "3px", borderRadius: "20px", background: "rgba(154,114,48,0.04)", border: "1px solid rgba(154,114,48,0.12)" }}>
                  <div style={{ borderRadius: "17px", background: "#FFFFFF", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)", padding: "24px 20px" }}>
                    <div className="font-serif font-light leading-none tracking-[-0.03em]"
                      style={{ fontSize: "clamp(24px, 3.5vw, 36px)", color: "rgba(154,114,48,0.70)", marginBottom: "8px" }}>
                      {s.value}
                      {s.unit && <span className="font-mono" style={{ fontSize: "0.45em", letterSpacing: "0.1em", marginLeft: "3px", verticalAlign: "middle" }}>{s.unit}</span>}
                    </div>
                    <div className="font-mono text-[8px] uppercase tracking-[0.25em]"
                      style={{ color: "rgba(10,31,43,0.35)", lineHeight: 1.4 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PRODUCT GRID
      ══════════════════════════════════════════════════════════════════ */}
      <main id="catalogo" style={{ background: "#F9F4EC" }}>
        {products.length === 0 ? (
          <div className="py-40 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em]" style={{ color: "rgba(10,31,43,0.22)" }}>
              Sin productos disponibles
            </p>
          </div>
        ) : (
          <CatalogGrid products={products} isLoggedIn={isLoggedIn} />
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          DEL BLOG
      ══════════════════════════════════════════════════════════════════ */}
      <section data-reveal className="px-6 sm:px-14"
        style={{ paddingTop: "clamp(80px, 12vw, 120px)", paddingBottom: "clamp(80px, 12vw, 120px)", background: "#F9F4EC", borderTop: "1px solid rgba(10,31,43,0.06)" }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="mb-4 flex items-center gap-4">
                <div className="h-px w-10" style={{ background: "linear-gradient(to right, rgba(154,114,48,0.45), transparent)" }} />
                <span className="font-mono text-[9px] uppercase tracking-[0.42em]" style={{ color: "rgba(154,114,48,0.60)" }}>Del blog</span>
              </div>
              <h2 className="font-serif font-light italic"
                style={{ fontSize: "clamp(28px, 4.5vw, 52px)", color: "#0a1f2b", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                El mercado del oro explicado
              </h2>
            </div>
            <Link href="/catalogo/blog"
              style={{ fontFamily: "monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.28em", color: "rgba(10,31,43,0.38)", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
              Ver todos →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {latestPosts.map((post) => (
              <Link key={post.slug} href={`/catalogo/blog/${post.slug}`} style={{ textDecoration: "none", display: "block" }}>
                <article className="blog-card-bezel"
                  style={{ padding: "3px", borderRadius: "22px", background: "rgba(154,114,48,0.03)", height: "100%" }}>
                  <div style={{ borderRadius: "19px", background: "#FFFFFF", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)", padding: "24px", height: "100%", display: "flex", flexDirection: "column" }}>
                    <span className="mb-4 inline-block w-fit rounded-full px-3 py-1 font-mono text-[8px] uppercase tracking-[0.28em]"
                      style={{ background: "rgba(154,114,48,0.07)", border: "1px solid rgba(154,114,48,0.14)", color: "rgba(154,114,48,0.65)" }}>
                      {post.category}
                    </span>
                    <h3 className="font-serif font-light"
                      style={{ fontSize: "clamp(16px, 1.8vw, 19px)", color: "#0a1f2b", lineHeight: 1.25, letterSpacing: "-0.01em", marginBottom: "12px", flex: 1 }}>
                      {post.title}
                    </h3>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="font-mono text-[8px]" style={{ color: "rgba(10,31,43,0.28)" }}>{fmtDate(post.date)}</span>
                      <div className="h-px flex-1" style={{ background: "rgba(154,114,48,0.12)" }} />
                      <span style={{ color: "rgba(154,114,48,0.45)", fontSize: "11px" }}>→</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CONTACTO
      ══════════════════════════════════════════════════════════════════ */}
      <section id="contacto" data-reveal className="px-6 sm:px-14"
        style={{
          paddingTop:    "clamp(80px, 12vw, 120px)",
          paddingBottom: "clamp(80px, 12vw, 120px)",
          background:    "#EDE5D4",
          borderTop:     "1px solid rgba(10,31,43,0.07)",
        }}>
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-14">
            <div className="mb-4 flex items-center gap-4">
              <div className="h-px w-10" style={{ background: "linear-gradient(to right, rgba(154,114,48,0.45), transparent)" }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.42em]"
                style={{ color: "rgba(154,114,48,0.60)" }}>Contacto</span>
            </div>
            <h2 className="font-serif font-light italic"
              style={{
                fontSize:      "clamp(32px, 5vw, 62px)",
                color:         "#0a1f2b",
                lineHeight:    1.05,
                letterSpacing: "-0.02em",
                maxWidth:      "14ch",
              }}>
              Estamos para ayudarte.
            </h2>
          </div>

          {/* Contact cards grid */}
          <div className="grid gap-4 sm:grid-cols-3">

            {/* Email */}
            <a href="mailto:info@lingot.com" style={{ textDecoration: "none", display: "block", height: "100%" }}>
              <div
                style={{
                  padding:      "3px",
                  borderRadius: "22px",
                  background:   "rgba(154,114,48,0.04)",
                  border:       "1px solid rgba(154,114,48,0.12)",
                  transition:   "border-color 0.28s ease, box-shadow 0.28s ease",
                  height:       "100%",
                }}
                className="contact-card-bezel"
              >
                <div style={{
                  borderRadius: "19px",
                  background:   "rgba(255,255,255,0.68)",
                  boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
                  padding:      "28px 28px 26px",
                  height:       "100%",
                }}>
                  {/* Icon */}
                  <div style={{
                    width:        "36px",
                    height:       "36px",
                    borderRadius: "10px",
                    background:   "rgba(154,114,48,0.08)",
                    border:       "1px solid rgba(154,114,48,0.14)",
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5"
                        stroke="rgba(154,114,48,0.70)" strokeWidth="1.2" />
                      <polyline points="1.5,4 8,9 14.5,4"
                        stroke="rgba(154,114,48,0.70)" strokeWidth="1.2"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.32em]"
                    style={{ color: "rgba(10,31,43,0.35)", marginBottom: "6px" }}>
                    Email
                  </div>
                  <div className="font-serif font-light"
                    style={{ fontSize: "clamp(14px, 1.5vw, 16px)", color: "#0a1f2b", letterSpacing: "-0.01em" }}>
                    info@lingot.com
                  </div>
                </div>
              </div>
            </a>

            {/* Teléfono */}
            <a href="tel:+34669393197" style={{ textDecoration: "none", display: "block", height: "100%" }}>
              <div
                className="contact-card-bezel"
                style={{
                  padding:      "3px",
                  borderRadius: "22px",
                  background:   "rgba(154,114,48,0.04)",
                  border:       "1px solid rgba(154,114,48,0.12)",
                  transition:   "border-color 0.28s ease, box-shadow 0.28s ease",
                  height:       "100%",
                }}
              >
                <div style={{
                  borderRadius: "19px",
                  background:   "rgba(255,255,255,0.68)",
                  boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
                  padding:      "28px 28px 26px",
                  height:       "100%",
                }}>
                  <div style={{
                    width:        "36px",
                    height:       "36px",
                    borderRadius: "10px",
                    background:   "rgba(154,114,48,0.08)",
                    border:       "1px solid rgba(154,114,48,0.14)",
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M3 2.5C3 2.22 3.22 2 3.5 2H5.5C5.74 2 5.95 2.16 6.01 2.39L6.76 5.14C6.82 5.36 6.73 5.59 6.54 5.72L5.3 6.56C6.06 8.24 7.42 9.6 9.1 10.36L9.94 9.12C10.07 8.93 10.3 8.84 10.52 8.9L13.27 9.65C13.5 9.71 13.66 9.92 13.66 10.16V12.16C13.66 12.44 13.44 12.66 13.16 12.66C7.35 12.66 2.66 7.97 2.66 2.16L3 2.5Z"
                        stroke="rgba(154,114,48,0.70)" strokeWidth="1.2"
                        strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.32em]"
                    style={{ color: "rgba(10,31,43,0.35)", marginBottom: "6px" }}>
                    Teléfono
                  </div>
                  <div className="font-serif font-light"
                    style={{ fontSize: "clamp(14px, 1.5vw, 16px)", color: "#0a1f2b", letterSpacing: "-0.01em" }}>
                    669 39 31 97
                  </div>
                </div>
              </div>
            </a>

            {/* Horario */}
            <div
              style={{
                padding:      "3px",
                borderRadius: "22px",
                background:   "rgba(154,114,48,0.04)",
                border:       "1px solid rgba(154,114,48,0.12)",
                height:       "100%",
              }}
            >
              <div style={{
                borderRadius: "19px",
                background:   "rgba(255,255,255,0.68)",
                boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
                padding:      "28px 28px 26px",
                height:       "100%",
              }}>
                <div style={{
                  width:        "36px",
                  height:       "36px",
                  borderRadius: "10px",
                  background:   "rgba(154,114,48,0.08)",
                  border:       "1px solid rgba(154,114,48,0.14)",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <circle cx="8" cy="8" r="5.5" stroke="rgba(154,114,48,0.70)" strokeWidth="1.2" />
                    <polyline points="8,5 8,8 10.5,9.5"
                      stroke="rgba(154,114,48,0.70)" strokeWidth="1.2"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="font-mono text-[8px] uppercase tracking-[0.32em]"
                  style={{ color: "rgba(10,31,43,0.35)", marginBottom: "6px" }}>
                  Horario
                </div>
                <div className="font-serif font-light"
                  style={{ fontSize: "clamp(14px, 1.5vw, 16px)", color: "#0a1f2b", letterSpacing: "-0.01em", marginBottom: "4px" }}>
                  Lun – Vie
                </div>
                <div className="font-mono text-[9px]"
                  style={{ color: "rgba(10,31,43,0.40)", letterSpacing: "0.06em" }}>
                  9:00 – 17:00
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer className="relative overflow-hidden px-6 py-24"
        style={{ background: "#EDE5D4", borderTop: "1px solid rgba(10,31,43,0.07)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 50% 70% at 50% 100%, rgba(154,114,48,0.06), transparent)" }} />
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="h-px w-12"
              style={{ background: "linear-gradient(to right, transparent, rgba(154,114,48,0.40), transparent)" }} />
            <p className="font-serif italic text-[18px]" style={{ color: "rgba(154,114,48,0.50)" }}>{brandName}</p>
            <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3">
              {[
                { href: "/catalogo",           label: "Inicio"    },
                { href: "/catalogo#catalogo",  label: "Colección" },
                { href: "/catalogo/nosotros",  label: "Nosotros"  },
                { href: "/catalogo/blog",      label: "Blog"      },
                { href: "/catalogo/mi-cuenta", label: "Mi cuenta" },
              ].map((l) => (
                <Link key={l.href} href={l.href}
                  className="font-mono text-[9px] uppercase tracking-[0.28em]"
                  style={{ color: "rgba(10,31,43,0.28)", textDecoration: "none" }}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <p className="font-mono text-[8px] uppercase tracking-[0.45em]" style={{ color: "rgba(10,31,43,0.18)" }}>
              Joyería · Metales Preciosos · {year}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
