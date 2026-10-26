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
  notice:     `${BASE}/aviso-legal`,
  privacy:    `${BASE}/privacidad`,
  cookies:    `${BASE}/cookies`,
  terms:      `${BASE}/condiciones`,
};

/** Los textos legales en el orden del pie. `key` es la clave corta del
 *  diccionario; con «Full» delante del cierre, el título completo. */
export const LEGAL_LINKS = [
  { doc: "notice",  href: LAB_PATHS.notice,  key: "lg.notice" },
  { doc: "privacy", href: LAB_PATHS.privacy, key: "lg.privacy" },
  { doc: "cookies", href: LAB_PATHS.cookies, key: "lg.cookies" },
  { doc: "terms",   href: LAB_PATHS.terms,   key: "lg.terms" },
] as const;

export type LegalDoc = (typeof LEGAL_LINKS)[number]["doc"];
