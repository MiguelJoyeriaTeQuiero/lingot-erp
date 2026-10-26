import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// ⚠ Este archivo NO se ejecuta: con el código en src/, Next.js solo carga
// src/middleware.ts. La protección del ERP la hacen (app)/layout.tsx y
// require-role.ts. Activarlo (moverlo a src/) cambia el comportamiento de
// todas las rutas: hacerlo a propósito y probándolo.

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Matchea todas las rutas excepto:
     * - _next/static, _next/image
     * - favicon.ico
     * - archivos con extensión (.svg, .png, ...)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
