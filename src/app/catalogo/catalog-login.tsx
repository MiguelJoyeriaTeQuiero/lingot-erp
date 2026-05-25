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
}: {
  isLoggedIn:  boolean;
  isWholesale: boolean;
  userName?:   string;
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

  const pillBase: React.CSSProperties = {
    background:          "rgba(249,244,236,0.88)",
    border:              "1px solid rgba(10,31,43,0.12)",
    backdropFilter:      "blur(16px)",
    WebkitBackdropFilter:"blur(16px)",
    boxShadow:           "0 2px 12px -2px rgba(10,31,43,0.08)",
    borderRadius:        "99px",
    padding:             "6px 14px",
    transition:          `all 0.40s ${SPRING}`,
  };

  if (isLoggedIn) {
    // Derive a clean display name: first word of full name, or raw value
    const firstName = userName.trim().split(/\s+/)[0] ?? "";
    const initial   = firstName.charAt(0).toUpperCase() || "U";

    return (
      <div
        className="flex items-center gap-0"
        style={{
          ...pillBase,
          padding: "4px 4px 4px 4px",
          gap: 0,
        }}
      >
        {/* Avatar circle — gold tint for wholesale, ink for regular */}
        <Link
          href="/catalogo/mi-cuenta"
          aria-label="Mi cuenta"
          style={{
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            width:           "28px",
            height:          "28px",
            borderRadius:    "50%",
            background:      isWholesale
              ? "linear-gradient(135deg, rgba(154,114,48,0.18) 0%, rgba(200,161,100,0.28) 100%)"
              : "rgba(10,31,43,0.07)",
            border:          isWholesale
              ? "1px solid rgba(154,114,48,0.34)"
              : "1px solid rgba(10,31,43,0.12)",
            fontFamily:      "monospace",
            fontSize:        "10px",
            fontWeight:      600,
            letterSpacing:   "0.04em",
            color:           isWholesale ? "#9a7230" : "rgba(10,31,43,0.65)",
            textDecoration:  "none",
            flexShrink:      0,
            transition:      `all 0.30s ${SPRING}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isWholesale
              ? "linear-gradient(135deg, rgba(154,114,48,0.28) 0%, rgba(200,161,100,0.42) 100%)"
              : "rgba(10,31,43,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isWholesale
              ? "linear-gradient(135deg, rgba(154,114,48,0.18) 0%, rgba(200,161,100,0.28) 100%)"
              : "rgba(10,31,43,0.07)";
          }}
        >
          {initial}
        </Link>

        {/* First name — hidden on very narrow screens */}
        {firstName && (
          <Link
            href="/catalogo/mi-cuenta"
            className="hidden sm:block"
            style={{
              fontFamily:    "monospace",
              fontSize:      "10px",
              letterSpacing: "0.10em",
              color:         "rgba(10,31,43,0.70)",
              textDecoration:"none",
              paddingLeft:   "9px",
              paddingRight:  "4px",
              whiteSpace:    "nowrap",
              transition:    `color 0.22s ease`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#0a1f2b"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(10,31,43,0.70)"; }}
          >
            {firstName}
          </Link>
        )}

        {/* Divider */}
        <span
          className="hidden sm:block"
          style={{
            width:      "1px",
            height:     "14px",
            background: "rgba(10,31,43,0.10)",
            margin:     "0 8px",
            flexShrink: 0,
          }}
        />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="font-mono text-[9px] uppercase tracking-[0.20em]"
          style={{
            background:  "none",
            border:      "none",
            cursor:      "pointer",
            color:       "rgba(10,31,43,0.32)",
            padding:     "0 8px 0 0",
            transition:  `color 0.22s ease`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(10,31,43,0.65)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(10,31,43,0.32)"; }}
        >
          Salir
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{
          ...pillBase,
          color: "rgba(10,31,43,0.55)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color    = "#0a1f2b";
          e.currentTarget.style.boxShadow = "0 4px 20px -4px rgba(10,31,43,0.14)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color    = "rgba(10,31,43,0.55)";
          e.currentTarget.style.boxShadow = "0 2px 12px -2px rgba(10,31,43,0.08)";
        }}
      >
        <LogIn className="h-3 w-3" strokeWidth={1.5} />
        Acceso profesional
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop — warm frosted */}
          <div
            className="absolute inset-0"
            style={{
              background:          "rgba(240,233,218,0.75)",
              backdropFilter:      "blur(20px)",
              WebkitBackdropFilter:"blur(20px)",
            }}
            onClick={() => setOpen(false)}
          />

          {/* Modal — paper white Double-Bezel */}
          <div
            className="relative w-full max-w-sm"
            style={{
              padding:      "3px",
              borderRadius: "28px",
              background:   "rgba(154,114,48,0.06)",
              border:       "1px solid rgba(154,114,48,0.16)",
              boxShadow:    "0 24px 64px -24px rgba(10,31,43,0.18), 0 8px 24px -8px rgba(10,31,43,0.10)",
            }}
          >
            <div
              className="relative p-8"
              style={{
                borderRadius: "25px",
                background:   "#FFFFFF",
                boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
              }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 transition-colors"
                style={{ color: "rgba(10,31,43,0.25)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(10,31,43,0.55)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(10,31,43,0.25)"; }}
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>

              <div className="mb-8">
                {/* Eyebrow pill */}
                <div
                  className="mb-4 inline-flex items-center rounded-full px-3 py-1"
                  style={{
                    background: "rgba(154,114,48,0.07)",
                    border:     "1px solid rgba(154,114,48,0.18)",
                  }}
                >
                  <span className="font-mono text-[8px] uppercase tracking-[0.42em]"
                    style={{ color: "rgba(154,114,48,0.75)" }}>
                    Acceso profesional
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed"
                  style={{ color: "rgba(10,31,43,0.42)" }}>
                  Introduce tus credenciales para ver los precios de tu tarifa.
                </p>
                <div className="mt-5 h-px"
                  style={{ background: "linear-gradient(to right, rgba(154,114,48,0.18), transparent)" }} />
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-[0.28em]"
                    style={{ color: "rgba(10,31,43,0.35)" }}>Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 block w-full border-b bg-transparent py-2 text-[14px] focus:outline-none"
                    style={{ borderColor: "rgba(10,31,43,0.14)", color: "#0a1f2b" }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(154,114,48,0.50)"; }}
                    onBlur={(e)  => { e.target.style.borderColor = "rgba(10,31,43,0.14)"; }}
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-[0.28em]"
                    style={{ color: "rgba(10,31,43,0.35)" }}>Contraseña</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 block w-full border-b bg-transparent py-2 text-[14px] focus:outline-none"
                    style={{ borderColor: "rgba(10,31,43,0.14)", color: "#0a1f2b" }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(154,114,48,0.50)"; }}
                    onBlur={(e)  => { e.target.style.borderColor = "rgba(10,31,43,0.14)"; }}
                    placeholder="••••••"
                  />
                </div>

                {error && (
                  <p className="text-[12px]" style={{ color: "#b14338" }}>{error}</p>
                )}

                {/* CTA — dark ink button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 flex w-full items-center justify-between rounded-full px-6 py-3 font-mono text-[10px] uppercase tracking-[0.32em] transition-opacity disabled:opacity-40"
                  style={{
                    background: "#0a1f2b",
                    color:      "rgba(249,244,236,0.88)",
                    boxShadow:  "0 2px 10px -2px rgba(10,31,43,0.22)",
                    transition: `all 0.45s ${SPRING}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#162e40"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#0a1f2b"; }}
                >
                  <span>{loading ? "Accediendo…" : "Entrar"}</span>
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                    style={{ background: "rgba(249,244,236,0.12)" }}
                  >
                    ↗
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
