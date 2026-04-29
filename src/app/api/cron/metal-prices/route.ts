import { NextResponse } from "next/server";
import { refreshAllSpots } from "@/lib/metal-prices";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Endpoint que dispara el refresco de cotizaciones desde goldapi.io.
 *
 * Autorización:
 *  - Vercel Cron añade la cabecera `x-vercel-cron: 1` automáticamente.
 *  - Para llamadas manuales (curl) se acepta `Authorization: Bearer <CRON_SECRET>`.
 *  - Si no hay CRON_SECRET configurado, sólo se aceptan las llamadas internas
 *    de Vercel.
 *
 * Configuración del cron en `vercel.json`.
 */
export async function GET(req: Request) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  const hasBearer =
    expected && auth.toLowerCase() === `bearer ${expected.toLowerCase()}`;

  if (!isVercelCron && !hasBearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await refreshAllSpots();
  const ok = results.every((r) => r.status === "ok");

  return NextResponse.json(
    {
      success: ok,
      refreshed_at: new Date().toISOString(),
      results,
    },
    { status: ok ? 200 : 207 }
  );
}
