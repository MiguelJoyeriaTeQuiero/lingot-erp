/**
 * Valoración de inventario a coste — fuente de verdad única.
 *
 * El valor de almacén a coste se calcula SIEMPRE como la suma del coste real
 * de las unidades que quedan en cada lote de compra:
 *
 *     valor = Σ (cost_per_unit × quantity_remaining)   sobre todos los lotes
 *
 * Es el dinero realmente inmovilizado en el stock restante y es coherente con
 * el cálculo de coste de ventas (que usa el mismo `lot.cost_per_unit`).
 *
 * Tanto el dashboard como los informes deben usar estas funciones para que la
 * cifra coincida siempre.
 */

export interface StockLotLite {
  product_id: string;
  cost_per_unit: number | string | null;
  quantity_remaining: number | string | null;
}

export interface ProductStockValuation {
  /** Unidades restantes sumadas de los lotes del producto. */
  quantity: number;
  /** Coste total de las unidades restantes (Σ coste×cantidad). */
  value: number;
  /** Coste medio ponderado por unidad (value / quantity), 0 si no hay stock. */
  weightedUnitCost: number;
}

/** Valor total de almacén a coste, sumando todos los lotes. */
export function stockValueFromLots(lots: StockLotLite[]): number {
  return lots.reduce(
    (sum, l) => sum + Number(l.cost_per_unit ?? 0) * Number(l.quantity_remaining ?? 0),
    0
  );
}

/** Desglose de la valoración a coste por producto (a partir de sus lotes). */
export function stockValuationByProduct(
  lots: StockLotLite[]
): Map<string, ProductStockValuation> {
  const byProduct = new Map<string, ProductStockValuation>();
  for (const lot of lots) {
    const qty = Number(lot.quantity_remaining ?? 0);
    const value = Number(lot.cost_per_unit ?? 0) * qty;
    const prev = byProduct.get(lot.product_id) ?? {
      quantity: 0,
      value: 0,
      weightedUnitCost: 0,
    };
    prev.quantity += qty;
    prev.value += value;
    byProduct.set(lot.product_id, prev);
  }
  for (const v of byProduct.values()) {
    v.weightedUnitCost = v.quantity > 0 ? v.value / v.quantity : 0;
  }
  return byProduct;
}
