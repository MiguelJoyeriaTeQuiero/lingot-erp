"use server";

import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import { computeCatalogPricing } from "@/lib/pricing";
import {
  stockValueFromLots,
  stockValuationByProduct,
  excludeInTransitLots,
  onlyInTransitLots,
} from "@/lib/inventory";

export interface KpiReportData {
  from: string;
  to: string;
  generatedAt: string;

  // Libro
  libroBase: number;
  libroIgic: number;
  libroTotal: number;
  libroFacturas: number;
  libroAlbaranes: number;
  liboPagado: number;
  libroPendiente: number;

  // Rentabilidad — línea por venta
  ventas: {
    fecha: string;
    factura: string;
    cliente: string;
    producto: string;
    sku: string | null;
    cantidad: number;
    /** Precio unitario sin IGIC (base de la línea). */
    pvpUnit: number;
    /** Precio unitario con IGIC, el que figura en la factura. */
    pvpUnitConIgic: number;
    /** Coste del lote, sin IGIC. */
    costeUnit: number;
    beneficioUnit: number;
    margenPct: number;
    totalLinea: number;
    esRectificacion: boolean;
  }[];

  // Totales rentabilidad
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  margenGlobal: number;

  // Almacén snapshot
  stockRows: {
    nombre: string;
    sku: string | null;
    metal: string;
    purity: number;
    stockActual: number;
    stockMin: number;
    costeUnit: number;
    valorTotal: number;
    precioVenta: number | null;
    /** Unidades «En envío»: pedidas y aún sin recibir. No están en stockActual. */
    enEnvio: number;
    /** Coste de lo que está en envío y no se ha vendido por adelantado. */
    valorEnEnvio: number;
  }[];
  stockValorTotal: number;
  stockPrecioTotal: number;
  /** Totales «En envío», aparte del stock físico (nunca sumados a él). */
  stockEnEnvioUnidades: number;
  stockEnEnvioValor: number;

  // Spots
  spotOro: number | null;
  spotPlata: number | null;
  globalMarkupPct: number;
}

