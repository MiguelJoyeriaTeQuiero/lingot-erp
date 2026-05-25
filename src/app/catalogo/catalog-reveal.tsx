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
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -30px 0px" }
    );

    // Small delay so SSR content is painted before we measure
    const timer = setTimeout(() => {
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        // Reset state so elements that were already revealed on a previous
        // page visit get re-revealed on the new page render
        el.classList.remove("revealed");
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
