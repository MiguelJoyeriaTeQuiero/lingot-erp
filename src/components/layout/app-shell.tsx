"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  email: string;
  fullName: string | null;
  role: "admin" | "contabilidad";
  children: React.ReactNode;
}

export function AppShell({ email, fullName, role, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (escape key too)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* Mobile header bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface-sunken/90 px-4 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center text-text-muted transition-colors hover:text-primary"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold-deep">
          Lingot · ERP
        </span>
      </header>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          aria-hidden
          className="fixed inset-0 z-30 bg-ink/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        email={email}
        fullName={fullName}
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 pt-14 lg:ml-[260px] lg:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8 lg:px-10 lg:py-12">
          {children}
        </div>
      </main>
    </>
  );
}
