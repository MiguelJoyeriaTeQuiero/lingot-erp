import type { Metadata } from "next";
import { TITULAR } from "./lab-legal-data";
import { DICT } from "./lab-i18n";

/* ═══════════════════════════════════════════════════════════════════════════
   SEO del catálogo: dominio canónico, metadatos por página y datos
   estructurados (schema.org). Sin "use client": lo usan las páginas y los
   archivos de metadatos (robots, sitemap), todos de servidor.

   Las palabras clave van donde Google las lee —título, descripción, H1, texto
   y datos estructurados—, no en <meta name="keywords">, que Google ignora y
   otros buscadores tratan como señal de spam.

   El catálogo se sirve en español a los buscadores (el idioma lo cambia el
   navegador, sobre la misma URL), así que todo esto va en español.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Dominio canónico: lingot.vip redirige (308) a www. */
export const SITE_URL = "https://www.lingot.vip";
export const SITE_NAME = "Lingot";

/** Imagen para compartir por defecto (1200 × 630): public/og.png, estática a
 *  propósito (sin generarla en cada petición ni depender de next/og). */
export const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Lingot · Oro y plata de inversión en Tenerife",
};

export const HOME_TITLE = "Comprar oro y plata de inversión en Tenerife · Lingot";
export const HOME_DESCRIPTION =
  "Lingotes y monedas de oro y plata de inversión en Tenerife, con certificado de pureza y precio sobre el spot cada hora. Argor-Heraeus, Metalor, Krugerrand.";

/** Verificación de Google Search Console (propiedad https://www.lingot.vip/).
 *  Tiene que seguir publicada: si se quita, la propiedad deja de estar
 *  verificada. */
export const GOOGLE_SITE_VERIFICATION = "dDq52ys7OqnZGySyz5CyXVVZVftN8MWVHdUEuEx2SL0";

type OgImage = { url: string; width?: number; height?: number; alt?: string };

/**
 * Metadatos completos de una página. Open Graph y Twitter se escriben enteros
 * en cada una porque Next.js no los fusiona con los del layout: los sustituye.
 */
export function pageMeta({
  title, description, path, image = OG_IMAGE, noindex = false, article,
}: {
  /** Sin «· Lingot»: lo añade la plantilla del layout. */
  title:        string | { absolute: string };
  description:  string;
  /** Ruta canónica, empezando por «/». */
  path:         string;
  image?:       OgImage;
  noindex?:     boolean;
  article?:     { publishedTime: string; section?: string };
}): Metadata {
  const fullTitle = typeof title === "string" ? `${title} · ${SITE_NAME}` : title.absolute;
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(noindex && { robots: { index: false, follow: true } }),
    openGraph: {
      type:        article ? "article" : "website",
      url:         path,
      siteName:    SITE_NAME,
      locale:      "es_ES",
      title:       fullTitle,
      description,
      images:      [image],
      ...(article && { publishedTime: article.publishedTime, section: article.section }),
    },
    twitter: {
      card:        "summary_large_image",
      title:       fullTitle,
      description,
      images:      [image.url],
    },
  };
}

/* ── Datos estructurados ─────────────────────────────────────────────── */

export const STORE_ID = `${SITE_URL}/#tienda`;
const WEBSITE_ID = `${SITE_URL}/#web`;
/** PNG cuadrado de 512 px: Google prefiere un mapa de bits como logo. */
const LOGO_URL = `${SITE_URL}/logo-lingot.png`;

type Ld = Record<string, unknown>;

/** <script type="application/ld+json">; el «<» se escapa para que ningún
 *  texto pueda cerrar la etiqueta. */
