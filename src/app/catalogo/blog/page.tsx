import type { Metadata } from "next";
import Link from "next/link";
import { getPaginatedPosts, BLOG_POSTS } from "./data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog · Lingot — Metales Preciosos",
  description:
    "Análisis y noticias sobre el mercado del oro y la plata: tipos de interés, inflación, geopolítica y factores que mueven el precio de los metales preciosos.",
  openGraph: {
    title: "Blog · Lingot — Metales Preciosos",
    description: "Análisis sobre el mercado del oro y la plata. Factores macro, técnico y geopolíticos.",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function BlogPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = parseInt(searchParams.page ?? "1", 10);
  const { posts, totalPages, currentPage } = getPaginatedPosts(page);

  return (
    <div style={{ background: "#F9F4EC", minHeight: "100dvh" }}>
      <div aria-hidden className="catalog-grain-overlay" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <header
        className="relative overflow-hidden px-6"
        style={{
          background:    "linear-gradient(175deg, #EDE5D4 0%, #F4EDE0 50%, #F9F4EC 100%)",
          paddingTop:    "clamp(120px, 18vw, 180px)",
          paddingBottom: "clamp(60px, 8vw, 96px)",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <div
            data-reveal
            className="mb-6 inline-flex items-center rounded-full px-4 py-1.5"
            style={{
              background: "rgba(10,31,43,0.05)",
              border:     "1px solid rgba(10,31,43,0.12)",
            }}
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.42em]"
              style={{ color: "rgba(10,31,43,0.40)" }}>
              Blog · Análisis de mercado
            </span>
          </div>

          <h1
            data-reveal
            className="font-serif font-light italic"
            style={{
              fontSize:      "clamp(38px, 6.5vw, 80px)",
              color:         "#0a1f2b",
              lineHeight:    1.05,
              letterSpacing: "-0.02em",
              maxWidth:      "18ch",
              marginTop:     "12px",
            }}
          >
            El mercado del oro explicado
          </h1>

          <p
            data-reveal
            style={{
              marginTop:  "24px",
              fontSize:   "clamp(14px, 1.8vw, 17px)",
              color:      "rgba(10,31,43,0.48)",
              maxWidth:   "52ch",
              lineHeight: 1.65,
            }}
          >
            Análisis sobre los factores macroeconómicos, geopolíticos y técnicos
            que determinan el precio del oro y la plata.
          </p>

          {/* Stat */}
          <div className="mt-10 flex items-center gap-4" data-reveal>
            <span
              className="font-editorial leading-none tracking-[-0.04em]"
              style={{ fontSize: "48px", color: "rgba(154,114,48,0.25)" }}
            >
              {BLOG_POSTS.length}
            </span>
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.38em]"
                style={{ color: "rgba(10,31,43,0.30)" }}>
                Artículos
              </div>
              <div className="font-mono text-[8px] uppercase tracking-[0.38em]"
                style={{ color: "rgba(10,31,43,0.20)" }}>
                publicados
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Post grid ─────────────────────────────────────────────────── */}
      <main
        className="px-6"
        style={{
          paddingTop:    "clamp(60px, 8vw, 96px)",
          paddingBottom: "clamp(80px, 12vw, 120px)",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2">
            {posts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/catalogo/blog/${post.slug}`}
                data-reveal
                style={{
                  textDecoration: "none",
                  display: "block",
                  gridColumn: i === 0 && currentPage === 1 ? "1 / -1" : "auto",
                }}
              >
                {/* Double-Bezel card */}
                <article
                  className="blog-card-bezel"
                  style={{
                    padding:      "3px",
                    borderRadius: "24px",
                    background:   "rgba(154,114,48,0.03)",
                  }}
                >
                  <div
                    style={{
                      borderRadius: "21px",
                      background:   "#FFFFFF",
                      boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
                      overflow:     "hidden",
                    }}
                  >
                    {/* Feature image — only on first post of page 1 */}
                    {i === 0 && currentPage === 1 && (
                      <div
                        style={{ height: "clamp(200px, 30vw, 320px)", overflow: "hidden" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${post.imageUrl}`}
                          alt={post.imageAlt}
                          style={{
                            width:      "100%",
                            height:     "100%",
                            objectFit:  "cover",
                            display:    "block",
                            mixBlendMode: "multiply",
                          }}
                        />
                      </div>
                    )}

                    <div style={{ padding: i === 0 && currentPage === 1 ? "28px 32px 32px" : "28px 28px 28px" }}>
                      {/* Category + date */}
                      <div className="mb-4 flex items-center gap-3">
                        <span
                          className="rounded-full px-3 py-1 font-mono text-[8px] uppercase tracking-[0.28em]"
                          style={{
                            background: "rgba(154,114,48,0.07)",
                            border:     "1px solid rgba(154,114,48,0.16)",
                            color:      "rgba(154,114,48,0.70)",
                          }}
                        >
                          {post.category}
                        </span>
                        <span className="font-mono text-[8px]"
                          style={{ color: "rgba(10,31,43,0.28)" }}>
                          {formatDate(post.date)}
                        </span>
                      </div>

                      <h2
                        className="font-serif font-light"
                        style={{
                          fontSize:   i === 0 && currentPage === 1 ? "clamp(20px, 2.8vw, 28px)" : "clamp(17px, 2vw, 21px)",
                          color:      "#0a1f2b",
                          lineHeight: 1.2,
                          letterSpacing: "-0.01em",
                          marginBottom: "12px",
                        }}
                      >
                        {post.title}
                      </h2>

                      <p style={{
                        fontSize:   "13px",
                        color:      "rgba(10,31,43,0.50)",
                        lineHeight: 1.65,
                      }}>
                        {post.excerpt}
                      </p>

                      <div className="mt-5 flex items-center gap-3">
                        <div className="h-px flex-1"
                          style={{ background: "rgba(154,114,48,0.14)" }} />
                        <span className="font-mono text-[8px] uppercase tracking-[0.28em]"
                          style={{ color: "rgba(154,114,48,0.50)" }}>
                          {post.readMinutes} min
                        </span>
                        <span style={{ color: "rgba(154,114,48,0.40)", fontSize: "10px" }}>→</span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {/* ── Pagination ──────────────────────────────────────────── */}
          {totalPages > 1 && (
            <nav
              className="mt-16 flex items-center justify-center gap-2"
              aria-label="Paginación del blog"
            >
              {currentPage > 1 && (
                <Link
                  href={`/catalogo/blog?page=${currentPage - 1}`}
                  className="font-mono text-[9px] uppercase tracking-[0.28em]"
                  style={{
                    padding:       "8px 16px",
                    borderRadius:  "99px",
                    background:    "rgba(10,31,43,0.05)",
                    border:        "1px solid rgba(10,31,43,0.10)",
                    color:         "rgba(10,31,43,0.45)",
                    textDecoration: "none",
                  }}
                >
                  ← Anterior
                </Link>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/catalogo/blog?page=${p}`}
                  className="font-mono text-[9px]"
                  style={{
                    width:          "36px",
                    height:         "36px",
                    borderRadius:   "99px",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    background:     p === currentPage ? "#0a1f2b" : "rgba(10,31,43,0.04)",
                    border:         `1px solid ${p === currentPage ? "#0a1f2b" : "rgba(10,31,43,0.10)"}`,
                    color:          p === currentPage ? "rgba(249,244,236,0.88)" : "rgba(10,31,43,0.45)",
                    textDecoration: "none",
                  }}
                >
                  {p}
                </Link>
              ))}

              {currentPage < totalPages && (
                <Link
                  href={`/catalogo/blog?page=${currentPage + 1}`}
                  className="font-mono text-[9px] uppercase tracking-[0.28em]"
                  style={{
                    padding:       "8px 16px",
                    borderRadius:  "99px",
                    background:    "rgba(10,31,43,0.05)",
                    border:        "1px solid rgba(10,31,43,0.10)",
                    color:         "rgba(10,31,43,0.45)",
                    textDecoration: "none",
                  }}
                >
                  Siguiente →
                </Link>
              )}
            </nav>
          )}
        </div>
      </main>

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
              { href: "/catalogo",           label: "Inicio"    },
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
        </div>
      </footer>
    </div>
  );
}
