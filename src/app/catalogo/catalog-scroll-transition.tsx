"use client";

import { useEffect } from "react";

export function CatalogScrollTransition() {
  useEffect(() => {
    const overlay = document.getElementById("hero-fade-overlay");
    if (!overlay) return;

    const update = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      // Empieza a disolver desde el 15% del scroll del hero, completa al 85%
      const t = Math.max(0, Math.min(1, (scrollY - vh * 0.15) / (vh * 0.7)));
      overlay.style.opacity = String(t);
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return null;
}
