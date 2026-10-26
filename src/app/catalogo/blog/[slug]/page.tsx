import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, BLOG_POSTS } from "../data";
import { CatalogFooter } from "../../catalog-footer";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Post no encontrado" };
  return {
    title: `${post.title} · Lingot`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, images: [post.imageUrl], type: "article", publishedTime: post.date },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: post.title, description: post.excerpt, datePublished: post.date, image: post.imageUrl,
    author: { "@type": "Organization", name: "Lingot" }, publisher: { "@type": "Organization", name: "Lingot" },
  };

  const idx  = BLOG_POSTS.findIndex((p) => p.slug === post.slug);
  const prev = idx < BLOG_POSTS.length - 1 ? BLOG_POSTS[idx + 1] : null;
  const next = idx > 0                     ? BLOG_POSTS[idx - 1] : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="lg-scope" style={{ background: "var(--lg-paper)", minHeight: "100dvh" }}>
        <div aria-hidden className="lg-grain" />

        {/* ── Hero: imagen bajo la bóveda ─────────────────────────────────── */}
        <header className="relative overflow-hidden" style={{ minHeight: "clamp(420px, 60vh, 640px)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageUrl} alt={post.imageAlt}
            className="absolute inset-0 h-full w-full" style={{ objectFit: "cover", display: "block" }} />
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(6,39,47,0.55) 0%, rgba(6,39,47,0.35) 40%, rgba(6,39,47,0.88) 100%)" }} />
          <div className="relative mx-auto flex h-full max-w-3xl flex-col justify-end px-6 sm:px-8"
            style={{ minHeight: "clamp(420px, 60vh, 640px)", paddingTop: "120px", paddingBottom: "clamp(48px, 7vw, 80px)", zIndex: 2 }}>
            <Link href="/catalogo/blog" className="lg-label mb-8 inline-flex items-center gap-2"
              style={{ fontSize: "9px", letterSpacing: "0.28em", color: "var(--lg-light-soft)", textDecoration: "none" }}>← Volver a análisis</Link>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="lg-label rounded-full px-3 py-1" style={{ fontSize: "8px", letterSpacing: "0.28em", background: "rgba(200,161,100,0.14)", border: "1px solid var(--lg-gold-line)", color: "var(--lg-gold-bright)" }}>{post.category}</span>
              <span className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.1em", color: "var(--lg-light-dim)" }}>{formatDate(post.date)} · {post.readMinutes} min</span>
            </div>
            <h1 className="lg-display" style={{ fontSize: "clamp(30px, 5vw, 60px)", color: "var(--lg-light)", fontWeight: 300, lineHeight: 1.05, maxWidth: "20ch" }}>{post.title}</h1>
          </div>
        </header>

        {/* ── Cuerpo ──────────────────────────────────────────────────────── */}
        <article className="px-6" style={{ paddingTop: "clamp(56px, 8vw, 88px)", paddingBottom: "clamp(80px, 12vw, 120px)" }}>
          <div className="mx-auto max-w-2xl">
            <p className="lg-heading" style={{ fontSize: "clamp(17px, 2.2vw, 22px)", color: "var(--lg-ink-soft)", fontWeight: 300, lineHeight: 1.55, marginBottom: "40px", paddingBottom: "40px", borderBottom: "1px solid var(--lg-gold-line)" }}>
              {post.excerpt}
            </p>

            <div className="blog-body" dangerouslySetInnerHTML={{ __html: post.content }} />

            <div className="mt-16 flex items-center gap-4">
              <div className="h-px flex-1" style={{ background: "linear-gradient(to right, var(--lg-gold-line), transparent)" }} />
              <span style={{ color: "var(--lg-gold-deep)", fontSize: "10px" }}>✦</span>
              <div className="h-px flex-1" style={{ background: "linear-gradient(to left, var(--lg-gold-line), transparent)" }} />
            </div>

            <nav className="mt-12 grid gap-4 sm:grid-cols-2">
              {prev && (
                <Link href={`/catalogo/blog/${prev.slug}`} style={{ textDecoration: "none" }}>
                  <div className="lg-card rounded-2xl p-6" style={{ background: "var(--lg-surface)", border: "1px solid var(--lg-ink-faint)", transition: "border-color 0.35s var(--lg-spring), box-shadow 0.35s var(--lg-spring), transform 0.45s var(--lg-spring)" }}>
                    <div className="lg-label mb-2" style={{ fontSize: "8px", letterSpacing: "0.28em", color: "var(--lg-ink-dim)" }}>← Anterior</div>
                    <div className="lg-heading" style={{ fontSize: "14px", color: "var(--lg-ink)", fontWeight: 400, lineHeight: 1.3 }}>{prev.title}</div>
                  </div>
                </Link>
              )}
              {next && (
                <Link href={`/catalogo/blog/${next.slug}`} style={{ textDecoration: "none", gridColumn: prev ? "auto" : "2 / 3" }}>
                  <div className="lg-card rounded-2xl p-6" style={{ background: "var(--lg-surface)", border: "1px solid var(--lg-ink-faint)", textAlign: "right", transition: "border-color 0.35s var(--lg-spring), box-shadow 0.35s var(--lg-spring), transform 0.45s var(--lg-spring)" }}>
                    <div className="lg-label mb-2" style={{ fontSize: "8px", letterSpacing: "0.28em", color: "var(--lg-ink-dim)" }}>Siguiente →</div>
                    <div className="lg-heading" style={{ fontSize: "14px", color: "var(--lg-ink)", fontWeight: 400, lineHeight: 1.3 }}>{next.title}</div>
                  </div>
                </Link>
              )}
            </nav>
          </div>
        </article>

        <CatalogFooter compact />
      </div>

      <style>{`
        .blog-body { color: var(--lg-ink-soft); line-height: 1.82; font-size: clamp(15px, 1.8vw, 17px); }
        .blog-body h2 { font-weight: 400; font-size: clamp(21px, 3vw, 28px); color: var(--lg-ink); margin: 2.5em 0 0.7em; letter-spacing: -0.02em; line-height: 1.15; }
        .blog-body h3 { font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.22em; color: var(--lg-gold-deep); margin: 2.2em 0 0.6em; }
        .blog-body p { margin: 0 0 1.4em; }
        .blog-body p:last-child { margin-bottom: 0; }
        .blog-body strong { color: var(--lg-ink); font-weight: 600; }
        .blog-body em { font-style: italic; color: var(--lg-ink); }
        .blog-body a { color: var(--lg-gold-deep); text-decoration: underline; text-underline-offset: 3px; }
      `}</style>
    </>
  );
}