export async function fetchKpiReport(
  from: string,
  to: string
): Promise<{ data: KpiReportData | null; error?: string }> {
  try {
    const supabase = createTypedClient();

    const toInclusive = to + "T23:59:59";

    const [docsRes, linesRes, lotsRes, productsRes, clientsRes, companyRes, spots, transitRes] =
      await Promise.all([
        supabase
          .from("documents")
          .select("*")
          .gte("issue_date", from)
          .lte("issue_date", toInclusive)
          .order("issue_date", { ascending: false })
          .limit(2000),
        supabase
          .from("document_lines")
          .select("id, document_id, product_id, description, quantity, line_subtotal, line_total, lot_id"),
        supabase
          .from("stock_lots")
          .select("id, product_id, cost_per_unit, quantity_remaining, purchase_order_id"),
        supabase.from("products").select("*").limit(500),
        supabase.from("clients").select("id, name").limit(500),
        supabase
          .from("company_settings")
          .select("metal_markup_pct")
          .eq("id", 1)
          .maybeSingle(),
        getLatestSpots(),
        supabase.from("purchase_orders").select("id, product_id, quantity").eq("received", false),
      ]);

    const docs = docsRes.data ?? [];
    const lines = linesRes.data ?? [];
    const lots = lotsRes.data ?? [];
    // Lotes en tránsito (pedidos no recibidos): se excluyen de la valoración de
    // stock para que el coste no compute sin su contrapartida en unidades, y
    // se informan aparte como «En envío».
    const transitOrders = (transitRes.data ?? []) as { id: string; product_id: string; quantity: number }[];
    const inTransitOrderIds = new Set(transitOrders.map((o) => o.id));
    const physicalLots = excludeInTransitLots(lots, inTransitOrderIds);
    const transitLots = onlyInTransitLots(lots, inTransitOrderIds);
    const enEnvioByProduct = new Map<string, number>();
    for (const o of transitOrders) {
      enEnvioByProduct.set(o.product_id, (enEnvioByProduct.get(o.product_id) ?? 0) + Number(o.quantity));
    }
    const products = productsRes.data ?? [];
    const clients = clientsRes.data ?? [];
    const company = companyRes.data;
    const globalMarkupPct = Number(
      (company as { metal_markup_pct?: number } | null)?.metal_markup_pct ?? 4
    );

    // ── LIBRO ────────────────────────────────────────────────────────────────
    const emittedDocs = docs.filter(
      (d) => d.status !== "borrador" && d.status !== "cancelado"
    );
    const facturas = emittedDocs.filter((d) => d.doc_type === "factura");
    const albaranes = emittedDocs.filter((d) => d.doc_type === "albaran");

    const libroBase = facturas.reduce((s, d) => s + Number(d.subtotal ?? 0), 0);
    const libroIgic = facturas.reduce((s, d) => s + Number(d.igic_total ?? 0), 0);
    const libroTotal = facturas.reduce((s, d) => s + Number(d.total ?? 0), 0);
    const libroPagado = facturas
      .filter((d) => d.status === "pagado")
      .reduce((s, d) => s + Number(d.total ?? 0), 0);
    const libroPendiente = libroTotal - libroPagado;

    // ── RENTABILIDAD ─────────────────────────────────────────────────────────
    const emittedIds = new Set(emittedDocs.map((d) => d.id));
    const rectIds = new Set(
      emittedDocs
        .filter(
          (d) =>
            (d as unknown as { rectification_of_invoice_id?: string | null })
              .rectification_of_invoice_id != null
        )
        .map((d) => d.id)
    );
    const lotMap = new Map(lots.map((l) => [l.id, l]));
    const productMap = new Map(products.map((p) => [p.id, p]));
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));
    const docMap = new Map(docs.map((d) => [d.id, d]));

    const ventas = lines
      .filter((ln) => ln.lot_id && emittedIds.has(ln.document_id) && !rectIds.has(ln.document_id))
      .map((ln) => {
        const lot = lotMap.get(ln.lot_id!);
        const product = productMap.get(ln.product_id ?? "");
        const doc = docMap.get(ln.document_id);
        const qty = Number(ln.quantity);
        // Beneficio y margen sin IGIC (base menos coste sin IGIC); el PVP con
        // IGIC solo se muestra, como en la factura
        const totalLinea = Number(ln.line_subtotal);
        const pvpUnit = qty > 0 ? totalLinea / qty : 0;
        const pvpUnitConIgic = qty > 0 ? Number(ln.line_total ?? ln.line_subtotal) / qty : 0;
        const costeUnit = Number(lot?.cost_per_unit ?? 0);
        const beneficioUnit = pvpUnit - costeUnit;
        const margenPct = pvpUnit > 0 ? (beneficioUnit / pvpUnit) * 100 : 0;

        return {
          fecha: doc?.issue_date ?? "",
          factura: doc?.code ?? "—",
          cliente: clientMap.get(doc?.client_id ?? "") ?? "—",
          producto: product?.name ?? ln.description ?? "—",
          sku: product?.sku ?? null,
          cantidad: qty,
          pvpUnit,
          pvpUnitConIgic,
          costeUnit,
          beneficioUnit,
          margenPct,
          totalLinea,
          esRectificacion: rectIds.has(ln.document_id),
        };
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    const totalRevenue = ventas.reduce((s, v) => s + v.totalLinea, 0);
    const totalCost = ventas.reduce((s, v) => s + v.costeUnit * v.cantidad, 0);
    const totalProfit = ventas.reduce(
      (s, v) => s + v.beneficioUnit * v.cantidad,
      0
    );
    const margenGlobal =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // ── ALMACÉN SNAPSHOT ─────────────────────────────────────────────────────
    // Valoración a coste por lotes (fuente de verdad compartida con el dashboard).
    const valuationByProduct = stockValuationByProduct(physicalLots);
    const transitValuationByProduct = stockValuationByProduct(transitLots);

    const stockRows = products
      .map((p) => {
        const valuation = valuationByProduct.get(p.id);
        const weightedCost = valuation?.weightedUnitCost ?? 0;
        const valorTotal = valuation?.value ?? 0;
        const stockActual = Number(p.stock_current ?? 0);

        const spot = spots[p.metal as "oro" | "plata"]?.price_eur_per_g ?? null;
        // PVP público: mismo cálculo que el catálogo web (incluye cost_price,
        // margen minorista e IGIC). Sin margen minorista configurado se usa el
        // precio mayorista con IGIC — que es lo que ve un cliente en catálogo.
        const pricing =
          spot != null
            ? computeCatalogPricing({
                weight_g: Number(p.weight_g),
                purity: Number(p.purity),
                metal: p.metal as "oro" | "plata",
                markup_per_gram: Number(p.markup_per_gram),
                markup_per_piece: Number(p.markup_per_piece),
                cost_price: Number((p as typeof p & { cost_price?: number }).cost_price ?? 0),
                retail_markup_pct: Number((p as typeof p & { retail_markup_pct?: number }).retail_markup_pct ?? 0),
                igic_rate: (p as typeof p & { igic_rate?: number | null }).igic_rate ?? 0,
                spot_eur_per_g: spot,
                global_markup_pct: globalMarkupPct,
              })
            : null;
        const precioVenta = pricing
          ? pricing.retail ?? pricing.wholesaleWithIgic
          : null;

        return {
          nombre: p.name,
          sku: p.sku ?? null,
          metal: p.metal,
          purity: Number(p.purity),
          stockActual,
          stockMin: Number(p.stock_min ?? 0),
          costeUnit: weightedCost,
          valorTotal,
          precioVenta,
          enEnvio: enEnvioByProduct.get(p.id) ?? 0,
          valorEnEnvio: transitValuationByProduct.get(p.id)?.value ?? 0,
        };
      })
      // Incluye todos los productos (activos e inactivos), pero solo los que
      // tienen stock, valor o mercancía en envío — para no llenar el informe
      // de filas vacías.
      .filter((r) => r.valorTotal > 0 || r.stockActual > 0 || r.enEnvio > 0)
      .sort((a, b) => b.valorTotal - a.valorTotal);

    // Total a coste con el mismo helper que el dashboard → cifras idénticas.
    const stockValorTotal = stockValueFromLots(physicalLots);
    const stockPrecioTotal = stockRows.reduce(
      (s, r) => s + (r.precioVenta ?? 0) * r.stockActual,
      0
    );
    const stockEnEnvioUnidades = transitOrders.reduce((s, o) => s + Number(o.quantity), 0);
    const stockEnEnvioValor = stockValueFromLots(transitLots);

    return {
      data: {
        from,
        to,
        generatedAt: new Date().toISOString(),
        libroBase,
        libroIgic,
        libroTotal,
        libroFacturas: facturas.length,
        libroAlbaranes: albaranes.length,
        liboPagado: libroPagado,
        libroPendiente,
        ventas,
        totalRevenue,
        totalCost,
        totalProfit,
        margenGlobal,
        stockRows,
        stockValorTotal,
        stockPrecioTotal,
        stockEnEnvioUnidades,
        stockEnEnvioValor,
        spotOro: spots.oro?.price_eur_per_g ?? null,
        spotPlata: spots.plata?.price_eur_per_g ?? null,
        globalMarkupPct,
      },
    };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}
