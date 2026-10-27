"use client";

import { useEffect } from "react";
import { STATIC_CLASS } from "./lab-static";

/**
 * Si la página falla en el navegador (casi siempre porque no ha llegado algún
 * trozo de JavaScript), se repone el HTML que mandó el servidor, en estático:
 * se lee y se navega por enlaces, aunque no haya interacción. Mejor eso que un
 * «Application error», que es lo que llegó a indexar Google (ver lab-static.ts).
 */
export default function CatalogoError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    document.documentElement.setAttribute("data-lab-ready", "true");
  }, [error]);

  const snap = typeof window === "undefined" ? undefined : window.__LAB_SSR__;

  // Solo si la foto es de esta misma página: tras navegar dentro de la web,
  // la que hay guardada es la de la primera que se cargó
  if (snap && snap.path === window.location.pathname) {
    return <div className={STATIC_CLASS} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: snap.html }} />;
  }

  return (
    <main className="lab-page-head" style={{ minHeight: "70vh" }}>
      <div className="lab-page-head-inner">
        <h1 className="lab-page-title">No hemos podido cargar la página.</h1>
        <p className="lab-page-lead">
          <a href={typeof window === "undefined" ? "/" : window.location.href}>Vuelve a intentarlo</a>
        </p>
      </div>
    </main>
  );
}
