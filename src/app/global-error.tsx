"use client";

import { useEffect } from "react";
import "./(catalogo)/lab-static"; // declara window.__LAB_SSR__

/**
 * Último recurso, cuando el fallo se lleva por delante también el layout y
 * Next.js mostraría «Application error». En el catálogo se repone el HTML que
 * mandó el servidor (lab-static.ts), con su título; en el ERP, que no guarda
 * copia, un aviso para recargar.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const snap = typeof window === "undefined" ? undefined : window.__LAB_SSR__;
  const same = !!snap && snap.path === window.location.pathname;

  return (
    <html lang="es">
      <head>{same && <title>{snap.title}</title>}</head>
      <body>
        {same ? (
          <div className="lab-scope lab-static" dangerouslySetInnerHTML={{ __html: snap.html }} />
        ) : (
          <main style={{ fontFamily: "system-ui, sans-serif", padding: "15vh 24px", textAlign: "center" }}>
            <h1 style={{ fontWeight: 400 }}>No hemos podido cargar la página.</h1>
            <p><a href={typeof window === "undefined" ? "/" : window.location.href}>Vuelve a intentarlo</a></p>
          </main>
        )}
      </body>
    </html>
  );
}
