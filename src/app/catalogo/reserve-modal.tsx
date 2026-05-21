"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createReservationAction } from "./actions";
import type { CatalogProduct } from "./catalog-grid";

interface ReserveModalProps {
  product: CatalogProduct;
  onClose: () => void;
}

export function ReserveModal({ product: p, onClose }: ReserveModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createReservationAction({
      product_id: p.id,
      product_name: p.name,
      product_sku: p.sku,
      quantity,
      price_snapshot: p.price ?? 0,
      phone,
      note,
    });

    setLoading(false);

    if ("error" in result) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm border border-border bg-white shadow-2xl"
        style={{ borderColor: "rgba(10,37,48,0.10)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[rgba(10,37,48,0.35)] transition-colors hover:text-[rgba(10,37,48,0.7)]"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <div className="p-8">
          {success ? (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center"
                style={{ border: "1px solid rgba(184,138,61,0.35)", background: "rgba(184,138,61,0.06)" }}
              >
                <span className="font-mono text-[18px]" style={{ color: "#b88a3d" }}>✓</span>
              </div>
              <div>
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.4em]"
                  style={{ color: "#b88a3d" }}
                >
                  Reserva enviada
                </p>
                <p className="mt-2 text-[13px]" style={{ color: "rgba(10,37,48,0.55)" }}>
                  Nos pondremos en contacto contigo pronto.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 w-full py-3 font-mono text-[11px] uppercase tracking-[0.3em] transition-opacity hover:opacity-80"
                style={{ background: "#0a3746", color: "#f5f1ea" }}
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6">
                <p
                  className="font-mono text-[9px] uppercase tracking-[0.4em]"
                  style={{ color: "#b88a3d" }}
                >
                  Reservar
                </p>
                <h2
                  className="mt-2 font-display text-[18px] font-medium leading-snug tracking-tight"
                  style={{ color: "#0a2530" }}
                >
                  {p.name}
                </h2>
                <div className="mt-2 flex items-center justify-between">
                  {p.sku && (
                    <span
                      className="font-mono text-[9px] uppercase tracking-[0.2em]"
                      style={{ color: "rgba(10,37,48,0.35)" }}
                    >
                      {p.sku}
                    </span>
                  )}
                  {p.price != null && (
                    <span
                      className="font-editorial text-[20px] leading-none"
                      style={{ color: p.metal === "oro" ? "#9a7230" : "#1e5468" }}
                    >
                      {formatCurrency(p.price)}
                    </span>
                  )}
                </div>
                <div
                  className="mt-4 h-px w-full"
                  style={{ background: "linear-gradient(to right, transparent, rgba(184,138,61,0.3), transparent)" }}
                />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Quantity */}
                <div>
                  <label
                    className="block font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: "rgba(10,37,48,0.45)" }}
                  >
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="mt-1.5 block w-full border-b py-2 text-[14px] focus:outline-none"
                    style={{
                      borderColor: "rgba(10,37,48,0.15)",
                      color: "#0a2530",
                      background: "transparent",
                    }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    className="block font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: "rgba(10,37,48,0.45)" }}
                  >
                    Teléfono{" "}
                    <span style={{ color: "rgba(10,37,48,0.25)" }}>(opcional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 block w-full border-b py-2 text-[14px] placeholder:text-[rgba(10,37,48,0.2)] focus:outline-none"
                    style={{
                      borderColor: "rgba(10,37,48,0.15)",
                      color: "#0a2530",
                      background: "transparent",
                    }}
                    placeholder="+34 600 000 000"
                  />
                </div>

                {/* Note */}
                <div>
                  <label
                    className="block font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: "rgba(10,37,48,0.45)" }}
                  >
                    Nota{" "}
                    <span style={{ color: "rgba(10,37,48,0.25)" }}>(opcional)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="mt-1.5 block w-full resize-none border-b py-2 text-[14px] placeholder:text-[rgba(10,37,48,0.2)] focus:outline-none"
                    style={{
                      borderColor: "rgba(10,37,48,0.15)",
                      color: "#0a2530",
                      background: "transparent",
                    }}
                    placeholder="Indicaciones especiales…"
                  />
                </div>

                {error && (
                  <p className="text-[12px]" style={{ color: "#b14338" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full py-3 font-mono text-[11px] uppercase tracking-[0.3em] transition-opacity disabled:opacity-50 hover:opacity-90"
                  style={{ background: "#b88a3d", color: "#fff" }}
                >
                  {loading ? "Enviando…" : "Confirmar reserva"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
