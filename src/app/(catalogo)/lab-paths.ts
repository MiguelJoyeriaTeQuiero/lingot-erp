/**
 * Rutas del catálogo en un solo sitio. El catálogo vive en la raíz de la web
 * (lingot.vip); si algún día cambia de sitio, solo cambia BASE.
 */
const BASE = "";

export const LAB_PATHS = {
  home:       BASE || "/",
  collection: `${BASE || "/"}#coleccion`,
  about:      `${BASE}/nosotros`,
  blog:       `${BASE}/blog`,
  account:    `${BASE}/mi-cuenta`,
  post:       (slug: string) => `${BASE}/blog/${slug}`,
  blogPage:   (page: number) => (page <= 1 ? `${BASE}/blog` : `${BASE}/blog?page=${page}`),
};
