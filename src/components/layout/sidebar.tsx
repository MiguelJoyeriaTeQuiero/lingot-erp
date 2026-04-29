"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  BookOpen,
  Settings,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { LingotWordmark } from "./lingot-wordmark";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    label: "Visión",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "01" },
    ],
  },
  {
    label: "Operación",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users, hint: "02" },
      { href: "/inventario", label: "Inventario", icon: Package, hint: "03" },
      { href: "/documentos", label: "Documentos", icon: FileText,   hint: "04" },
      { href: "/libro",      label: "Libro",      icon: BookOpen,   hint: "05" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/configuracion", label: "Configuración", icon: Settings, hint: "06" },
    ],
  },
];

interface SidebarProps {
  email: string;
  fullName: string | null;
  role: "admin" | "contabilidad";
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ email, fullName, role, open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (fullName ?? email)
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-border bg-surface-sunken/95 backdrop-blur-xl transition-transform duration-300 ease-out-expo",
        "lg:translate-x-0 lg:z-20",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Vertical hairline gold accent on the right edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent"
      />

      {/* Mobile close button */}
      {onClose && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-text-muted transition-colors hover:text-primary lg:hidden"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      )}

      {/* Brand */}
      <div className="px-6 pb-6 pt-8">
        <LingotWordmark size="md" />
        <div className="mt-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-text-dim">
            ERP · v1
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-6">
          {sections.map((section) => (
            <li key={section.label}>
              <div className="mb-2 px-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-text-dim">
                  {section.label}
                </span>
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={onClose}
                        className={cn(
                          "group relative flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-300 ease-out-expo",
                          active
                            ? "bg-surface-raised text-primary shadow-paper"
                            : "text-text-muted hover:text-primary"
                        )}
                      >
                        {/* Vertical gold rail */}
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-0 top-1/2 h-5 w-px -translate-y-1/2 bg-gold transition-all duration-500 ease-out-expo",
                            active ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                          )}
                        />
                        <span
                          aria-hidden
                          className={cn(
                            "font-mono text-[10px] tracking-[0.2em] tabular transition-colors",
                            active ? "text-gold" : "text-text-dim"
                          )}
                        >
                          {item.hint}
                        </span>
                        <Icon
                          className={cn(
                            "h-4 w-4 transition-transform duration-300 ease-out-expo",
                            active ? "scale-100" : "scale-95 group-hover:scale-100"
                          )}
                          strokeWidth={1.5}
                        />
                        <span className="flex-1 tracking-wide">{item.label}</span>
                        {active && (
                          <span
                            aria-hidden
                            className="block h-1 w-1 rounded-full bg-gold shadow-[0_0_8px_rgba(184,138,61,0.7)]"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      {/* User block */}
      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-gold/50 bg-surface-raised font-mono text-[11px] tracking-wider text-gold-deep">
            {initials || "·"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-primary">
              {fullName ?? email.split("@")[0]}
            </div>
            <div className="truncate text-[11px] text-text-dim">{email}</div>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-gold-deep">
            {role}
          </span>
          <span className="h-px w-3 bg-gold" />
        </div>
        <button
          onClick={handleLogout}
          className="group flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-text-muted transition-colors hover:text-primary"
        >
          <span className="flex items-center gap-2">
            <LogOut
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              strokeWidth={1.5}
            />
            Cerrar sesión
          </span>
          <span className="font-mono text-[9px] tracking-[0.3em] text-text-dim transition-colors group-hover:text-gold">
            ESC
          </span>
        </button>
      </div>
    </aside>
  );
}
