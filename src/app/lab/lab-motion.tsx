"use client";

import { useEffect, useRef, useState } from "react";
import { DICT, LANGS } from "./lab-i18n";

/* ═══════════════════════════════════════════════════════════════════════════
   Motor de movimiento del LAB.

   Un único bucle rAF gobierna todo el sitio:
     · scroll suavizado (lerp sobre el scroll nativo — mantiene position:sticky)
     · puntero suavizado publicado como --mx / --my
     · progreso por sección publicado como --p (lo consume el CSS)
     · rieles horizontales anclados (galería)
     · cursor propio, barra de progreso y comportamiento de la nav

   Escribir una sola custom property por elemento y dejar que el CSS haga el
   resto es lo que mantiene la animación a 60 fps: cero re-renders de React.
   ═══════════════════════════════════════════════════════════════════════════ */

const clamp = (v: number, min = 0, max = 1) => (v < min ? min : v > max ? max : v);

/** Lerp independiente del framerate: mismo tacto a 60, 120 o 144 Hz. */
const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

/** Desplazamiento suave programático (anclas del menú). */
export function labScrollTo(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return;
  const top = window.scrollY + el.getBoundingClientRect().top;
  window.dispatchEvent(new CustomEvent("lab:scrollto", { detail: { top } }));
}

/** Lo que tarda la cita en llenarse y lo que se sostiene llena antes de abrir. */
const FILL_MS = 2000;
const HOLD_MS = 380;

/**
 * La cita de la cortina. Se pintan los tres idiomas y el CSS deja visible el
 * de data-lab-lang, que el script de arranque ya escribió antes del primer
 * pintado. Esperar al hook de idioma enseñaría el español un instante a quien
 * navega en inglés o alemán.
 */
const QUOTES = LANGS.map(({ v }) => {
  const lines = [DICT[v]["quote.line1"] ?? "", DICT[v]["quote.line2"] ?? ""];
  // Velocidad constante: cada línea se queda con su parte del recorrido
  const split = lines[0]!.length / Math.max(1, lines[0]!.length + lines[1]!.length);
  return { lang: v, lines, split, credit: DICT[v]["quote.credit"] ?? "" };
});

