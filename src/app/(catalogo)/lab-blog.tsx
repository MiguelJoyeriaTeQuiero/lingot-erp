"use client";

import Link from "next/link";
import type { BlogPost } from "./blog/data";
import { useLabLang } from "./lab-lang";
import { LabMotion } from "./lab-motion";
import { LabFoot, LabSubNav } from "./lab-chrome";
import { Eyebrow, Rise } from "./lab-parts";
import { LAB_PATHS } from "./lab-paths";

/* ═══════════════════════════════════════════════════════════════════════════
   Blog («Análisis»). La interfaz va en los tres idiomas; los artículos están
   escritos en español y así se publican, con un aviso para quien navega en
   otro idioma. Traducirlos sería otro contenido, no un diccionario.
   ═══════════════════════════════════════════════════════════════════════════ */

type Vars = React.CSSProperties & Record<string, string | number>;

type PostCard = Omit<BlogPost, "content">;

function Atmos() {
  return (
    <div className="lab-atmos" aria-hidden>
      <i className="lab-atmos-frio" />
      <i className="lab-atmos-hondo" />
      <i className="lab-atmos-oro" />
    </div>
  );
}

/** Aviso de idioma: solo aparece fuera del español. */
function SpanishOnly() {
  const { lang, t } = useLabLang();
  if (lang === "es") return null;
  return <p className="lab-blog-lang lab-label">{t("blog.esOnly")}</p>;
}

export function LabBlogIndex({
  posts, total, currentPage, totalPages,
}: {
  posts:       PostCard[];
  total:       number;
  currentPage: number;
  totalPages:  number;
}) {
  const { t, date } = useLabLang();
  const fmt = (iso: string) => date(iso, { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <LabMotion curtain={false} />
      <Atmos />
      <LabSubNav current="blog" />

      <header className="lab-page-head" data-lab-track>
        <span className="lab-page-mark" aria-hidden>Au</span>
        <div className="lab-page-head-inner" data-lab-in>
          <Eyebrow>{t("blog.eyebrow")}</Eyebrow>
          <h1 className="lab-page-title">
            <Rise>{t("blog.title")}</Rise>
          </h1>
          <p className="lab-page-lead">{t("blog.lead")}</p>
          <p className="lab-blog-count">
            <span className="lab-num">{String(total).padStart(2, "0")}</span>
            <span className="lab-label">{t("blog.count")}</span>
          </p>
          <SpanishOnly />
        </div>
      </header>

      <main className="lab-blog lab-seam">
        <div className="lab-posts">
          {posts.map((post, i) => {
            const feature = i === 0 && currentPage === 1;
            return (
              <Link
                key={post.slug}
                href={LAB_PATHS.post(post.slug)}
                className={`lab-post${feature ? " lab-post--feature" : ""}`}
                data-lab-in
                style={{ "--d": `${(i % 2) * 90}ms` } as Vars}
              >
                <div className="lab-post-shot">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.imageUrl} alt={post.imageAlt} loading={feature ? "eager" : "lazy"} />
                </div>
                <div className="lab-post-body">
                  <div className="lab-post-meta">
                    <span className="lab-chip">{post.category}</span>
                    <span className="lab-label">{fmt(post.date)}</span>
                  </div>
                  <h2 className="lab-h lab-post-title">{post.title}</h2>
                  <p className="lab-body lab-post-excerpt">{post.excerpt}</p>
                  <div className="lab-post-foot">
                    <i />
                    <span className="lab-label">{t("blog.min", { n: post.readMinutes })}</span>
                    <span aria-hidden>→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {totalPages > 1 && (
          <nav className="lab-pager" aria-label={t("blog.pages")}>
            {currentPage > 1 && (
              <Link href={LAB_PATHS.blogPage(currentPage - 1)} className="lab-pager-step lab-label">← {t("blog.prev")}</Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={LAB_PATHS.blogPage(p)}
                className="lab-pager-n lab-num"
                aria-current={p === currentPage ? "page" : undefined}
              >
                {p}
              </Link>
            ))}
            {currentPage < totalPages && (
              <Link href={LAB_PATHS.blogPage(currentPage + 1)} className="lab-pager-step lab-label">{t("blog.next")} →</Link>
            )}
          </nav>
        )}
      </main>

      <LabFoot />
    </>
  );
}

export function LabBlogArticle({
  post, prev, next,
}: {
  post: BlogPost;
  prev: PostCard | null;
  next: PostCard | null;
}) {
  const { t, date } = useLabLang();
  const fmt = (iso: string) => date(iso, { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <LabMotion curtain={false} />
      <Atmos />
      <LabSubNav current="blog" />

      <header className="lab-article-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lab-article-hero-img" src={post.imageUrl} alt={post.imageAlt} />
        <div className="lab-article-hero-veil" aria-hidden />
        <div className="lab-article-hero-inner">
          <Link href={LAB_PATHS.blog} className="lab-article-back lab-label">← {t("blog.back")}</Link>
          <div className="lab-post-meta">
            <span className="lab-chip">{post.category}</span>
            <span className="lab-label">{fmt(post.date)} · {t("blog.min", { n: post.readMinutes })}</span>
          </div>
          <h1 className="lab-article-title">{post.title}</h1>
        </div>
      </header>

      <article className="lab-article">
        <SpanishOnly />
        <p className="lab-article-lead">{post.excerpt}</p>
        {/* Contenido propio del repositorio (blog/data.ts), no de usuarios */}
        <div className="lab-prose" dangerouslySetInnerHTML={{ __html: post.content }} />

        <div className="lab-hero-rule lab-article-rule" aria-hidden>
          <i /><span style={{ fontSize: 8, color: "var(--lab-metal)" }}>✦</span><i />
        </div>

        {/* Del análisis a la pieza: el enlace interno que lleva a la colección */}
        <aside className="lab-article-cta">
          <p className="lab-body">{t("blog.ctaLead")}</p>
          <Link href={LAB_PATHS.collection} className="lab-cta">{t("blog.ctaBtn")}</Link>
        </aside>

        {(prev || next) && (
          <nav className="lab-article-nav" aria-label={t("blog.more")}>
            {prev ? (
              <Link href={LAB_PATHS.post(prev.slug)} className="lab-article-step">
                <span className="lab-label">← {t("blog.prev")}</span>
                <span className="lab-h">{prev.title}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link href={LAB_PATHS.post(next.slug)} className="lab-article-step lab-article-step--next">
                <span className="lab-label">{t("blog.next")} →</span>
                <span className="lab-h">{next.title}</span>
              </Link>
            )}
          </nav>
        )}
      </article>

      <LabFoot />
    </>
  );
}
