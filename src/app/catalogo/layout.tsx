import type { ReactNode } from "react";
import { Suspense } from "react";
import { Cormorant_Garamond } from "next/font/google";
import { CatalogNav } from "./catalog-nav";
import { CatalogReveal } from "./catalog-reveal";

const serif = Cormorant_Garamond({
  subsets:  ["latin"],
  weight:   ["300", "400", "500", "600"],
  style:    ["normal", "italic"],
  variable: "--font-catalog-serif",
  display:  "swap",
});

export default function CatalogoLayout({ children }: { children: ReactNode }) {
  return (
    <div className={serif.variable} style={{ isolation: "isolate" }}>
      <CatalogNav />
      {/* CatalogReveal uses useSearchParams() — must be inside Suspense */}
      <Suspense fallback={null}>
        <CatalogReveal />
      </Suspense>
      {children}
    </div>
  );
}
