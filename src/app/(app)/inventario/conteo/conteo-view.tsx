"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { ScanLine, Search, Trash2, CheckCircle2, AlertCircle, MinusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ProductRow } from "@/lib/supabase/typed";
import { applyInventoryCountAction } from "../actions";

interface CountItem {
  product: ProductRow;
  counted: number;
}

export function ConteoView({ products }: { products: ProductRow[] }) {
  const [items, setItems] = useState<CountItem[]>([]);
  const [scanValue, setScanValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [applying, setApplying] = useState(false);

  const scanRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const physicalProducts = useMemo(
    () => products.filter((p) => p.type === "producto"),
    [products]
  );

  // Mantiene el foco en el campo de escáner salvo que el usuario esté escribiendo en búsqueda
  const refocusScan = useCallback(() => {
    setTimeout(() => scanRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  function findBySku(sku: string): ProductRow | undefined {
    return physicalProducts.find(
      (p) => p.sku?.toLowerCase() === sku.toLowerCase().trim()
    );
  }

  function addOrIncrement(product: ProductRow, qty = 1) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx ? { ...item, counted: item.counted + qty } : item
        );
      }
      return [...prev, { product, counted: qty }];
    });
  }

  function handleScanKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const raw = scanValue.trim();
    setScanValue("");
    if (!raw) return;

    const found = findBySku(raw);
    if (!found) {
      toast({
        variant: "error",
        title: "SKU no encontrado",
        description: `"${raw}" no coincide con ningún producto físico.`,
      });
      return;
    }
    addOrIncrement(found);
    // Feedback sonoro si el navegador lo soporta
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(30);
    }
  }

  function updateCount(productId: string, value: string) {
    const n = parseFloat(value);
    if (isNaN(n) || n < 0) return;
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, counted: n } : i
      )
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function clearAll() {
    if (!window.confirm("¿Limpiar todos los productos del conteo?")) return;
    setItems([]);
    refocusScan();
  }

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return physicalProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [physicalProducts, searchQuery]);

  async function handleApply() {
    const changes = items.map((i) => ({
      productId: i.product.id,
      delta: i.counted - Number(i.product.stock_current),
    }));

    const withDiff = changes.filter((c) => c.delta !== 0);

    if (withDiff.length === 0) {
      toast({
        variant: "success",
        title: "Sin diferencias",
        description: "El conteo coincide con el stock del sistema.",
      });
      return;
    }

    if (
      !window.confirm(
        `¿Aplicar conteo? Se registrarán ${withDiff.length} ajuste(s) de stock.`
      )
    )
      return;

    setApplying(true);
    const result = await applyInventoryCountAction(changes);
    setApplying(false);

    if (!result.success) {
      toast({
        variant: "error",
        title: "Error al aplicar",
        description: result.error,
      });
      return;
    }

    toast({
      variant: "success",
      title: `Conteo aplicado — ${result.appliedCount} ajuste(s) registrados`,
    });
    setItems([]);
    refocusScan();
  }

  const diffStats = useMemo(() => {
    let ok = 0, low = 0, high = 0;
    for (const i of items) {
      const d = i.counted - Number(i.product.stock_current);
      if (d === 0) ok++;
      else if (d < 0) low++;
      else high++;
    }
    return { ok, low, high };
  }, [items]);

  return (
    <div className="space-y-8">

      {/* Zona de captura */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Pistola lectora */}
        <div className="relative rounded-none border border-border bg-surface-raised p-6 shadow-paper">
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-gold/50 to-transparent"
          />
          <div className="mb-4 flex items-center gap-3">
            <ScanLine className="h-5 w-5 text-gold" strokeWidth={1.5} />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold-deep">
                Pistola lectora
              </div>
              <div className="text-xs text-text-muted">
                Apunta aquí y escanea — el campo siempre está activo
              </div>
            </div>
          </div>
          <input
            ref={scanRef}
            type="text"
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            onKeyDown={handleScanKey}
            onBlur={refocusScan}
            placeholder="Esperando lectura de código…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full border-b-2 border-gold/60 bg-transparent pb-2 font-mono text-lg tracking-widest text-primary placeholder:text-text-dim/50 focus:border-gold focus:outline-none"
          />
          <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.24em] text-text-dim">
            También puedes escribir el SKU manualmente y pulsar Enter
          </div>
        </div>

        {/* Búsqueda manual */}
        <div className="relative rounded-none border border-border bg-surface-raised p-6 shadow-paper">
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent"
          />
          <div className="mb-4 flex items-center gap-3">
            <Search className="h-5 w-5 text-primary/60" strokeWidth={1.5} />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary/70">
                Búsqueda manual
              </div>
              <div className="text-xs text-text-muted">
                Escribe nombre o SKU y selecciona el producto
              </div>
            </div>
          </div>
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nombre o SKU…"
              autoComplete="off"
              className="w-full border-b border-border bg-transparent pb-2 text-sm text-primary placeholder:text-text-dim/50 focus:border-primary focus:outline-none"
            />
            {searchResults.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 divide-y divide-hairline border border-border bg-surface-raised shadow-vault">
                {searchResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-surface-sunken/60"
                      onClick={() => {
                        addOrIncrement(p);
                        setSearchQuery("");
                        refocusScan();
                      }}
                    >
                      <span className="text-primary">{p.name}</span>
                      <span className="font-mono text-[11px] text-gold-deep">
                        {p.sku ?? "—"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Lista de conteo */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-center">
          <ScanLine className="h-8 w-8 text-text-dim" strokeWidth={1} />
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-text-dim">
            Aún no hay productos escaneados
          </div>
          <div className="text-sm text-text-muted">
            Usa la pistola lectora o la búsqueda manual para añadir piezas al conteo.
          </div>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Resumen de diferencias */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-dim">
              {items.length} pieza{items.length !== 1 ? "s" : ""} en conteo
            </span>
            <div className="flex gap-3">
              {diffStats.ok > 0 && (
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                  {diffStats.ok} correctas
                </span>
              )}
              {diffStats.low > 0 && (
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-danger">
                  <MinusCircle className="h-3.5 w-3.5" strokeWidth={2} />
                  {diffStats.low} con faltante
                </span>
              )}
              {diffStats.high > 0 && (
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-gold-deep">
                  <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />
                  {diffStats.high} con sobrante
                </span>
              )}
            </div>
          </div>

          {/* Tabla de conteo */}
          <div className="overflow-x-auto border border-border bg-surface">
            <table className="min-w-[560px] w-full text-sm">
              <thead className="border-b-2 border-primary/80">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                    Sistema
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                    Contado
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                    Diferencia
                  </th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {items.map((item) => {
                  const system = Number(item.product.stock_current);
                  const diff = item.counted - system;
                  return (
                    <tr
                      key={item.product.id}
                      className="transition-colors hover:bg-surface-sunken/40"
                    >
                      <td className="px-4 py-3 font-medium text-primary">
                        {item.product.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-gold-deep">
                        {item.product.sku ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] tabular text-text-muted">
                        {system}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.counted}
                          onChange={(e) =>
                            updateCount(item.product.id, e.target.value)
                          }
                          className="w-20 border-b border-border bg-transparent py-0.5 text-right font-mono text-[13px] tabular text-primary focus:border-gold focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "font-mono text-[13px] tabular font-medium",
                            diff === 0
                              ? "text-text-muted"
                              : diff > 0
                              ? "text-gold-deep"
                              : "text-danger"
                          )}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          className="flex h-8 w-8 items-center justify-center text-text-dim transition-colors hover:text-danger"
                          aria-label="Quitar del conteo"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={clearAll}
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-muted transition-colors hover:text-danger"
            >
              Limpiar lista
            </button>
            <Button
              type="button"
              onClick={handleApply}
              loading={applying}
              disabled={applying}
            >
              Aplicar conteo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
