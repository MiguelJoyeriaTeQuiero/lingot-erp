"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

export function CatalogLoginButton({
  isLoggedIn,
  isWholesale,
  userName = "",
  onDark = false,
}: {
  isLoggedIn:  boolean;
  isWholesale: boolean;
  userName?:   string;
  onDark?:     boolean;
}) {
  const [open,     setOpen]     = useState(false);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError("Email o contraseña incorrectos"); return; }
    setOpen(false);
    router.refresh();
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  // Superficie del pill según el tema (sobre bóveda oscura / sobre galería clara)
  const pillBase: React.CSSProperties = {
    background:           onDark ? "rgba(238,242,244,0.06)" : "rgba(236,239,242,0.86)",
    border:               `1px solid ${onDark ? "rgba(238,242,244,0.14)" : "rgba(10,43,54,0.12)"}`,
    backdropFilter:       "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow:            onDark ? "none" : "0 2px 12px -2px rgba(10,43,54,0.10)",
    borderRadius:         "99px",
    padding:              "6px 14px",
    transition:           `all 0.45s ${SPRING}`,
  };
  const idle  = onDark ? "var(--lg-light-soft)" : "var(--lg-ink-soft)";
  const hover = onDark ? "var(--lg-light)" : "var(--lg-ink)";

  if (isLoggedIn) {
    const firstName = userName.trim().split(/\s+/)[0] ?? "";
    const initial   = firstName.charAt(0).toUpperCase() || "U";

    return (
      <div className="lg-scope flex items-center" style={{ ...pillBase, padding: "4px", gap: 0 }}>
        <Link href="/catalogo/mi-cuenta" aria-label="Mi cuenta"
          className="lg-label"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "28px", height: "28px", borderRadius: "50%",
            background: isWholesale
              ? "linear-gradient(135deg, rgba(156,124,68,0.30), rgba(200,161,100,0.42))"
              : (onDark ? "rgba(238,242,244,0.10)" : "rgba(10,43,54,0.07)"),
            border: `1px solid ${isWholesale ? "var(--lg-gold-line)" : (onDark ? "rgba(238,242,244,0.16)" : "rgba(10,43,54,0.12)")}`,
            fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em",
            color: isWholesale ? "var(--lg-gold-bright)" : idle,
            textDecoration: "none", flexShrink: 0,
          }}>
          {initial}
        </Link>

        {firstName && (
          <Link href="/catalogo/mi-cuenta" className="lg-label hidden sm:block"
            style={{ fontSize: "10px", letterSpacing: "0.1em", color: idle, textDecoration: "none", paddingLeft: "9px", paddingRight: "4px", whiteSpace: "nowrap" }}>
            {firstName}
          </Link>
        )}

        <span className="hidden sm:block" style={{ width: "1px", height: "14px", background: onDark ? "rgba(238,242,244,0.14)" : "rgba(10,43,54,0.10)", margin: "0 8px", flexShrink: 0 }} />

        <button onClick={handleLogout} className="lg-label"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: idle, padding: "0 8px 0 0", transition: "color 0.22s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = hover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = idle; }}>
          Salir
        </button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="lg-scope lg-label flex items-center gap-2"
        style={{ ...pillBase, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: idle }}
        onMouseEnter={(e) => { e.currentTarget.style.color = hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = idle; }}>
        <LogIn className="h-3 w-3" strokeWidth={1.5} />
        <span className="hidden sm:inline">Acceso profesional</span>
        <span className="sm:hidden">Acceso</span>
      </button>

      {open && (
        <div className="lg-scope fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0" onClick={() => setOpen(false)}
            style={{ background: "rgba(6,39,47,0.55)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }} />

          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl"
            style={{ background: "var(--lg-surface)", border: "1px solid var(--lg-gold-line)", boxShadow: "0 40px 100px -40px rgba(6,39,47,0.5)", animation: "hero-card-in 0.5s var(--lg-expo) both" }}>
            <div aria-hidden style={{ height: "3px", background: "linear-gradient(to right, transparent, var(--lg-gold), transparent)" }} />
            <div className="relative p-8">
              <button onClick={() => setOpen(false)} className="absolute right-4 top-4 transition-colors"
                style={{ color: "var(--lg-ink-dim)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lg-ink)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--lg-ink-dim)"; }}>
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>

              <div className="mb-8">
                <div className="mb-4 inline-flex items-center rounded-full px-3 py-1"
                  style={{ background: "rgba(200,161,100,0.08)", border: "1px solid var(--lg-gold-line)" }}>
                  <span className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.42em", color: "var(--lg-gold-deep)" }}>Acceso profesional</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--lg-ink-soft)" }}>
                  Introduce tus credenciales para ver los precios de tu tarifa.
                </p>
                <div className="mt-5 h-px" style={{ background: "linear-gradient(to right, var(--lg-gold-line), transparent)" }} />
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="tu@email.com" />
                <Field label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="••••••" />

                {error && <p className="text-[12px]" style={{ color: "#c1554a" }}>{error}</p>}

                <button type="submit" disabled={loading}
                  className="lg-btn lg-label mt-4 flex w-full items-center justify-between rounded-full px-6 py-3.5 disabled:opacity-40"
                  style={{ background: "var(--lg-vault)", color: "var(--lg-light)", fontSize: "10px", letterSpacing: "0.32em", boxShadow: "0 8px 24px -10px rgba(10,43,54,0.4)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lg-vault-soft)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--lg-vault)"; }}>
                  <span>{loading ? "Accediendo…" : "Entrar"}</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]" style={{ background: "rgba(238,242,244,0.14)" }}>↗</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label, type, value, onChange, placeholder,
}: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="lg-label block" style={{ fontSize: "9px", letterSpacing: "0.28em", color: "var(--lg-ink-dim)" }}>{label}</label>
      <input type={type} required value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-2 block w-full border-b bg-transparent py-2 text-[14px] focus:outline-none"
        style={{ borderColor: "var(--lg-ink-faint)", color: "var(--lg-ink)" }}
        onFocus={(e) => { e.target.style.borderColor = "var(--lg-gold)"; }}
        onBlur={(e)  => { e.target.style.borderColor = "var(--lg-ink-faint)"; }}
        placeholder={placeholder} />
    </div>
  );
}
