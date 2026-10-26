import { BLOG_POSTS, getPaginatedPosts } from "./data";
import { LabBlogIndex } from "../lab-blog";
import { JsonLd, pageLd, pageMeta } from "../lab-seo";

const TITLE = "Análisis del mercado del oro y la plata";
const DESCRIPTION =
  "Análisis y noticias sobre el mercado del oro y la plata: tipos de interés, inflación, geopolítica y factores que mueven el precio de los metales preciosos.";

/** Cada página del listado es canónica de sí misma; la primera, sin ?page. */
const pathFor = (page: number) => (page > 1 ? `/blog?page=${page}` : "/blog");

export function generateMetadata({ searchParams }: { searchParams: { page?: string } }) {
  const page = parseInt(searchParams.page ?? "1", 10) || 1;
  return pageMeta({
    title:       page > 1 ? `${TITLE} (página ${page})` : TITLE,
    description: DESCRIPTION,
    path:        pathFor(page),
  });
}

export default function BlogPage({ searchParams }: { searchParams: { page?: string } }) {
  const { posts, totalPages, currentPage } = getPaginatedPosts(parseInt(searchParams.page ?? "1", 10) || 1);

  return (
    <>
      <JsonLd data={pageLd({
        type: "CollectionPage", name: TITLE, description: DESCRIPTION, path: pathFor(currentPage),
        crumbs: [{ name: "Análisis", path: "/blog" }],
      })} />
      <LabBlogIndex
        // El cuerpo de cada artículo no viaja al listado
        posts={posts.map(({ content: _content, ...card }) => card)}
        total={BLOG_POSTS.length}
        currentPage={currentPage}
        totalPages={totalPages}
      />
    </>
  );
}
