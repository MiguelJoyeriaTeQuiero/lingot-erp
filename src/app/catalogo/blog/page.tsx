import type { Metadata } from "next";
import Link from "next/link";
import { getPaginatedPosts, BLOG_POSTS } from "./data";
import { CatalogFooter } from "../catalog-footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Análisis · Lingot — Metales Preciosos",
  description:
    "Análisis y noticias sobre el mercado del oro y la plata: tipos de interés, inflación, geopolítica y factores que mueven el precio de los metales preciosos.",
  openGraph: {
    title: "Análisis · Lingot — Metales Preciosos",
    description: "Análisis sobre el mercado del oro y la plata. Factores macro, técnico y geopolíticos.",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = parseInt(searchParams.page ?? "1", 10);
  const { posts, totalPages, currentPage } = getPaginatedPosts(page);

  return (
    <div className="lg-scope" style={{ background: "var(--lg-paper)", minHeight: "100dvh" }}>
      <div aria-hidden className="lg-grain" />

      {/* ── Hero bóveda ─────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden px-6 sm:px-14"
        style={{ background: "radial-gradient(120% 100% at 22% 0%, #0f4a5c 0%, #0a3746 46%, #06272f 100%)", paddingTop: "clamp(140px, 20vw, 200px)", paddingBottom: "clamp(70px, 10vw, 110px)" }}>
        <div className="mx-auto max-w-5xl">
          <div data-lg-reveal className="mb-6 inline-flex items-center rounded-full px-4 py-1.5"
            style={{ background: "rgba(238,242,244,0.05)", border: "1px solid rgba(238,242,244,0.14)" }}>
            <span className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.42em", color: "rgba(228,200,143,0.72)" }}>Análisis de mercado</span>
          </div>
          <h1 data-lg-reveal className="lg-display" style={{ fontSize: "clamp(40px, 7vw, 92px)", color: "var(--lg-light)", fontWeight: 300, maxWidth: "18ch", marginTop: "12px" }}>
            El mercado del oro, explicado.
          </h1>
          <p data-lg-reveal style={{ marginTop: "26px", fontSize: "clamp(14px, 1.8vw, 18px)", color: "var(--lg-light-soft)", maxWidth: "54ch", lineHeight: 1.65 }}>
            Análisis sobre los factores macroeconómicos, geopolíticos y técnicos que determinan el precio del oro y la plata.
          </p>
          <div data-lg-reveal className="mt-10 flex items-center gap-4">
            <span className="lg-num" style={{ fontSize: "52px", fontWeight: 300, color: "rgba(228,200,143,0.55)" }}>{BLOG_POSTS.length}</span>
            <div>
              <div className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.38em", color: "var(--lg-light-dim)" }}>Artículos</div>
              <div className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.38em", color: "var(--lg-light-faint)" }}>publicados</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Grid de artículos ───────────────────────────────────────────── */}
      <main className="px-6 sm:px-14" style={{ paddingTop: "clamp(56px, 8vw, 90px)", paddingBottom: "clamp(80px, 12vw, 120px)" }}>
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2">
            {posts.map((post, i) => {
              const feature = i === 0 && currentPage === 1;
              return (
                <Link key={post.slug} href={`/catalogo/blog/${post.slug}`} data-lg-reveal
                  style={{ textDecoration: "none", display: "block", gridColumn: feature ? "1 / -1" : "auto" }}>
                  <article className="lg-card flex h-full flex-col overflow-hidden rounded-2xl"
                    style={{ background: "var(--lg-surface)", border: "1px solid var(--lg-ink-faint)", transition: "border-color 0.35s var(--lg-spring), box-shadow 0.35s var(--lg-spring), transform 0.45s var(--lg-spring)" }}>
                    {feature && (
                      <div style={{ height: "clamp(220px, 32vw, 340px)", overflow: "hidden" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.imageUrl} alt={post.imageAlt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col" style={{ padding: feature ? "30px 34px 34px" : "28px" }}>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="lg-label rounded-full px-3 py-1" style={{ fontSize: "8px", letterSpacing: "0.28em", background: "rgba(200,161,100,0.08)", border: "1px solid var(--lg-gold-line)", color: "var(--lg-gold-deep)" }}>{post.category}</span>
                        <span className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.1em", color: "var(--lg-ink-dim)" }}>{formatDate(post.date)}</span>
                      </div>
                      <h2 className="lg-heading" style={{ fontSize: feature ? "clamp(22px, 3vw, 30px)" : "clamp(17px, 2vw, 21px)", color: "var(--lg-ink)", fontWeight: 400, lineHeight: 1.2, marginBottom: "12px" }}>{post.title}</h2>
                      <p style={{ fontSize: "13px", color: "var(--lg-ink-soft)", lineHeight: 1.65 }}>{post.excerpt}</p>
                      <div className="mt-6 flex items-center gap-3">
                        <div className="h-px flex-1" style={{ background: "var(--lg-ink-faint)" }} />
                        <span className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.28em", color: "var(--lg-gold-deep)" }}>{post.readMinutes} min</span>
                        <span style={{ color: "var(--lg-gold-deep)", fontSize: "11px" }}>→</span>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav className="mt-16 flex items-center justify-center gap-2" aria-label="Paginación">
              {currentPage > 1 && (
                <Link href={`/catalogo/blog?page=${currentPage - 1}`} className="lg-label"
                  style={{ padding: "9px 16px", borderRadius: "99px", background: "var(--lg-surface)", border: "1px solid var(--lg-ink-faint)", color: "var(--lg-ink-soft)", fontSize: "9px", letterSpacing: "0.24em", textDecoration: "none" }}>← Anterior</Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link key={p} href={`/catalogo/blog?page=${p}`} className="lg-num flex items-center justify-center"
                  style={{ width: "38px", height: "38px", borderRadius: "99px", fontSize: "11px",
                    background: p === currentPage ? "var(--lg-vault)" : "var(--lg-surface)",
                    border: `1px solid ${p === currentPage ? "var(--lg-vault)" : "var(--lg-ink-faint)"}`,
                    color: p === currentPage ? "var(--lg-light)" : "var(--lg-ink-soft)", textDecoration: "none" }}>{p}</Link>
              ))}
              {currentPage < totalPages && (
                <Link href={`/catalogo/blog?page=${currentPage + 1}`} className="lg-label"
                  style={{ padding: "9px 16px", borderRadius: "99px", background: "var(--lg-surface)", border: "1px solid var(--lg-ink-faint)", color: "var(--lg-ink-soft)", fontSize: "9px", letterSpacing: "0.24em", textDecoration: "none" }}>Siguiente →</Link>
              )}
            </nav>
          )}
        </div>
      </main>

      <CatalogFooter compact />
    </div>
  );
}
