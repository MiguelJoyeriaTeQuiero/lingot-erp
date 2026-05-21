"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function CatalogLoginButton({ isLoggedIn, isWholesale }: { isLoggedIn: boolean; isWholesale: boolean }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError("Email o contraseña incorrectos");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-3">
        {isWholesale && (
          <span className="hidden border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-gold sm:inline-block">
            Precios mayorista
          </span>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-surface-raised/40 transition-colors hover:text-surface-raised/70"
        >
          <LogOut className="h-3 w-3" strokeWidth={1.5} />
          Salir
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-surface-raised/35 transition-colors hover:text-surface-raised/60"
      >
        <LogIn className="h-3 w-3" strokeWidth={1.5} />
        Acceso profesional
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-primary-deep/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm border border-white/10 bg-primary p-8 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-surface-raised/30 transition-colors hover:text-surface-raised/60"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <div className="mb-6">
              <div className="font-mono text-[9px] uppercase tracking-[0.4em] text-gold">
                Acceso profesional
              </div>
              <div className="mt-2 text-[13px] text-surface-raised/50">
                Introduce tus credenciales para ver los precios de tu tarifa.
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-surface-raised/40">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 block w-full border-b border-white/15 bg-transparent py-2 text-[14px] text-surface-raised placeholder:text-surface-raised/25 focus:border-gold/60 focus:outline-none"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.22em] text-surface-raised/40">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 block w-full border-b border-white/15 bg-transparent py-2 text-[14px] text-surface-raised placeholder:text-surface-raised/25 focus:border-gold/60 focus:outline-none"
                  placeholder="••••••"
                />
              </div>

              {error && (
                <p className="text-[12px] text-danger">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-gold py-3 font-mono text-[11px] uppercase tracking-[0.3em] text-primary-deep transition-opacity disabled:opacity-50 hover:opacity-90"
              >
                {loading ? "Accediendo…" : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
