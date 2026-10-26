import type { MetadataRoute } from "next";
import { SITE_URL } from "./(catalogo)/lab-seo";
import { BLOG_POSTS } from "./(catalogo)/blog/data";
import { LEGAL_UPDATED } from "./(catalogo)/lab-legal-data";

/* Solo lo indexable: ni /mi-cuenta (noindex) ni el ERP. Google ignora la
   prioridad y la frecuencia; lo que usa es lastModified, así que va con fechas
   reales: la portada cambia cada hora (precios), los artículos y los textos
   legales, el día que se publicaron. */

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const newest = BLOG_POSTS.map((p) => p.date).sort().pop();
  const legal = new Date(`${LEGAL_UPDATED}T12:00:00Z`);

  return [
    { url: `${SITE_URL}/`,         lastModified: now, changeFrequency: "hourly",  priority: 1 },
    { url: `${SITE_URL}/nosotros`, changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${SITE_URL}/blog`,
      ...(newest && { lastModified: new Date(newest) }),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...BLOG_POSTS.map((p) => ({
      url:             `${SITE_URL}/blog/${p.slug}`,
      lastModified:    new Date(p.date),
      changeFrequency: "yearly" as const,
      priority:        0.6,
    })),
    ...["/aviso-legal", "/privacidad", "/cookies", "/condiciones"].map((path) => ({
      url:             `${SITE_URL}${path}`,
      lastModified:    legal,
      changeFrequency: "yearly" as const,
      priority:        0.2,
    })),
  ];
}
