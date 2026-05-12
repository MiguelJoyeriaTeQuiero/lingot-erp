// Helpers puros — seguros en client y server.
// Sin "server-only" para que pueda importarse desde componentes interactivos.

import type { MetalType } from "@/lib/supabase/typed";

export interface ComputeArgs {
  weight_g: number;
  purity: number;
  metal: MetalType;
  markup_per_gram: number;
  markup_per_piece: number;
  cost_price?: number;
  spot_eur_per_g: number;
  global_markup_pct: number;
}

/**
 * Precio unitario sin IGIC:
 *   (peso × ley × spot) × (1 + markup_global%)
 *   + peso × hechura_pct%
 *   + extra €/pieza
 *   + costes de envío/logística
 */
export function computeUnitPrice(args: ComputeArgs): number {
  const metalValue =
    args.weight_g *
    args.purity *
    args.spot_eur_per_g *
    (1 + args.global_markup_pct / 100);
  const hechura = metalValue * (args.markup_per_gram / 100);
  const total = metalValue + hechura + args.markup_per_piece + (args.cost_price ?? 0);
  return Math.round(total * 100) / 100;
}
