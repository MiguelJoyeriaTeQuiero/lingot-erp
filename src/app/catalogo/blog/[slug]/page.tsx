import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, BLOG_POSTS } from "../data";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Post no encontrado" };
  return {
    title:       `${post.title} · Lingot`,
    description: post.excerpt,
    openGraph: {
      title:       post.title,
      description: post.excerpt,
      images:      [post.imageUrl],
      type:        "article",
      publishedTime: post.date,
    },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const jsonLd = {
    "@context":          "https://schema.org",
    "@type":             "Article",
    headline:            post.title,
    description:         post.excerpt,
    datePublished:       post.date,
    image:               post.imageUrl,
    author: {
      "@type": "Organization",
      name:    "Lingot",
    },
    publisher: {
      "@type": "Organization",
      name:    "Lingot",
    },
  };

  // Get adjacent posts for navigation
  const idx  = BLOG_POSTS.findIndex((p) => p.slug === post.slug);
  const prev = idx < BLOG_POSTS.length - 1 ? BLOG_POSTS[idx + 1] : null;
  const next = idx > 0                     ? BLOG_POSTS[idx - 1] : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ background: "#F9F4EC", minHeight: "100dvh" }}>
        <div aria-hidden className="catalog-grain-overlay" />

        {/* ── Hero image ──────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden"
          style={{ height: "clamp(220px, 35vw, 480px)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={post.imageAlt}
            style={{
              width:      "100%",
              height:     "100%",
              objectFit:  "cover",
              display:    "block",
              mixBlendMode: "multiply",
            }}
          />
          {/* Gradient fade to parchment */}
          <div
            aria-hidden
            style={{
              position:   "absolute",
              inset:      0,
              background: "linear-gradient(to bottom, rgba(249,244,236,0.10) 0%, transparent 30%, rgba(249,244,236,0.70) 100%)",
            }}
          />
          {/* Top gradient for nav visibility */}
          <div
            aria-hidden
            style={{
              position:   "absolute",
              top:        0,
              left:       0,
              right:      0,
              height:     "120px",
              background: "linear-gradient(to bottom, rgba(249,244,236,0.60), transparent)",
            }}
          />
        </div>

        {/* ── Article ─────────────────────────────────────────────────── */}
        <article
          className="px-6"
          style={{
            paddingTop:    "clamp(48px, 6vw, 72px)",
            paddingBottom: "clamp(80px, 12vw, 120px)",
          }}
        >
          <div className="mx-auto max-w-2xl">
            {/* Back */}
            <Link
              href="/catalogo/blog"
              className="font-mono text-[9px] uppercase tracking-[0.28em]"
              style={{
                color:          "rgba(10,31,43,0.35)",
                textDecoration: "none",
                display:        "inline-flex",
                alignItems:     "center",
                gap:            "6px",
                marginBottom:   "32px",
              }}
            >
              ← Volver al blog
            </Link>

            {/* Category + date */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
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
                style={{ color: "rgba(10,31,43,0.30)" }}>
                {formatDate(post.date)}
              </span>
              <span className="font-mono text-[8px]"
                style={{ color: "rgba(10,31,43,0.25)" }}>
                · {post.readMinutes} min de lectura
              </span>
            </div>

            {/* Title */}
            <h1
              className="font-serif font-light"
              style={{
                fontSize:      "clamp(28px, 4.5vw, 52px)",
                color:         "#0a1f2b",
                lineHeight:    1.1,
                letterSpacing: "-0.02em",
                marginBottom:  "20px",
              }}
            >
              {post.title}
            </h1>

            {/* Excerpt */}
            <p
              className="font-serif italic"
              style={{
                fontSize:     "clamp(15px, 2vw, 18px)",
                color:        "rgba(10,31,43,0.50)",
                lineHeight:   1.60,
                marginBottom: "40px",
                paddingBottom: "40px",
                borderBottom: "1px solid rgba(154,114,48,0.15)",
              }}
            >
              {post.excerpt}
            </p>

            {/* Body */}
            <div
              className="blog-body"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Divider */}
            <div className="mt-16 flex items-center gap-4">
              <div className="h-px flex-1"
                style={{ background: "linear-gradient(to right, rgba(154,114,48,0.30), transparent)" }} />
              <span style={{ color: "rgba(154,114,48,0.30)", fontSize: "10px" }}>✦</span>
              <div className="h-px flex-1"
                style={{ background: "linear-gradient(to left, rgba(154,114,48,0.30), transparent)" }} />
            </div>

            {/* Post navigation */}
            <nav className="mt-12 grid gap-4 sm:grid-cols-2">
              {prev && (
                <Link href={`/catalogo/blog/${prev.slug}`} style={{ textDecoration: "none" }}>
                  <div
                    className="post-nav-card"
                    style={{
                      padding:      "3px",
                      borderRadius: "16px",
                      background:   "rgba(154,114,48,0.03)",
                    }}
                  >
                    <div style={{
                      borderRadius: "13px",
                      background:   "#FFFFFF",
                      padding:      "20px",
                      boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
                    }}>
                      <div className="font-mono text-[8px] uppercase tracking-[0.28em] mb-2"
                        style={{ color: "rgba(10,31,43,0.28)" }}>← Anterior</div>
                      <div className="font-serif font-light text-[14px]"
                        style={{ color: "#0a1f2b", lineHeight: 1.3 }}>
                        {prev.title}
                      </div>
                    </div>
                  </div>
                </Link>
              )}
              {next && (
                <Link href={`/catalogo/blog/${next.slug}`}
                  style={{ textDecoration: "none", gridColumn: prev ? "auto" : "2 / 3" }}>
                  <div
                    className="post-nav-card"
                    style={{
                      padding:      "3px",
                      borderRadius: "16px",
                      background:   "rgba(154,114,48,0.03)",
                    }}
                  >
                    <div style={{
                      borderRadius: "13px",
                      background:   "#FFFFFF",
                      padding:      "20px",
                      boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
                      textAlign:    "right",
                    }}>
                      <div className="font-mono text-[8px] uppercase tracking-[0.28em] mb-2"
                        style={{ color: "rgba(10,31,43,0.28)" }}>Siguiente →</div>
                      <div className="font-serif font-light text-[14px]"
                        style={{ color: "#0a1f2b", lineHeight: 1.3 }}>
                        {next.title}
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            </nav>
          </div>
        </article>

        {/* ── Footer ──────────────────────────────────────────────────── */}
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

      <style>{`
        .blog-body { color: rgba(10,31,43,0.65); line-height: 1.80; font-size: clamp(14px, 1.8vw, 16px); }
        .blog-body h2 {
          font-family: var(--font-catalog-serif, Georgia, serif);
          font-weight: 300;
          font-size: clamp(20px, 3vw, 26px);
          color: #0a1f2b;
          margin: 2.5em 0 0.75em;
          letter-spacing: -0.01em;
          line-height: 1.15;
        }
        .blog-body h3 {
          font-family: monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: rgba(154,114,48,0.70);
          margin: 2em 0 0.60em;
        }
        .blog-body p { margin: 0 0 1.4em; }
        .blog-body p:last-child { margin-bottom: 0; }
        .blog-body strong { color: #0a1f2b; font-weight: 500; }
        .blog-body em { font-style: italic; color: rgba(10,31,43,0.75); }
      `}</style>
    </>
  );
}
