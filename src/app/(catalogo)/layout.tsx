import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { THEME_BOOTSTRAP } from "./lab-theme-boot";
import { LANG_BOOTSTRAP } from "./lab-i18n";
import { LabConsent } from "./lab-consent";
import { HOME_DESCRIPTION, HOME_TITLE, OG_IMAGE, SITE_NAME, SITE_URL } from "./lab-seo";
import "./lab.css";

// Open Sauce Sans — superfamilia única de la marca. El drama tipográfico nace
// de la escala y el peso, nunca de una serif ornamentada.
const openSauce = localFont({
  src: [
    { path: "../../../public/fonts/open-sauce-sans-300.woff2", weight: "300", style: "normal" },
    { path: "../../../public/fonts/open-sauce-sans-400.otf",   weight: "400", style: "normal" },
    { path: "../../../public/fonts/open-sauce-sans-500.woff2", weight: "500", style: "normal" },
    { path: "../../../public/fonts/open-sauce-sans-600.woff2", weight: "600", style: "normal" },
    { path: "../../../public/fonts/open-sauce-sans-700.woff2", weight: "700", style: "normal" },
    { path: "../../../public/fonts/open-sauce-sans-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-lab",
  display: "swap",
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
});

// Valores de partida del catálogo. Cada página pone los suyos con pageMeta
// (lab-seo.tsx); esto cubre lo que ninguna sobrescribe. El layout raíz es
// noindex (el ERP no debe salir en Google): aquí se reabre para el catálogo.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: `%s · ${SITE_NAME}` },
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: { type: "website", siteName: SITE_NAME, locale: "es_ES", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image" },
};

/** Sin JavaScript no hay motor de movimiento: el contenido debe verse igual. */
const NO_JS = `
  .lab-curtain { display: none !important; }
  .lab-hero * { animation-play-state: running !important; }
  [data-lab-in] { opacity: 1 !important; transform: none !important; filter: none !important; }
  .lab-mask > * { transform: none !important; }
`;

export default function CatalogoLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${openSauce.variable} lab-scope`} suppressHydrationWarning>
      {/* Antes de pintar: si no, quien tenga el tema plata vería un fogonazo oscuro */}
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <script dangerouslySetInnerHTML={{ __html: LANG_BOOTSTRAP }} />
      <noscript><style>{NO_JS}</style></noscript>
      {children}
      {/* Después de la página: así sabe si hay cortina de entrada que esperar */}
      <LabConsent />
    </div>
  );
}
