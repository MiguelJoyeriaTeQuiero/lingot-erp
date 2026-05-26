"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { CatalogHeroWebGL } from "./catalog-hero-webgl";
import { CatalogGrid, type CatalogProduct } from "./catalog-grid";
import { CatalogLoginButton } from "./catalog-login";
import { CatalogScrollTransition } from "./catalog-scroll-transition";
import { TradingViewChart } from "./trading-view-chart";
import type { BlogPost } from "./blog/data";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  products, brandName, year,
  latestPosts,
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

        {/* Top bar — year only, no brand name */}
        <div
          className="relative flex items-center justify-between px-8 sm:px-14"
          style={{
            paddingTop: "clamp(32px, 5vh, 48px)",
            zIndex:     5,
            animation:  "hero-fade-down 0.70s cubic-bezier(0.16,1,0.3,1) 60ms both",
          }}
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.40em]"
            style={{ color: "rgba(10,31,43,0.18)" }}>
            {year}
          </span>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.40em] sm:block"
            style={{ color: "rgba(10,31,43,0.18)" }}>
            Oro · Plata
          </span>
        </div>

        {/* ── Main hero body: centered branding ────────────────────── */}
        <div
          id="hero-content"
          className="relative flex flex-1 flex-col items-center justify-center px-8 pb-16 pt-4 sm:px-14"
          style={{ zIndex: 5, textAlign: "center" }}
        >
          {/* Eyebrow */}
          <div style={{ marginBottom: "clamp(16px, 2.5vw, 28px)", animation: "hero-fade-down 0.70s cubic-bezier(0.16,1,0.3,1) 100ms both" }}>
            <span className="font-mono text-[9px] uppercase tracking-[0.50em]"
              style={{ color: "rgba(154,114,48,0.55)" }}>
              Metales preciosos · Alta pureza
            </span>
          </div>

          {/* Brand name — main hero element */}
          <HeroLine delay={180}>
            <span
              className="font-serif font-light italic select-none"
              style={{
                fontSize:      "clamp(88px, 16vw, 220px)",
                color:         "#0a1f2b",
                letterSpacing: "-0.04em",
                lineHeight:    0.88,
                display:       "block",
              }}
            >
              {brandName}
            </span>
          </HeroLine>

          {/* Gold separator */}
          <div style={{ margin: "clamp(22px, 3.5vw, 44px) 0", width: "clamp(200px, 30vw, 360px)", animation: "hero-fade-up 0.80s cubic-bezier(0.16,1,0.3,1) 380ms both" }}>
            <div className="flex items-center gap-5">
              <div className="gold-shimmer-light h-px flex-1" />
              <span className="font-mono text-[8px]" style={{ color: "rgba(154,114,48,0.40)" }}>✦</span>
              <div className="gold-shimmer-light h-px flex-1" style={{ animationDirection: "reverse" }} />
            </div>
          </div>

          {/* Tagline */}
          <HeroLine delay={340}>
            <span
              className="font-serif font-light italic select-none"
              style={{
                fontSize:      "clamp(24px, 3.8vw, 52px)",
                color:         "rgba(10,31,43,0.48)",
                letterSpacing: "-0.02em",
                lineHeight:    1.1,
                display:       "block",
              }}
            >
              El metal sin ruido.
            </span>
          </HeroLine>

          {/* Reference count */}
          <div style={{ marginTop: "clamp(20px, 3vw, 36px)", animation: "hero-fade-up 0.80s cubic-bezier(0.16,1,0.3,1) 600ms both" }}>
            <p className="font-mono text-[9px] uppercase tracking-[0.40em]"
              style={{ color: "rgba(10,31,43,0.28)" }}>
              {products.length} {products.length === 1 ? "referencia" : "referencias"} · Oro · Plata
            </p>
          </div>
        </div>

        {/* Scroll cue */}
        <div
          className="relative flex justify-center pb-10"
          style={{ zIndex: 5, animation: "hero-fade-up 0.80s cubic-bezier(0.16,1,0.3,1) 850ms both" }}
        >
          <div className="flex flex-col items-center gap-2.5">
            <div className="catalog-scroll-cue"
              style={{ width: "1px", height: "42px", background: "linear-gradient(to bottom, transparent, rgba(154,114,48,0.45))" }} />
            <span className="font-mono text-[7px] uppercase tracking-[0.55em]"
              style={{ color: "rgba(10,31,43,0.22)" }}>Explorar</span>
          </div>
        </div>
      </header>


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
            "El oro es dinero. El resto es crédito (John P. Morgan (1912))"
          </p>

        </div>
      </section>



      {/* ══════════════════════════════════════════════════════════════════
          GOLD CHART
      ══════════════════════════════════════════════════════════════════ */}
      <section data-reveal className="px-6 sm:px-14"
        style={{ paddingTop: "clamp(64px, 10vw, 100px)", paddingBottom: "clamp(64px, 10vw, 100px)", background: "#F4EDE0" }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-px w-10" style={{ background: "linear-gradient(to right, rgba(154,114,48,0.45), transparent)" }} />
            <span className="font-mono text-[9px] uppercase tracking-[0.42em]" style={{ color: "rgba(154,114,48,0.60)" }}>Oro · XAU/EUR · Onza troy</span>
          </div>
          <div style={{ height: "460px", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(154,114,48,0.14)", background: "#F9F4EC" }}>
            <TradingViewChart />
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
