import "server-only";
import { createTypedClient, type MetalType } from "@/lib/supabase/typed";

const GOLDAPI_BASE = "https://www.goldapi.io/api";
const TROY_OZ_TO_G = 31.1034768;

export interface FetchedSpot {
  metal: MetalType;
  price_eur_per_g: number;
  source: string;
  raw: Record<string, unknown>;
}

interface GoldApiResponse {
  // For XAU (oro) goldapi devuelve directamente price_gram_24k.
  // Para XAG (plata) devuelve `price` (€/oz).
  price?: number;
  price_gram_24k?: number;
  metal?: string;
  currency?: string;
  timestamp?: number;
  [k: string]: unknown;
}

function symbolFor(metal: MetalType): string {
  return metal === "oro" ? "XAU" : "XAG";
}

/**
 * Llama a goldapi.io y devuelve el precio en EUR/g del metal fino (24k / .999).
 * Nunca lanza para fallos parciales — devuelve un objeto con flags.
 */
export async function fetchSpotFromGoldApi(
  metal: MetalType
): Promise<FetchedSpot> {
  const apiKey = process.env.GOLDAPI_KEY;
  if (!apiKey) {
    throw new Error("GOLDAPI_KEY no está configurada en el entorno");
  }

  const symbol = symbolFor(metal);
  const url = `${GOLDAPI_BASE}/${symbol}/EUR`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-access-token": apiKey,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`goldapi ${symbol} HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as GoldApiResponse;

  let pricePerG: number | null = null;

  if (metal === "oro" && typeof json.price_gram_24k === "number") {
    pricePerG = json.price_gram_24k;
  } else if (typeof json.price === "number" && Number.isFinite(json.price)) {
    pricePerG = json.price / TROY_OZ_TO_G;
  }

  if (pricePerG == null || !Number.isFinite(pricePerG) || pricePerG <= 0) {
    throw new Error(
      `goldapi ${symbol}: respuesta sin precio utilizable (${JSON.stringify(json).slice(0, 200)})`
    );
  }

  return {
    metal,
    price_eur_per_g: Math.round(pricePerG * 10000) / 10000,
    source: "goldapi",
    raw: json as Record<string, unknown>,
  };
}

/**
 * Inserta una cotización en la tabla metal_prices vía la función RPC
 * SECURITY DEFINER (no requiere service-role key).
 */
export async function persistSpot(spot: FetchedSpot): Promise<void> {
  const supabase = createTypedClient();
  const { error } = await supabase.rpc("record_metal_price", {
    p_metal: spot.metal,
    p_price: spot.price_eur_per_g,
    p_source: spot.source,
  });
  if (error) {
    throw new Error(`record_metal_price ${spot.metal}: ${error.message}`);
  }
}

export interface RefreshResult {
  metal: MetalType;
  status: "ok" | "error";
  price_eur_per_g?: number;
  error?: string;
}

/**
 * Refresca oro y plata en paralelo. Cada metal es independiente: si falla uno,
 * el otro se persiste igualmente.
 */
export async function refreshAllSpots(): Promise<RefreshResult[]> {
  const metals: MetalType[] = ["oro", "plata"];

  return Promise.all(
    metals.map(async (metal): Promise<RefreshResult> => {
      try {
        const spot = await fetchSpotFromGoldApi(metal);
        await persistSpot(spot);
        return {
          metal,
          status: "ok",
          price_eur_per_g: spot.price_eur_per_g,
        };
      } catch (err) {
        return {
          metal,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );
}

/**
 * Devuelve el último precio guardado por metal.
 * Útil para enriquecer respuestas del editor sin volver a llamar a la API.
 */
export async function getLatestSpots(): Promise<
  Record<MetalType, { price_eur_per_g: number; fetched_at: string } | null>
> {
  const supabase = createTypedClient();
  const { data } = await supabase
    .from("metal_prices")
    .select("metal, price_eur_per_g, fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(50);

  const result: Record<
    MetalType,
    { price_eur_per_g: number; fetched_at: string } | null
  > = { oro: null, plata: null };

  for (const row of data ?? []) {
    if (!result[row.metal as MetalType]) {
      result[row.metal as MetalType] = {
        price_eur_per_g: Number(row.price_eur_per_g),
        fetched_at: row.fetched_at,
      };
    }
    if (result.oro && result.plata) break;
  }
  return result;
}

// Helper puro `computeUnitPrice` se ha movido a `src/lib/pricing.ts`
// para que pueda importarse desde componentes cliente sin arrastrar
// el flag "server-only" de este módulo.
export { computeUnitPrice } from "./pricing";
export type { ComputeArgs } from "./pricing";