export function LabMotion({ chain = true }: { chain?: boolean }) {
  const [ready, setReady] = useState(false);
  const curtainRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef    = useRef<HTMLDivElement>(null);
  const railRef   = useRef<HTMLDivElement>(null);
  const numRef    = useRef<HTMLSpanElement>(null);

  /* ── Cortina de entrada ─────────────────────────────────────────────── */
  useEffect(() => {
    const curtain = curtainRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      curtain?.style.setProperty("--load", "1");
      const id = window.setTimeout(() => setReady(true), HOLD_MS);
      return () => window.clearTimeout(id);
    }

    const started = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - started;
      // Entra y sale despacio: el trazo arranca, cruza y se posa
      const x = clamp(elapsed / FILL_MS);
      const p = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      // Directo al estilo: veinte re-renders por segundo de la cortina no
      // aportan nada que una custom property no haga
      curtain?.style.setProperty("--load", p.toFixed(4));
      if (elapsed < FILL_MS + HOLD_MS) raf = requestAnimationFrame(tick);
      else setReady(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-lab-ready", "true");
    return () => document.documentElement.removeAttribute("data-lab-ready");
  }, [ready]);

  // El interruptor del encadenado vive en el contenedor: el CSS decide el resto
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".lab-scope");
    if (root) root.dataset["chain"] = chain ? "on" : "off";
  }, [chain]);

  /* ── Bucle principal ────────────────────────────────────────────────── */
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".lab-scope");
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine    = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const smooth  = fine && !reduced;

    /* ── Elementos gobernados por scroll ─────────────────────────────── */
    let tracked: { el: HTMLElement; pin: boolean; pinH: number }[] = [];

    /** Altura real del elemento que queda pegado (100svh puede no ser innerHeight). */
    const stickyHeight = (el: HTMLElement) => {
      const child = el.firstElementChild as HTMLElement | null;
      return child?.offsetHeight || window.innerHeight;
    };

    const collect = () => {
      tracked = Array.from(document.querySelectorAll<HTMLElement>("[data-lab-track]")).map((el) => {
        const pin = el.getAttribute("data-lab-track") === "pin";
        return { el, pin, pinH: pin ? stickyHeight(el) : window.innerHeight };
      });
    };

    collect();

    /* ── Scroll suavizado (sobre el scroll real, no un wrapper) ──────── */
    let target  = window.scrollY;
    let current = target;
    let selfScroll = false;
    // El detalle de producto congela el motor: sin esto la rueda seguiría
    // moviendo la página por detrás del panel.
    let frozen = false;

    const maxScroll = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      // Un scroller propio manda sobre el motor SIEMPRE, también congelado: si
      // esta comprobación va después, dentro de una pantalla abierta no se
      // puede desplazar ni la lista ni el panel.
      if (el?.closest?.("[data-lab-native]")) return;
      if (frozen) { e.preventDefault(); return; }
      e.preventDefault();
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 16;
      else if (e.deltaMode === 2) d *= window.innerHeight;
      target = clamp(target + d, 0, maxScroll());
    };

    const onScroll = () => {
      // Scroll que no venimos de provocar nosotros (barra, teclado, anclas):
      // re-sincronizamos para no pelearnos con el navegador.
      if (selfScroll) { selfScroll = false; return; }
      if (Math.abs(window.scrollY - current) > 2) {
        current = window.scrollY;
        target  = current;
      }
    };

    const onJump = (e: Event) => {
      const detail = (e as CustomEvent<{ top: number }>).detail;
      if (!detail) return;
      target = clamp(detail.top, 0, maxScroll());
      if (!smooth) window.scrollTo({ top: target, behavior: "smooth" });
    };

    const onFreeze = (e: Event) => {
      frozen = !!(e as CustomEvent<{ on: boolean }>).detail?.on;
      if (!frozen) { current = window.scrollY; target = current; }
    };
    window.addEventListener("lab:freeze", onFreeze as EventListener);

    if (smooth) window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("lab:scrollto", onJump as EventListener);

    /* ── Puntero ─────────────────────────────────────────────────────── */
    let pxT = 0, pyT = 0, px = 0, py = 0;
    let cxT = -100, cyT = -100, cx = -100, cy = -100;

    const onPointer = (e: PointerEvent) => {
      pxT = (e.clientX / window.innerWidth  - 0.5) * 2;
      pyT = (e.clientY / window.innerHeight - 0.5) * 2;
      cxT = e.clientX;
      cyT = e.clientY;
      if (cursorRef.current?.dataset["on"] !== "true") {
        if (cursorRef.current) cursorRef.current.dataset["on"] = "true";
        if (dotRef.current)    dotRef.current.dataset["on"]    = "true";
        cx = cxT; cy = cyT;
      }
      const el = e.target as HTMLElement | null;
      const hot = !!el?.closest?.("a, button, [data-lab-hot]");
      if (cursorRef.current) cursorRef.current.dataset["hot"] = hot ? "true" : "false";
    };
    const onLeave = () => {
      if (cursorRef.current) cursorRef.current.dataset["on"] = "false";
      if (dotRef.current)    dotRef.current.dataset["on"]    = "false";
    };
    if (fine) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }

    /* ── Nav: se esconde al bajar, reaparece al subir ────────────────── */
    const nav = document.querySelector<HTMLElement>(".lab-nav");
    let lastNavY = window.scrollY;
    // Histéresis por dirección acumulada. Comparando frame contra frame el
    // desplazamiento suave entrega deltas de 2-3 px y el nav parpadea.
    let downAcc = 0, upAcc = 0;
    let navHidden = false, navSolid = false, navTop = true;

    const setFlag = (name: string, on: boolean) => {
      if (nav) nav.dataset[name] = on ? "true" : "false";
    };

    /* ── Bucle ───────────────────────────────────────────────────────── */
    let raf = 0;
    let prev = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.064, (now - prev) / 1000);
      prev = now;

      // 1 · scroll
      if (smooth) {
        const diff = target - current;
        if (Math.abs(diff) > 0.25) {
          current = damp(current, target, 11.5, dt);
          selfScroll = true;
          window.scrollTo(0, current);
        } else if (current !== target) {
          current = target;
          selfScroll = true;
          window.scrollTo(0, current);
        }
      } else {
        current = window.scrollY;
        target  = current;
      }

      const vh = window.innerHeight;

      // 2 · puntero suavizado → --mx / --my
      if (fine) {
        px = damp(px, pxT, 7, dt);
        py = damp(py, pyT, 7, dt);
        root.style.setProperty("--mx", px.toFixed(4));
        root.style.setProperty("--my", py.toFixed(4));

        cx = damp(cx, cxT, 16, dt);
        cy = damp(cy, cyT, 16, dt);
        if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
        if (dotRef.current)    dotRef.current.style.transform    = `translate3d(${cxT}px, ${cyT}px, 0)`;
      }

      // 3 · progreso por sección → --p
      for (const { el, pin, pinH } of tracked) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        const p = pin
          ? clamp(-r.top / Math.max(1, r.height - pinH))
          : clamp((vh - r.top) / Math.max(1, vh + r.height));
        el.style.setProperty("--p", p.toFixed(4));
      }

      // 4 · progreso del documento
      const doc = clamp(current / Math.max(1, maxScroll()));
      // También en la raíz: la atmósfera de fondo cambia de temperatura con él
      root.style.setProperty("--doc", doc.toFixed(4));
      if (railRef.current) railRef.current.style.setProperty("--doc", doc.toFixed(4));
      if (numRef.current) {
        const pct = String(Math.round(doc * 100)).padStart(2, "0");
        if (numRef.current.textContent !== pct) numRef.current.textContent = pct;
      }

      // 5 · nav
      if (nav) {
        const y = current;
        const delta = y - lastNavY;
        lastNavY = y;
        if (delta > 0) { downAcc += delta; upAcc = 0; }
        else if (delta < 0) { upAcc -= delta; downAcc = 0; }

        let hidden = navHidden;
        if (y < 140) hidden = false;
        else if (downAcc > 90) hidden = true;
        else if (upAcc > 60) hidden = false;

        // El logotipo solo aparece cuando el titular del hero ya no está: en
        // el hero sería el mismo nombre dos veces.
        const top   = y < vh * 0.45;
        const solid = y > 40;

        if (hidden !== navHidden) { navHidden = hidden; setFlag("hidden", hidden); }
        if (solid  !== navSolid)  { navSolid  = solid;  setFlag("solid",  solid);  }
        if (top    !== navTop)    { navTop    = top;    setFlag("top",    top);    }
      }
    };
    raf = requestAnimationFrame(frame);

    /* ── Revelados ───────────────────────────────────────────────────── */
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll("[data-lab-in]").forEach((el) => io.observe(el));

    /* ── Resize ──────────────────────────────────────────────────────── */
    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        collect();
        current = window.scrollY;
        target  = current;
      });
    };
    window.addEventListener("resize", onResize, { passive: true });

    // Los tipos y las imágenes cambian las alturas: re-medimos al cargar.
    const onLoad = () => collect();
    window.addEventListener("load", onLoad);
    if (document.fonts?.ready) document.fonts.ready.then(collect).catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      io.disconnect();
      if (smooth) window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("lab:scrollto", onJump as EventListener);
      window.removeEventListener("lab:freeze", onFreeze as EventListener);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return (
    <>
      {/* Cortina: la cita se llena de blanco y su relleno es la carga */}
      <div ref={curtainRef} className="lab-curtain" data-done={ready ? "true" : "false"} aria-hidden>
        <div className="lab-curtain-inner">
          {QUOTES.map((q) => (
            <div key={q.lang} lang={q.lang} className="lab-curtain-quote" style={{ "--split": q.split } as React.CSSProperties}>
              {q.lines.map((line, i) => (
                <span key={i} className="lab-curtain-line" data-text={line} data-line={i}>{line}</span>
              ))}
              <span className="lab-curtain-credit">{q.credit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cursor */}
      <div ref={cursorRef} className="lab-cursor" data-on="false" aria-hidden />
      <div ref={dotRef} className="lab-cursor-dot" data-on="false" aria-hidden />

      {/* Progreso */}
      <div className="lab-progress" aria-hidden>
        <span ref={numRef} className="lab-progress-num">00</span>
        <div ref={railRef} className="lab-progress-rail"><i /></div>
      </div>

      {/* Grano */}
      <div className="lab-grain" aria-hidden />
    </>
  );
}
