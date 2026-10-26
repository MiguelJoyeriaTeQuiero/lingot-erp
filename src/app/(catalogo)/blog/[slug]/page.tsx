import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getPostBySlug } from "../data";
import { LabBlogArticle } from "../../lab-blog";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Artículo no encontrado" };
  return {
    title: `${post.title} · Lingot`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, images: [post.imageUrl], type: "article", publishedTime: post.date },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: post.title, description: post.excerpt, datePublished: post.date, image: post.imageUrl,
    author: { "@type": "Organization", name: "Lingot" }, publisher: { "@type": "Organization", name: "Lingot" },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LabBlogArticle
        post={post}
        prev={card(BLOG_POSTS[idx + 1])}
        next={idx > 0 ? card(BLOG_POSTS[idx - 1]) : null}
      />
    </>
  );
}