export function JsonLd({ data }: { data: Ld }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/**
 * La tienda y la web, enlazadas por @id: cualquier página puede referirse a
 * ellas con { "@id": STORE_ID } sin repetir los datos. Solo hechos que constan
 * (lab-legal-data, la portada); nada de valoraciones ni horarios inventados.
 */
export function siteGraphLd(extra: Ld[] = []): Ld {
  const d = TITULAR.direccion;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type":       "Store",
        "@id":         STORE_ID,
        name:          SITE_NAME,
        legalName:     TITULAR.razonSocial,
        taxID:         TITULAR.nif,
        url:           SITE_URL,
        logo:          LOGO_URL,
        image:         `${SITE_URL}${OG_IMAGE.url}`,
        description:   HOME_DESCRIPTION,
        telephone:     TITULAR.telefonoHref.replace("tel:", ""),
        email:         TITULAR.email,
        currenciesAccepted: "EUR",
        address: {
          "@type":         "PostalAddress",
          streetAddress:   d.calle,
          addressLocality: d.localidad,
          addressRegion:   d.provincia,
          addressCountry:  d.pais,
          ...(d.cp && { postalCode: d.cp }),
        },
        areaServed: [
          { "@type": "AdministrativeArea", name: "Canarias" },
          { "@type": "Country", name: "España" },
        ],
        parentOrganization: {
          "@type":          "Organization",
          name:             TITULAR.grupo,
          foundingDate:     "1988",
          foundingLocation: { "@type": "Place", name: "Tenerife" },
        },
        knowsAbout: [
          "Oro de inversión", "Plata de inversión", "Lingotes de oro",
          "Monedas de oro", "Lingotes de plata", "Monedas de plata",
        ],
      },
      {
        "@type":     "WebSite",
        "@id":       WEBSITE_ID,
        url:         SITE_URL,
        name:        SITE_NAME,
        inLanguage:  "es-ES",
        publisher:   { "@id": STORE_ID },
      },
      ...extra,
    ],
  };
}

/** Miga de pan: Inicio › … › página actual. */
export function breadcrumbLd(items: { name: string; path: string }[]): Ld {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Inicio", path: "/" }, ...items].map((it, i) => ({
      "@type":  "ListItem",
      position: i + 1,
      name:     it.name,
      item:     `${SITE_URL}${it.path}`,
    })),
  };
}

/** Una página interior: su tipo, su miga de pan y la tienda que la publica. */
export function pageLd({
  type = "WebPage", name, description, path, crumbs,
}: {
  type?:       string;
  name:        string;
  description: string;
  path:        string;
  crumbs:      { name: string; path: string }[];
}): Ld {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type":     type,
        "@id":       `${SITE_URL}${path}#pagina`,
        url:         `${SITE_URL}${path}`,
        name,
        description,
        inLanguage:  "es-ES",
        isPartOf:    { "@id": WEBSITE_ID },
        publisher:   { "@id": STORE_ID },
      },
      breadcrumbLd(crumbs),
    ],
  };
}

/** Preguntas frecuentes de la portada, en el orden de faqItems
 *  (lab-experience.tsx): el marcado tiene que decir lo mismo que la página. */
export function faqLd(): Ld {
  const es = DICT.es;
  const say = (k: string) => es[k] ?? "";
  // Las viñetas se leen como una frase: «a; b; c.»
  const list = (...keys: string[]) => keys.map((k) => say(k).replace(/\.$/, "")).join("; ");
  const qa: [string, string][] = [
    [say("faq.q6"), say("faq.a6")],
    [say("faq.q1"), say("faq.a1")],
    [say("faq.q2"), say("faq.a2")],
    [say("faq.q3"), `${say("faq.a3a")} ${list("faq.a3l1", "faq.a3l2", "faq.a3l3")}. ${say("faq.a3b")}`],
    [say("faq.q4"), `${say("faq.a4a")} ${list("faq.a4l1", "faq.a4l2", "faq.a4l3")}. ${say("faq.a4b")}`],
    [say("faq.q5"), `${say("faq.a5a")} ${list("faq.a5l1", "faq.a5l2")}. ${say("faq.a5b")}`],
  ];
  return {
    "@type": "FAQPage",
    "@id":   `${SITE_URL}/#preguntas`,
    mainEntity: qa.map(([q, a]) => ({
      "@type": "Question",
      name:    q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export const PUBLISHER_LD: Ld = {
  "@type": "Organization",
  "@id":   STORE_ID,
  name:    SITE_NAME,
  url:     SITE_URL,
  logo:    { "@type": "ImageObject", url: LOGO_URL },
};
