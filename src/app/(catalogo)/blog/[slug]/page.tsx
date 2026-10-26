import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getPostBySlug } from "../data";
import { LabBlogArticle } from "../../lab-blog";
import { JsonLd, PUBLISHER_LD, SITE_URL, breadcrumbLd, pageMeta } from "../../lab-seo";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Artículo no encontrado", robots: { index: false } };
  return pageMeta({
    title:       post.title,
    description: post.excerpt,
    path:        `/blog/${post.slug}`,
    image:       { url: post.imageUrl, width: 1200, alt: post.imageAlt },
    article:     { publishedTime: post.date, section: post.category },
  });
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type":          "BlogPosting",
        "@id":            `${url}#articulo`,
        mainEntityOfPage: url,
        url,
        headline:         post.title,
        description:      post.excerpt,
        image:            [post.imageUrl],
        datePublished:    post.date,
        dateModified:     post.date,
        articleSection:   post.category,
        inLanguage:       "es-ES",
        timeRequired:     `PT${post.readMinutes}M`,
        author:           PUBLISHER_LD,
        publisher:        PUBLISHER_LD,
      },
      breadcrumbLd([
        { name: "Análisis", path: "/blog" },
        { name: post.title, path: `/blog/${post.slug}` },
      ]),
    ],
  };

  // BLOG_POSTS va de más reciente a más antiguo: «anterior» es el siguiente del array
  const idx  = BLOG_POSTS.findIndex((p) => p.slug === post.slug);
  const card = (p: (typeof BLOG_POSTS)[number] | undefined) => {
    if (!p) return null;
    const { content: _content, ...rest } = p;
    return rest;
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <LabBlogArticle
        post={post}
        prev={card(BLOG_POSTS[idx + 1])}
        next={idx > 0 ? card(BLOG_POSTS[idx - 1]) : null}
      />
    </>
  );
}
