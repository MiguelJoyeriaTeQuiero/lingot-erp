"use client";

import { useEffect } from "react";

export function CatalogScrollTransition() {
  useEffect(() => {
    const heroContent = document.getElementById("hero-content");
    const heroBg      = document.getElementById("hero-bg-vignette");

    // ── Hero parallax ──────────────────────────────────────────────
    const updateParallax = () => {
      const scrollY = window.scrollY;
      const vh      = window.innerHeight;

      if (heroContent) {
        const t     = Math.min(1, scrollY / (vh * 0.65));
        const alpha = Math.max(0, 1 - t * 1.15);
        heroContent.style.transform = `translateY(${scrollY * 0.32}px)`;
        heroContent.style.opacity   = String(alpha);
      }
      if (heroBg) {
        heroBg.style.transform = `translateY(${scrollY * 0.12}px)`;
      }
    };

    window.addEventListener("scroll", updateParallax, { passive: true });
    updateParallax();

    return () => {
      window.removeEventListener("scroll", updateParallax);
    };
  }, []);

  return null;
}
