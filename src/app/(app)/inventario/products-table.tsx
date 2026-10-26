"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, AlertTriangle, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { computeUnitPrice } from "@/lib/pricing";
import type {
  ProductRow,
  ProductCategoryRow,
  MetalType,
} from "@/lib/supabase/typed";

type LotSummary = { cost_per_unit: number; cost_per_gram: number; quantity_remaining: number; order_date: string; inTransit: boolean };

interface ProductsTableProps {
  products: ProductRow[];
  categories: ProductCategoryRow[];
  spotByMetal: { oro: number | null; plata: number | null };
  globalMarkupPct: number;
  /** Unidades «En envío» (pedidas y sin recibir) por producto. */
  pendingByProductId?: Record<string, number>;
  /** Coste de lo que está en envío y aún no se ha vendido, por producto. */
  transitValueByProductId?: Record<string, number>;
  lotsByProductId?: Record<string, LotSummary[]>;
}

export function ProductsTable({
  products,
  categories,
  spotByMetal,
  globalMarkupPct,
  pendingByProductId = {},
  transitValueByProductId = {},
  lotsByProductId = {},
}: ProductsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [metalFilter, setMetalFilter] = useState<"all" | MetalType>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [onlyInTransit, setOnlyInTransit] = useState(false);

  // Resumen de lo que está en camino, sobre todo el catálogo (no solo lo filtrado)
  const transit = useMemo(() => {
    let units = 0, value = 0, refs = 0;
    for (const p of products) {
      const u = pendingByProductId[p.id] ?? 0;
      if (u <= 0) continue;
      units += u;
      value += transitValueByProductId[p.id] ?? 0;
      refs += 1;
    }
    return { units, value, refs };
  }, [products, pendingByProductId, transitValueByProductId]);

  const categoryById = useMemo(() => {
    const map = new Map<string, ProductCategoryRow>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (!showInactive && !p.active) return false;
      if (metalFilter !== "all" && p.metal !== metalFilter) return false;
      if (categoryFilter !== "all" && p.category_id !== categoryFilter)
        return false;
      if (onlyLowStock) {
        if (p.stock_current > p.stock_min) return false;
      }
      if (onlyInTransit && (pendingByProductId[p.id] ?? 0) <= 0) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search, metalFilter, categoryFilter, showInactive, onlyLowStock, onlyInTransit, pendingByProductId]);

  function priceOf(p: ProductRow): number | null {
    const spot = spotByMetal[p.metal];
    if (spot == null) return null;
    return computeUnitPrice({
      weight_g: Number(p.weight_g),
      purity: Number(p.purity),
      metal: p.metal,
      markup_per_gram: Number(p.markup_per_gram),
      markup_per_piece: Number(p.markup_per_piece),
      cost_price: Number(p.cost_price ?? 0),
      spot_eur_per_g: spot,
      global_markup_pct: globalMarkupPct,
    });
  }

  return (
    <div className="space-y-4">
      {/* Mercancía en camino: se controla aquí, pero no cuenta como stock ni
          como disponible en la web hasta marcar el pedido como recibido */}
      {transit.units > 0 && (
        <button
          type="button"
          onClick={() => setOnlyInTransit((v) => !v)}
          aria-pressed={onlyInTransit}
          className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 border border-sky-700/25 bg-sky-50/70 px-4 py-3 text-left text-sm transition-colors hover:border-sky-700/40"
        >
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-sky-800">
            <Truck className="h-4 w-4" strokeWidth={1.5} />
            En envío
          </span>
          <span className="text-primary">
            <strong className="font-medium tabular">{transit.units} u</strong> pendientes de recibir
            {" "}en {transit.refs} {transit.refs === 1 ? "referencia" : "referencias"}
          </span>
          <span className="text-text-muted">
            {formatCurrency(transit.value)} a coste
          </span>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-sky-800">
            {onlyInTransit ? "Ver todo" : "Ver solo en envío"}
          </span>
        </button>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-[1fr_160px_180px_auto_auto_auto]">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          />
          <Input
            placeholder="Buscar por nombre, SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={metalFilter}
          onChange={(e) =>
            setMetalFilter(e.target.value as typeof metalFilter)
          }
        >
          <option value="all">Todos los metales</option>
          <option value="oro">Oro</option>
          <option value="plata">Plata</option>
        </Select>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
            className="h-4 w-4 border-border bg-surface-raised accent-primary"
          />
          Bajo mínimo
        </label>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={onlyInTransit}
            onChange={(e) => setOnlyInTransit(e.target.checked)}
            className="h-4 w-4 border-border bg-surface-raised accent-primary"
          />
          En envío
        </label>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 border-border bg-surface-raised accent-primary"
          />
          Inactivos
        </label>
      </div>

      <div className="border border-border bg-surface-raised shadow-paper">
        <Table className="min-w-[640px]">
          <THead>
            <TR>
              <TH>Pieza</TH>
              <TH>SKU</TH>
              <TH>Metal</TH>
              <TH className="text-right">Peso · Ley</TH>
              <TH className="text-right">Precio</TH>
              <TH className="text-right">Stock físico</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <TR>
                <TD colSpan={7} className="py-10 text-center text-text-muted">
                  No se han encontrado productos con esos criterios.
                </TD>
              </TR>
            ) : (
              filtered.map((p) => {
                const lowStock = p.stock_current <= p.stock_min;
                const price = priceOf(p);
                const cat = p.category_id
                  ? categoryById.get(p.category_id)
                  : null;
                const lots = lotsByProductId[p.id] ?? [];
                return (
                  <TR
                    key={p.id}
                    onClick={() => router.push(`/inventario/${p.id}`)}
                    className="cursor-pointer"
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden border border-border bg-surface">
                          {p.image_urls?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image_urls[0]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-surface-raised" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-primary">{p.name}</div>
                          {cat && (
                            <div className="text-[11px] text-text-dim">
                              {cat.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </TD>
                    <TD className="font-mono text-[12px] tabular text-gold-deep">
                      {p.sku ?? "—"}
                    </TD>
                    <TD>
                      <Badge variant={p.metal === "oro" ? "convertido" : "neutral"}>
                        {p.metal === "oro" ? "Oro" : "Plata"}
                      </Badge>
                    </TD>
                    <TD className="text-right font-mono text-[12.5px] tabular text-text-muted">
                      {Number(p.weight_g).toFixed(2)} g · {Number(p.purity).toFixed(3)}
                    </TD>
                    <TD className="text-right">
                      {price == null ? (
                        <span className="text-text-dim">sin spot</span>
                      ) : (
                        <div>
                          <span className="font-mono tabular text-primary">
                            {formatCurrency(price)}
                          </span>
                          {lots.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {lots.map((lot, i) => {
                                const margin = price > 0
                                  ? Math.round((price - lot.cost_per_unit) / lot.cost_per_unit * 100)
                                  : null;
                                return (
                                  <div key={i} className="flex items-center justify-end gap-1.5 text-[10px] font-mono tabular text-text-muted">
                                    {lot.inTransit && (
                                      <span className="text-sky-800" title="Lote de un pedido aún sin recibir">en envío</span>
                                    )}
                                    <span>{formatCurrency(lot.cost_per_unit)}</span>
                                    <span className="text-text-dim">×{lot.quantity_remaining}</span>
                                    {margin != null && (
                                      <span className={margin >= 3 ? "text-success" : margin >= 0 ? "text-gold-deep" : "text-danger"}>
                                        {margin > 0 ? "+" : ""}{margin}%
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </TD>
                    <TD className="text-right">
                      <span
                        className={
                          lowStock
                            ? "inline-flex items-center gap-1 text-danger"
                            : "text-primary"
                        }
                      >
                        {lowStock && (
                          <AlertTriangle
                            className="h-3.5 w-3.5"
                            strokeWidth={2}
                          />
                        )}
                        {p.stock_current}
                      </span>
                    </TD>
                    <TD>
                      <div className="flex flex-col items-start gap-1">
                        {p.active ? (
                          <Badge variant="pagado">Activo</Badge>
                        ) : (
                          <Badge variant="cancelado">Inactivo</Badge>
                        )}
                        {(pendingByProductId[p.id] ?? 0) > 0 && (
                          <Badge variant="emitido" title="Pedido sin recibir: no cuenta como stock ni como disponible en la web">
                            En envío · {pendingByProductId[p.id]} u
                          </Badge>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </div>

      <div className="text-xs text-text-muted">
        {filtered.length} de {products.length} pieza
        {products.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}
