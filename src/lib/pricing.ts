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

// IGIC incrementado de Canarias aplicado siempre al precio de la plata mostrado
// en la web, con independencia del igic_rate configurado en cada producto.
export const SILVER_IGIC_RATE = 15;

export interface CatalogPriceArgs extends ComputeArgs {
  /** Margen minorista (%) sobre el precio mayorista. */
  retail_markup_pct?: number;
  /** IGIC del producto (%). Ignorado para la plata (se usa SILVER_IGIC_RATE). */
  igic_rate?: number | null;
}

export interface CatalogPricing {
  /** Precio mayorista sin IGIC. */
  wholesale: number;
  /** Precio mayorista con IGIC aplicado. */
  wholesaleWithIgic: number;
  /**
   * PVP público: precio mayorista + margen minorista, con IGIC.
   * `null` cuando no hay margen minorista configurado (el catálogo muestra
   * "Consultar" en ese caso).
   */
  retail: number | null;
}

/**
 * Calcula el precio de catálogo de un producto — única fuente de verdad
 * compartida entre el catálogo web y el informe de gestión.
 *
 * Aplica, en este orden:
 *   1. precio mayorista base (computeUnitPrice, incluye cost_price)
 *   2. margen minorista (retail_markup_pct) → para el PVP público
 *   3. IGIC (15% para la plata, igic_rate del producto para el resto)
 */
export function computeCatalogPricing(args: CatalogPriceArgs): CatalogPricing {
  const wholesale = computeUnitPrice(args);

  const igicRate =
    args.metal === "plata" ? SILVER_IGIC_RATE : Number(args.igic_rate ?? 0);
  const applyIgic = (price: number) =>
    igicRate > 0 ? Math.round(price * (1 + igicRate / 100) * 100) / 100 : price;

  const retailMarkupPct = Number(args.retail_markup_pct ?? 0);
  const retail =
    retailMarkupPct > 0
      ? applyIgic(Math.round(wholesale * (1 + retailMarkupPct / 100) * 100) / 100)
      : null;

  return {
    wholesale,
    wholesaleWithIgic: applyIgic(wholesale),
    retail,
  };
}
