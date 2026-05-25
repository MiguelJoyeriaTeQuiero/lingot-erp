"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

const NAV_LINKS = [
  { href: "/catalogo",           label: "Inicio"    },
  { href: "/catalogo#catalogo",  label: "Colección" },
  { href: "/catalogo/nosotros",  label: "Nosotros"  },
  { href: "/catalogo/blog",      label: "Blog"       },
  { href: "/catalogo#contacto",  label: "Contacto"  },
];

export function CatalogNav() {
  const [open,     setOpen]     = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Scroll state for backdrop intensity
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close overlay on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (href: string) => {
    if (href.includes("#")) return false;          // anchor links are never "active"
    if (href === "/catalogo") return pathname === "/catalogo";
    return pathname.startsWith(href);
  };

  // Hamburger line offsets: 2 × 1.5px lines + 5px gap = 8px total, center at 4px
  // Each line needs to travel 3.25px to meet the midpoint, then rotate ±45°
  const LINE_OFFSET = "3.25px";

  return (
    <>
      {/* ── Fixed header ──────────────────────────────────────────────────── */}
      <header
        role="banner"
        style={{
          position:            "fixed",
          top:                 0,
          left:                0,
          right:               0,
          zIndex:              40,
          height:              "58px",
          background:          scrolled
            ? "rgba(249,244,236,0.96)"
            : "rgba(249,244,236,0.80)",
          borderBottom:        `1px solid ${scrolled
            ? "rgba(10,31,43,0.09)"
            : "rgba(10,31,43,0.04)"}`,
          backdropFilter:      "blur(22px)",
          WebkitBackdropFilter:"blur(22px)",
          boxShadow:           scrolled
            ? "0 1px 24px -6px rgba(10,31,43,0.12)"
            : "none",
          transition:          "background 0.40s ease, border-color 0.40s ease, box-shadow 0.40s ease",
        }}
      >
        <div
          style={{
            maxWidth:       "1280px",
            margin:         "0 auto",
            height:         "100%",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "0 clamp(20px, 4vw, 48px)",
          }}
        >
          {/* Brand wordmark */}
          <Link
            href="/catalogo"
            style={{
              fontFamily:    "var(--font-catalog-serif, Georgia, serif)",
              fontSize:      "20px",
              fontWeight:    300,
              fontStyle:     "italic",
              color:         "#0a1f2b",
              textDecoration:"none",
              letterSpacing: "-0.03em",
              lineHeight:    1,
            }}
          >
            Lingot
          </Link>

          {/* Desktop links — hidden on mobile */}
          <nav
            aria-label="Navegación principal"
            className="hidden sm:flex"
            style={{ alignItems: "center" }}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding:        "4px 16px",
                  fontFamily:     "monospace",
                  fontSize:       "9.5px",
                  textTransform:  "uppercase",
                  letterSpacing:  "0.24em",
                  color:          isActive(link.href)
                    ? "#0a1f2b"
                    : "rgba(10,31,43,0.40)",
                  textDecoration: "none",
                  whiteSpace:     "nowrap",
                  borderBottom:   isActive(link.href)
                    ? "1px solid rgba(154,114,48,0.60)"
                    : "1px solid transparent",
                  transition:     "color 0.22s ease, border-color 0.22s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive(link.href)) {
                    (e.currentTarget as HTMLElement).style.color = "#0a1f2b";
                    (e.currentTarget as HTMLElement).style.borderBottomColor = "rgba(154,114,48,0.30)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(link.href)) {
                    (e.currentTarget as HTMLElement).style.color = "rgba(10,31,43,0.40)";
                    (e.currentTarget as HTMLElement).style.borderBottomColor = "transparent";
                  }
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Hamburger button — mobile only */}
          <button
            className="flex sm:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            style={{
              background:    "none",
              border:        "none",
              cursor:        "pointer",
              padding:       "8px",
              flexDirection: "column",
              justifyContent:"center",
              alignItems:    "center",
              gap:           "5px",
              width:         "36px",
              height:        "36px",
            }}
          >
            {/* Top line → upper diagonal of × */}
            <span
              style={{
                display:         "block",
                width:           "20px",
                height:          "1.5px",
                background:      "#0a1f2b",
                borderRadius:    "2px",
                transformOrigin: "center",
                transition:      `transform 0.40s ${SPRING}`,
                transform:       open
                  ? `translateY(${LINE_OFFSET}) rotate(45deg)`
                  : "none",
              }}
            />
            {/* Bottom line → lower diagonal of × */}
            <span
              style={{
                display:         "block",
                width:           "20px",
                height:          "1.5px",
                background:      "#0a1f2b",
                borderRadius:    "2px",
                transformOrigin: "center",
                transition:      `transform 0.40s ${SPRING}`,
                transform:       open
                  ? `translateY(-${LINE_OFFSET}) rotate(-45deg)`
                  : "none",
              }}
            />
          </button>
        </div>
      </header>

      {/* ── Mobile full-screen overlay ─────────────────────────────────────── */}
      <div
        aria-hidden={!open}
        style={{
          position:            "fixed",
          inset:               0,
          zIndex:              39,
          background:          "rgba(249,244,236,0.98)",
          backdropFilter:      "blur(32px)",
          WebkitBackdropFilter:"blur(32px)",
          display:             "flex",
          flexDirection:       "column",
          justifyContent:      "center",
          padding:             "0 clamp(32px, 8vw, 64px)",
          opacity:             open ? 1 : 0,
          pointerEvents:       open ? "auto" : "none",
          transition:          "opacity 0.28s ease",
        }}
      >
        <nav
          aria-label="Menú móvil"
          style={{ display: "flex", flexDirection: "column" }}
        >
          {NAV_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{
                fontFamily:    "var(--font-catalog-serif, Georgia, serif)",
                fontSize:      "clamp(34px, 9vw, 58px)",
                fontWeight:    300,
                fontStyle:     "italic",
                color:         isActive(link.href)
                  ? "#0a1f2b"
                  : "rgba(10,31,43,0.28)",
                textDecoration:"none",
                letterSpacing: "-0.02em",
                lineHeight:    1.2,
                display:       "block",
                paddingBottom: "6px",
                marginBottom:  "6px",
                borderBottom:  "1px solid rgba(10,31,43,0.06)",
                animation:     open
                  ? `navReveal 0.52s ${SPRING} ${i * 60}ms both`
                  : "none",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Signature */}
        <p
          style={{
            position:      "absolute",
            bottom:        "clamp(24px, 4vh, 40px)",
            fontFamily:    "monospace",
            fontSize:      "8px",
            textTransform: "uppercase",
            letterSpacing: "0.40em",
            color:         "rgba(10,31,43,0.18)",
            animation:     open
              ? `navReveal 0.52s ${SPRING} 280ms both`
              : "none",
          }}
        >
          Lingot · Metales Preciosos
        </p>
      </div>

      <style>{`
        @keyframes navReveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </>
  );
}
