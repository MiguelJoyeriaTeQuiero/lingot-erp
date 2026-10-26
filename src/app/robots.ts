import type { MetadataRoute } from "next";
import { SITE_URL } from "./(catalogo)/lab-seo";

/* La web pública se rastrea entera. El ERP queda fuera: pide sesión y no
   aporta nada a un buscador. /mi-cuenta y /login no se bloquean aquí a
   propósito: llevan noindex en la propia página, y un bloqueo en robots.txt
   impediría a Google leerlo (la URL podría salir en resultados sin contenido). */

const ERP = [
  "/dashboard", "/clientes", "/documentos", "/inventario", "/libro",
  "/rentabilidad", "/reservas", "/accesos", "/configuracion",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", ...ERP] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
