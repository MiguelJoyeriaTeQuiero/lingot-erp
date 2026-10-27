"use client";

import { useEffect } from "react";
import { HYDRATED_ATTR } from "./lab-static";

/** Marca que React ha arrancado: con eso el rescate de lab-static.ts no actúa. */
export function LabHydrated() {
  useEffect(() => {
    document.documentElement.setAttribute(HYDRATED_ATTR, "true");
  }, []);
  return null;
}
