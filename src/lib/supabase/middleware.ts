import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  // Un token de refresco caducado o revocado hace que getUser() lance
  // AuthApiError. Sin capturarlo, el middleware corre en TODAS las rutas y
  // devuelve 500 en cada petición; y como la cookie muerta sigue viajando, el
  // error se repite indefinidamente. Por eso además la borramos.
  const staleAuthCookies: string[] = [];
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")) {
        staleAuthCookies.push(cookie.name);
      }
    }
  }

  /** Las cookies muertas hay que soltarlas en la respuesta que salga de aquí,
   *  sea la normal o una redirección: si no, vuelven en la siguiente petición. */
  const clearStale = <T extends NextResponse>(res: T): T => {
    for (const name of staleAuthCookies) res.cookies.delete(name);
    return res;
  };

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login");
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/public") ||
    // Los cron de Vercel llegan sin cookies de sesión; el propio handler
    // valida la autorización (x-vercel-cron / CRON_SECRET). Sin esto el
    // middleware los redirige a /login y la actualización nunca se ejecuta.
    pathname.startsWith("/api/cron");
  // El catálogo es la web pública y vive en la raíz (lingot.vip): su portada y
  // sus páginas no piden sesión. /catalogo solo queda para redirigir a lo nuevo.
  const isCatalogRoute =
    pathname === "/" ||
    ["/blog", "/nosotros", "/mi-cuenta", "/catalogo"].some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

  if (isPublicAsset) return clearStale(supabaseResponse);

  // Sin sesión y ruta protegida (el ERP) → /login
  if (!user && !isAuthRoute && !isCatalogRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return clearStale(NextResponse.redirect(url));
  }

  // Con sesión y entrando a /login → /dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return clearStale(NextResponse.redirect(url));
  }

  return clearStale(supabaseResponse);
}
