import type { Metadata } from "next";
import { BLOG_POSTS, getPaginatedPosts } from "./data";
import { LabBlogIndex } from "../lab-blog";

export const metadata: Metadata = {
  title: "Análisis · Lingot — Metales Preciosos",
  description:
    "Análisis y noticias sobre el mercado del oro y la plata: tipos de interés, inflación, geopolítica y factores que mueven el precio de los metales preciosos.",
};

export default function BlogPage({ searchParams }: { searchParams: { page?: string } }) {
  const { posts, totalPages, currentPage } = getPaginatedPosts(parseInt(searchParams.page ?? "1", 10) || 1);

  return (
    <LabBlogIndex
      // El cuerpo de cada artículo no viaja al listado
      posts={posts.map(({ content: _content, ...card }) => card)}
      total={BLOG_POSTS.length}
      currentPage={currentPage}
      totalPages={totalPages}
    />
  );
}
