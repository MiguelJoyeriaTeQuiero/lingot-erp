"use client";

import { useLayoutEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   Control segmentado con píldora deslizante.

   La posición del botón activo se mide y se publica como custom properties, así
   el movimiento lo hace el compositor y no React. Lo usan el filtro de la
   colección y el de estados en la zona de cliente.
   ═══════════════════════════════════════════════════════════════════════════ */

export function Segment<T extends string | number>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { v: T; t: string }[];
  onChange: (v: T) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  // La píldora persigue al botón activo. Medimos tras el pintado para que el
  // ancho ya sea el definitivo (la tipografía puede llegar tarde).
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const move = () => {
      const on = track.querySelector<HTMLElement>('[data-on="true"]');
      if (!on) return;
      track.style.setProperty("--x", `${on.offsetLeft}px`);
      track.style.setProperty("--w", `${on.offsetWidth}px`);
    };
    move();
    const ro = new ResizeObserver(move);
    ro.observe(track);
    if (document.fonts?.ready) document.fonts.ready.then(move).catch(() => {});
    return () => ro.disconnect();
  }, [value, options.length]);

  return (
    <div className="lab-filter-group">
      <span className="lab-label lab-filter-label">{label}</span>
      <div className="lab-seg" ref={trackRef}>
        <span className="lab-seg-pill" aria-hidden />
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            className="lab-seg-btn"
            data-on={o.v === value ? "true" : "false"}
            aria-pressed={o.v === value}
            onClick={() => onChange(o.v)}
          >
            {o.t}
          </button>
        ))}
      </div>
    </div>
  );
}

