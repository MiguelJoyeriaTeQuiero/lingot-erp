import Link from "next/link";

const LINKS = [
  { href: "/catalogo",           label: "Inicio"    },
  { href: "/catalogo#catalogo",  label: "Colección" },
  { href: "/catalogo/nosotros",  label: "Nosotros"  },
  { href: "/catalogo/blog",      label: "Análisis"  },
  { href: "/catalogo/mi-cuenta", label: "Mi cuenta" },
];

/** Footer bóveda — bookend oscuro reutilizado en todas las páginas del catálogo. */
export function CatalogFooter({ compact = false }: { compact?: boolean }) {
  const year = new Date().getFullYear();
  return (
    <footer className="lg-scope relative overflow-hidden px-6"
      style={{ background: "var(--lg-vault)", paddingTop: compact ? "clamp(56px, 8vw, 84px)" : "clamp(80px, 10vw, 120px)", paddingBottom: "clamp(44px, 6vw, 60px)" }}>
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 90% at 50% 120%, rgba(200,161,100,0.10), transparent 60%)" }} />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-8 text-center">
          {!compact && (
            <h2 className="lg-display" style={{ fontSize: "clamp(48px, 11vw, 140px)", color: "var(--lg-light)", fontWeight: 300, lineHeight: 0.9 }}>Lingot</h2>
          )}
          <div className="lg-goldline-shimmer" style={{ width: "clamp(110px, 18vw, 200px)" }} />
          <nav className="flex flex-wrap justify-center gap-x-9 gap-y-3">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="lg-label lg-foot-link"
                style={{ fontSize: "9px", letterSpacing: "0.28em", color: "var(--lg-light-dim)", textDecoration: "none", transition: "color 0.25s ease" }}>
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.42em", color: "var(--lg-light-faint)" }}>
            Te Quiero Group · Metales Preciosos · {year}
          </p>
        </div>
      </div>
      <style>{`.lg-foot-link:hover{color:var(--lg-gold-bright)!important;}`}</style>
    </footer>
  );
}
