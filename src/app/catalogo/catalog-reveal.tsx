"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function CatalogReveal() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  // Re-run whenever the URL changes — including query-string-only changes
  // like ?page=2 on the blog (same pathname, different searchParams)
  const urlKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.classList.add(el.hasAttribute("data-lg-reveal") ? "is-in" : "revealed");
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -30px 0px" }
    );

    // Small delay so SSR content is painted before we measure
    const timer = setTimeout(() => {
      document.querySelectorAll("[data-reveal], [data-lg-reveal]").forEach((el) => {
        // Reset state so elements that were already revealed on a previous
        // page visit get re-revealed on the new page render
        el.classList.remove("revealed", "is-in");
        observer.observe(el);
      });
    }, 80);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [urlKey]); // ← reacts to both pathname AND query-string changes

  return null;
}
