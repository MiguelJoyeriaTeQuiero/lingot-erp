// Helpers puros — seguros en client y server.
// Sin "server-only" para que pueda importarse desde componentes interactivos.

import type { MetalType } from "@/lib/supabase/typed";

export interface ComputeArgs {
  weight_g: number;
  purity: number;
  metal: MetalType;
  markup_per_gram: number;
  markup_per_piece: number;
  spot_eur_per_g: number;
  global_markup_pct: number;
}

/**
 * Precio unitario sin IGIC:
 *   (peso × ley × spot) × (1 + markup_global%)
 *   + peso × hechura €/g
 *   + extra €/pieza
 */
export function computeUnitPrice(args: ComputeArgs): number {
  const metalValue =
    args.weight_g *
    args.purity *
    args.spot_eur_per_g *
    (1 + args.global_markup_pct / 100);
  const hechura = args.weight_g * args.markup_per_gram;
  const total = metalValue + hechura + args.markup_per_piece;
  return Math.round(total * 100) / 100;
}
