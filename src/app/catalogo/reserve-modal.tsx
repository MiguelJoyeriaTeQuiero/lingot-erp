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

  const priceColor = p.metal === "oro" ? "var(--lg-gold-deep)" : "var(--lg-vault-soft)";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createReservationAction({
      product_id: p.id, product_name: p.name, product_sku: p.sku,
      quantity, price_snapshot: p.price ?? 0, phone, note,
    });
    setLoading(false);
    if ("error" in result) setError(result.error);
    else setSuccess(true);
  }

  return (
    <div className="lg-scope fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0" onClick={onClose}
        style={{ background: "rgba(6,39,47,0.55)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }} />

      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl"
        style={{ background: "var(--lg-surface)", border: "1px solid var(--lg-gold-line)", boxShadow: "0 40px 100px -40px rgba(6,39,47,0.5)", animation: "hero-card-in 0.5s var(--lg-expo) both" }}>
        <div aria-hidden style={{ height: "3px", background: "linear-gradient(to right, transparent, var(--lg-gold), transparent)" }} />

        <button onClick={onClose} className="absolute right-4 top-6 z-10 transition-colors"
          style={{ color: "var(--lg-ink-dim)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lg-ink)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--lg-ink-dim)"; }}
          aria-label="Cerrar">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <div className="p-8">
          {success ? (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ border: "1px solid var(--lg-gold-line)", background: "rgba(200,161,100,0.08)" }}>
                <span style={{ color: "var(--lg-gold-deep)", fontSize: "22px" }}>✓</span>
              </div>
              <div>
                <p className="lg-label" style={{ fontSize: "10px", letterSpacing: "0.4em", color: "var(--lg-gold-deep)" }}>Reserva enviada</p>
                <p className="mt-3 text-[13px]" style={{ color: "var(--lg-ink-soft)" }}>Nos pondremos en contacto contigo pronto.</p>
              </div>
              <button onClick={onClose} className="lg-btn lg-label mt-2 w-full rounded-full py-3.5"
                style={{ background: "var(--lg-vault)", color: "var(--lg-light)", fontSize: "10px", letterSpacing: "0.3em" }}>
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.4em", color: "var(--lg-gold-deep)" }}>Reservar</p>
                <h2 className="lg-heading mt-2" style={{ fontSize: "19px", fontWeight: 400, color: "var(--lg-ink)", lineHeight: 1.25 }}>{p.name}</h2>
                <div className="mt-2 flex items-center justify-between">
                  {p.sku && <span className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.2em", color: "var(--lg-ink-dim)" }}>{p.sku}</span>}
                  {p.price != null && <span className="lg-num" style={{ fontSize: "22px", fontWeight: 500, color: priceColor }}>{formatCurrency(p.price)}</span>}
                </div>
                <div className="mt-4 h-px w-full" style={{ background: "linear-gradient(to right, transparent, var(--lg-gold-line), transparent)" }} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="lg-label block" style={{ fontSize: "9px", letterSpacing: "0.22em", color: "var(--lg-ink-dim)" }}>Cantidad</label>
                  <input type="number" min={1} required value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="mt-1.5 block w-full border-b bg-transparent py-2 text-[14px] focus:outline-none"
                    style={{ borderColor: "var(--lg-ink-faint)", color: "var(--lg-ink)" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--lg-gold)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--lg-ink-faint)"; }} />
                </div>

                <ReserveField label="Teléfono" optional type="tel" value={phone} onChange={setPhone} placeholder="+34 600 000 000" />
                <ReserveTextarea label="Nota" value={note} onChange={setNote} placeholder="Indicaciones especiales…" />

                {error && <p className="text-[12px]" style={{ color: "#c1554a" }}>{error}</p>}

                <button type="submit" disabled={loading}
                  className="lg-btn lg-label mt-2 flex w-full items-center justify-between rounded-full px-6 py-3.5 disabled:opacity-50"
                  style={{ background: "var(--lg-vault)", color: "var(--lg-light)", fontSize: "10px", letterSpacing: "0.3em", boxShadow: "0 8px 24px -10px rgba(10,43,54,0.4)" }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "var(--lg-vault-soft)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--lg-vault)"; }}>
                  <span>{loading ? "Enviando…" : "Confirmar reserva"}</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]" style={{ background: "rgba(238,242,244,0.14)" }}>↗</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReserveField({
  label, optional, type, value, onChange, placeholder,
}: { label: string; optional?: boolean; type: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="lg-label block" style={{ fontSize: "9px", letterSpacing: "0.22em", color: "var(--lg-ink-dim)" }}>
        {label} {optional && <span style={{ color: "var(--lg-ink-faint)" }}>(opcional)</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 block w-full border-b bg-transparent py-2 text-[14px] focus:outline-none"
        style={{ borderColor: "var(--lg-ink-faint)", color: "var(--lg-ink)" }}
        onFocus={(e) => { e.target.style.borderColor = "var(--lg-gold)"; }}
        onBlur={(e) => { e.target.style.borderColor = "var(--lg-ink-faint)"; }}
        placeholder={placeholder} />
    </div>
  );
}

function ReserveTextarea({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="lg-label block" style={{ fontSize: "9px", letterSpacing: "0.22em", color: "var(--lg-ink-dim)" }}>
        {label} <span style={{ color: "var(--lg-ink-faint)" }}>(opcional)</span>
      </label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
        className="mt-1.5 block w-full resize-none border-b bg-transparent py-2 text-[14px] focus:outline-none"
        style={{ borderColor: "var(--lg-ink-faint)", color: "var(--lg-ink)" }}
        onFocus={(e) => { e.target.style.borderColor = "var(--lg-gold)"; }}
        onBlur={(e) => { e.target.style.borderColor = "var(--lg-ink-faint)"; }}
        placeholder={placeholder} />
    </div>
  );
}
