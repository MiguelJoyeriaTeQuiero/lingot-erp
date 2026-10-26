import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { THEME_BOOTSTRAP } from "./lab-theme-boot";
import { LANG_BOOTSTRAP } from "./lab-i18n";
import { LabConsent } from "./lab-consent";
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

// Las páginas interiores ponen su propio título; esto vale para la portada
export const metadata: Metadata = {
  title: "Lingot — Metales preciosos de alta pureza",
  description:
    "Oro y plata de alta pureza con precio calculado sobre el spot del momento. Lingot, de Te Quiero Group.",
  openGraph: {
    title: "Lingot — Metales preciosos de alta pureza",
    description: "Oro y plata de alta pureza con precio calculado sobre el spot del momento.",
    type: "website",
  },
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
