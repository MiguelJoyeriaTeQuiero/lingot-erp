"use server";

import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import { computeUnitPrice } from "@/lib/pricing";

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
    pvpUnit: number;
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
  }[];
  stockValorTotal: number;
  stockPrecioTotal: number;

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

    const [docsRes, linesRes, lotsRes, productsRes, clientsRes, companyRes, spots] =
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
          .select("id, document_id, product_id, description, quantity, line_subtotal, lot_id"),
        supabase
          .from("stock_lots")
          .select("id, product_id, cost_per_unit, quantity_remaining"),
        supabase.from("products").select("*").limit(500),
        supabase.from("clients").select("id, name").limit(500),
        supabase
          .from("company_settings")
          .select("metal_markup_pct")
          .eq("id", 1)
          .maybeSingle(),
        getLatestSpots(),
      ]);

    const docs = docsRes.data ?? [];
    const lines = linesRes.data ?? [];
    const lots = lotsRes.data ?? [];
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
        const totalLinea = Number(ln.line_subtotal);
        const pvpUnit = qty > 0 ? totalLinea / qty : 0;
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
    // Agrupar lots por producto
    const lotsByProduct = new Map<
      string,
      { costeUnit: number; qty: number }[]
    >();
    for (const lot of lots) {
      const arr = lotsByProduct.get(lot.product_id) ?? [];
      arr.push({
        costeUnit: Number(lot.cost_per_unit),
        qty: Number(lot.quantity_remaining),
      });
      lotsByProduct.set(lot.product_id, arr);
    }

    const stockRows = products
      .filter((p) => p.active)
      .map((p) => {
        const productLots = lotsByProduct.get(p.id) ?? [];
        const totalQtyLots = productLots.reduce((s, l) => s + l.qty, 0);
        const weightedCost =
          totalQtyLots > 0
            ? productLots.reduce((s, l) => s + l.costeUnit * l.qty, 0) /
              totalQtyLots
            : 0;
        const stockActual = Number(p.stock_current ?? 0);
        const valorTotal = weightedCost * stockActual;

        const spot = spots[p.metal as "oro" | "plata"]?.price_eur_per_g ?? null;
        const precioVenta =
          spot != null
            ? computeUnitPrice({
                weight_g: Number(p.weight_g),
                purity: Number(p.purity),
                metal: p.metal as "oro" | "plata",
                markup_per_gram: Number(p.markup_per_gram),
                markup_per_piece: Number(p.markup_per_piece),
                spot_eur_per_g: spot,
                global_markup_pct: globalMarkupPct,
              })
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
        };
      })
      .sort((a, b) => b.valorTotal - a.valorTotal);

    const stockValorTotal = stockRows.reduce((s, r) => s + r.valorTotal, 0);
    const stockPrecioTotal = stockRows.reduce(
      (s, r) => s + (r.precioVenta ?? 0) * r.stockActual,
      0
    );

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
        spotOro: spots.oro?.price_eur_per_g ?? null,
        spotPlata: spots.plata?.price_eur_per_g ?? null,
        globalMarkupPct,
      },
    };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}
