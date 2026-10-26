"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CatalogLoginButton } from "./catalog-login";

const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

const NAV_LINKS = [
  { href: "/catalogo",           label: "Inicio"    },
  { href: "/catalogo#catalogo",  label: "Colección" },
  { href: "/catalogo/nosotros",  label: "Nosotros"  },
  { href: "/catalogo/blog",      label: "Análisis"  },
  { href: "/catalogo#contacto",  label: "Contacto"  },
];

export function CatalogNav({
  isLoggedIn = false,
  isWholesale = false,
  userName = "",
}: {
  isLoggedIn?:  boolean;
  isWholesale?: boolean;
  userName?:    string;
}) {
  const [open,     setOpen]     = useState(false);
  const [overHero, setOverHero] = useState(true);
  const pathname = usePathname();

  // El tema oscuro (texto claro, fondo transparente) solo aplica sobre el hero
  // bóveda de la home. En el resto de páginas la nav es siempre "papel".
  const hasDarkHero = pathname === "/catalogo";

  useEffect(() => {
    const fn = () => setOverHero(hasDarkHero && window.scrollY < window.innerHeight - 90);
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, [hasDarkHero]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    document.body.classList.toggle("lg-menu-open", open);
    return () => { document.body.style.overflow = ""; document.body.classList.remove("lg-menu-open"); };
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (href: string) => {
    if (href.includes("#")) return false;
    if (href === "/catalogo") return pathname === "/catalogo";
    return pathname.startsWith(href);
  };

  const onDark = overHero || open;

  const wordmarkColor = onDark ? "var(--lg-light)" : "var(--lg-ink)";
  const linkColor     = onDark ? "var(--lg-light-soft)" : "var(--lg-ink-soft)";
  const linkActive    = onDark ? "var(--lg-light)" : "var(--lg-ink)";

  const LINE_OFFSET = "3.25px";

  return (
    <>
      <header
        role="banner"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 40, height: "60px",
          background: onDark ? "transparent" : "rgba(236,239,242,0.82)",
          borderBottom: `1px solid ${onDark ? "transparent" : "var(--lg-ink-faint)"}`,
          backdropFilter:       onDark ? "none" : "blur(20px)",
          WebkitBackdropFilter: onDark ? "none" : "blur(20px)",
          boxShadow: onDark ? "none" : "0 1px 24px -8px rgba(10,43,54,0.12)",
          transition: "background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease",
        }}
        className="lg-scope"
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", height: "100%", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "0 clamp(20px, 4vw, 48px)" }}>
          {/* Zona izquierda — wordmark (oculto sobre el hero; aparece al hacer scroll) */}
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <Link href="/catalogo" className="lg-display"
              style={{
                fontSize: "22px", fontWeight: 500, color: wordmarkColor, textDecoration: "none", letterSpacing: "-0.04em", lineHeight: 1,
                opacity: overHero ? 0 : 1,
                transform: overHero ? "translateY(-8px)" : "translateY(0)",
                pointerEvents: overHero ? "none" : "auto",
                transition: "color 0.45s ease, opacity 0.5s var(--lg-spring), transform 0.5s var(--lg-spring)",
              }}>
              Lingot
            </Link>
          </div>

          {/* Zona central — enlaces (desktop) */}
          <nav aria-label="Navegación principal" className="hidden sm:flex" style={{ alignItems: "center", gap: "clamp(4px, 0.8vw, 14px)", justifySelf: "center" }}>
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link key={link.href} href={link.href} className="lg-label"
                  style={{
                    padding: "6px clamp(12px, 1.2vw, 20px)", fontSize: "9.5px", letterSpacing: "0.24em",
                    color: active ? linkActive : linkColor,
                    textDecoration: "none", whiteSpace: "nowrap",
                    borderBottom: `1px solid ${active ? "var(--lg-gold)" : "transparent"}`,
                    transition: "color 0.25s ease, border-color 0.25s ease",
                  }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = linkActive; e.currentTarget.style.borderBottomColor = "var(--lg-gold-line)"; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = linkColor; e.currentTarget.style.borderBottomColor = "transparent"; } }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Zona derecha — acceso / cuenta + hamburguesa */}
          <div className="flex items-center" style={{ justifyContent: "flex-end", gap: "clamp(10px, 1.4vw, 20px)" }}>
            <div style={{ opacity: open ? 0 : 1, pointerEvents: open ? "none" : "auto", transition: "opacity 0.25s ease" }}>
              <CatalogLoginButton isLoggedIn={isLoggedIn} isWholesale={isWholesale} userName={userName} onDark={onDark} />
            </div>

            {/* Hamburger */}
            <button className="flex sm:hidden" onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "5px", width: "36px", height: "36px" }}>
              <span style={{ display: "block", width: "20px", height: "1.5px", background: open ? "var(--lg-light)" : wordmarkColor, borderRadius: "2px", transformOrigin: "center", transition: `transform 0.4s ${SPRING}, background 0.4s ease`, transform: open ? `translateY(${LINE_OFFSET}) rotate(45deg)` : "none" }} />
              <span style={{ display: "block", width: "20px", height: "1.5px", background: open ? "var(--lg-light)" : wordmarkColor, borderRadius: "2px", transformOrigin: "center", transition: `transform 0.4s ${SPRING}, background 0.4s ease`, transform: open ? `translateY(-${LINE_OFFSET}) rotate(-45deg)` : "none" }} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay — la bóveda se abre */}
      <div aria-hidden={!open} className="lg-scope"
        style={{
          position: "fixed", inset: 0, zIndex: 39,
          background: "radial-gradient(120% 100% at 50% 0%, #0f4a5c 0%, #0a3746 45%, #06272f 100%)",
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "0 clamp(32px, 8vw, 64px)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}>
        <nav aria-label="Menú móvil" style={{ display: "flex", flexDirection: "column" }}>
          {NAV_LINKS.map((link, i) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="lg-display"
              style={{
                fontSize: "clamp(34px, 9vw, 56px)", fontWeight: 300,
                color: isActive(link.href) ? "var(--lg-light)" : "var(--lg-light-dim)",
                textDecoration: "none", letterSpacing: "-0.03em", lineHeight: 1.28,
                paddingBottom: "6px", marginBottom: "6px", borderBottom: "1px solid var(--lg-vault-line2)",
                animation: open ? `navReveal 0.55s ${SPRING} ${i * 60}ms both` : "none",
              }}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="lg-label" style={{ position: "absolute", bottom: "clamp(24px, 4vh, 40px)", fontSize: "8px", letterSpacing: "0.4em", color: "var(--lg-light-faint)", animation: open ? `navReveal 0.55s ${SPRING} 300ms both` : "none" }}>
          Lingot · Metales Preciosos
        </p>
      </div>

      <style>{`@keyframes navReveal { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
}
