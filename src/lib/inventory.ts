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
  /** Pedido de compra que originó el lote (null en lotes manuales/heredados). */
  purchase_order_id?: string | null;
}

export interface ProductStockValuation {
  /** Unidades restantes sumadas de los lotes del producto. */
  quantity: number;
  /** Coste total de las unidades restantes (Σ coste×cantidad). */
  value: number;
  /** Coste medio ponderado por unidad (value / quantity), 0 si no hay stock. */
  weightedUnitCost: number;
}

/**
 * Excluye los lotes en tránsito (pedidos de compra aún no recibidos).
 *
 * Al registrar un pedido de reposición se crea de inmediato su lote —para
 * poder asignarlo a ventas antes de que llegue la mercancía (pre-venta)—, pero
 * esas unidades todavía NO forman parte del inventario físico: `stock_current`
 * solo se incrementa al marcar el pedido como recibido. Contar el coste de
 * esos lotes en la valoración, mientras las unidades no cuentan como stock ni
 * a PVP, infla el "valor a coste" y distorsiona el margen latente.
 *
 * La valoración de stock debe usar únicamente los lotes recibidos para ser
 * coherente con las cantidades físicas. Los lotes sin pedido asociado
 * (manuales o heredados) se consideran recibidos.
 *
 * Lo que está en camino no se pierde: se informa aparte como «En envío» con
 * `onlyInTransitLots`, de modo que físico + en envío = todos los lotes.
 */
export function excludeInTransitLots<T extends { purchase_order_id?: string | null }>(
  lots: T[],
  inTransitOrderIds: Set<string>
): T[] {
  return lots.filter(
    (l) => l.purchase_order_id == null || !inTransitOrderIds.has(l.purchase_order_id)
  );
}

/**
 * Lotes «En envío»: los de pedidos de compra aún no recibidos. Su valor a coste
 * es el de las unidades en camino que no se han vendido todavía (una pre-venta
 * ya descuenta del lote y su coste va al coste de ventas, no aquí).
 */
export function onlyInTransitLots<T extends { purchase_order_id?: string | null }>(
  lots: T[],
  inTransitOrderIds: Set<string>
): T[] {
  return lots.filter(
    (l) => l.purchase_order_id != null && inTransitOrderIds.has(l.purchase_order_id)
  );
}

/** Valor total de almacén a coste, sumando todos los lotes. */
export function stockValueFromLots(lots: StockLotLite[]): number {
  return lots.reduce(
    (sum, l) => sum + Number(l.cost_per_unit ?? 0) * Number(l.quantity_remaining ?? 0),
    0
  );
}

/** Gramos (peso bruto de la pieza) separados por metal. */
export interface WeightByMetal {
  oro: number;
  plata: number;
}

/**
 * Peso que va a llegar con los pedidos de reposición pendientes:
 *     Σ unidades pedidas × peso de la pieza, separado por metal.
 *
 * Cuenta todas las unidades pedidas, también las ya vendidas por adelantado:
 * es lo que físicamente viene en el envío.
 */
export function transitWeightByMetal(
  orders: { product_id: string | null; quantity: number | string | null }[],
  products: { id: string; metal: string; weight_g: number | string | null }[]
): WeightByMetal {
  const productById = new Map(products.map((p) => [p.id, p]));
  const out: WeightByMetal = { oro: 0, plata: 0 };
  for (const o of orders) {
    const p = o.product_id ? productById.get(o.product_id) : undefined;
    if (!p || (p.metal !== "oro" && p.metal !== "plata")) continue;
    out[p.metal] += Number(o.quantity ?? 0) * Number(p.weight_g ?? 0);
  }
  return out;
}

const gramsFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** «1.250 g oro · 3.400,5 g plata». Omite el metal sin peso; null si no hay ninguno. */
export function formatWeightByMetal(w: WeightByMetal): string | null {
  const parts: string[] = [];
  if (w.oro > 0) parts.push(`${gramsFormatter.format(w.oro)} g oro`);
  if (w.plata > 0) parts.push(`${gramsFormatter.format(w.plata)} g plata`);
  return parts.length > 0 ? parts.join(" · ") : null;
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
