/**
 * Rutas del catálogo en un solo sitio. Cuando el Lab pase a /catalogo (y
 * después a la raíz), solo cambia BASE.
 */
const BASE = "/catalogo";

export const LAB_PATHS = {
  home:       BASE,
  collection: `${BASE}#coleccion`,
  about:      `${BASE}/nosotros`,
  blog:       `${BASE}/blog`,
  account:    `${BASE}/mi-cuenta`,
  post:       (slug: string) => `${BASE}/blog/${slug}`,
  blogPage:   (page: number) => (page <= 1 ? `${BASE}/blog` : `${BASE}/blog?page=${page}`),
};
