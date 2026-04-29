"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, AlertTriangle } from "lucide-react";
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

interface ProductsTableProps {
  products: ProductRow[];
  categories: ProductCategoryRow[];
  spotByMetal: { oro: number | null; plata: number | null };
  globalMarkupPct: number;
}

export function ProductsTable({
  products,
  categories,
  spotByMetal,
  globalMarkupPct,
}: ProductsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [metalFilter, setMetalFilter] = useState<"all" | MetalType>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [onlyLowStock, setOnlyLowStock] = useState(false);

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
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search, metalFilter, categoryFilter, showInactive, onlyLowStock]);

  function priceOf(p: ProductRow): number | null {
    const spot = spotByMetal[p.metal];
    if (spot == null) return null;
    return computeUnitPrice({
      weight_g: Number(p.weight_g),
      purity: Number(p.purity),
      metal: p.metal,
      markup_per_gram: Number(p.markup_per_gram),
      markup_per_piece: Number(p.markup_per_piece),
      spot_eur_per_g: spot,
      global_markup_pct: globalMarkupPct,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_180px_auto_auto]">
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
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 border-border bg-surface-raised accent-primary"
          />
          Inactivos
        </label>
      </div>

      <div className="border border-border bg-surface-raised shadow-paper">
        <Table>
          <THead>
            <TR>
              <TH>Pieza</TH>
              <TH>SKU</TH>
              <TH>Metal</TH>
              <TH className="text-right">Peso · Ley</TH>
              <TH className="text-right">Precio</TH>
              <TH className="text-right">Stock</TH>
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
                return (
                  <TR
                    key={p.id}
                    onClick={() => router.push(`/inventario/${p.id}`)}
                    className="cursor-pointer"
                  >
                    <TD>
                      <div className="font-medium text-primary">{p.name}</div>
                      {cat && (
                        <div className="text-[11px] text-text-dim">
                          {cat.name}
                        </div>
                      )}
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
                        <span className="font-mono tabular text-primary">
                          {formatCurrency(price)}
                        </span>
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
                      {p.active ? (
                        <Badge variant="pagado">Activo</Badge>
                      ) : (
                        <Badge variant="cancelado">Inactivo</Badge>
                      )}
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
