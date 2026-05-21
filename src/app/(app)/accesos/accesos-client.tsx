"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import {
  createCatalogUserAction,
  updateCatalogUserAction,
  deleteCatalogUserAction,
} from "./actions";

type Customer = {
  id: string;
  full_name: string;
  email: string;
  is_wholesale: boolean;
  last_sign_in: string | null;
};

type Mode = "list" | "create" | "edit";

export function AccesosClient({ customers }: { customers: Customer[] }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("list");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    is_wholesale: false,
  });

  function openCreate() {
    setForm({ full_name: "", email: "", password: "", is_wholesale: false });
    setEditing(null);
    setMode("create");
  }

  function openEdit(c: Customer) {
    setForm({ full_name: c.full_name, email: c.email, password: "", is_wholesale: c.is_wholesale });
    setEditing(c);
    setMode("edit");
  }

  function cancel() {
    setMode("list");
    setEditing(null);
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast({ variant: "error", title: "Nombre y email son obligatorios" });
      return;
    }
    if (mode === "create" && form.password.length < 6) {
      toast({ variant: "error", title: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    setSaving(true);
    const result = mode === "create"
      ? await createCatalogUserAction(form)
      : await updateCatalogUserAction(editing!.id, form);
    setSaving(false);

    if (!result.success) {
      toast({ variant: "error", title: "Error", description: result.error });
      return;
    }

    toast({ variant: "success", title: mode === "create" ? "Usuario creado" : "Usuario actualizado" });
    cancel();
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`¿Eliminar el acceso de "${name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(id);
    const result = await deleteCatalogUserAction(id);
    setDeleting(null);

    if (!result.success) {
      toast({ variant: "error", title: "Error al eliminar", description: result.error });
      return;
    }
    toast({ variant: "success", title: "Acceso eliminado" });
  }

  if (mode !== "list") {
    return (
      <div className="max-w-lg space-y-6 border border-border bg-surface-raised p-6 shadow-paper">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-text-dim">
          {mode === "create" ? "Nuevo acceso al catálogo" : `Editar · ${editing?.email}`}
        </h2>

        <div className="space-y-4">
          <Input
            label="Nombre completo"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          />
          {mode === "create" && (
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          )}
          <Input
            label={mode === "create" ? "Contraseña" : "Nueva contraseña (dejar vacío para no cambiar)"}
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            help={mode === "create" ? "Mínimo 6 caracteres" : ""}
          />
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.is_wholesale}
              onChange={(e) => setForm((f) => ({ ...f, is_wholesale: e.target.checked }))}
              className="h-4 w-4 border-border bg-surface-raised accent-primary"
            />
            <span className="text-sm text-text-muted">
              Acceso <span className="font-medium text-primary">mayorista</span>
              <span className="ml-1.5 text-[11px] text-text-dim">— ve el precio real sin margen minorista</span>
            </span>
          </label>
        </div>

        <div className="flex gap-2 border-t border-border pt-4">
          <Button onClick={handleSave} loading={saving}>
            {mode === "create" ? "Crear acceso" : "Guardar cambios"}
          </Button>
          <Button variant="ghost" onClick={cancel} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo acceso
        </Button>
      </div>

      {customers.length === 0 ? (
        <div className="border border-dashed border-border py-16 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-text-dim">
            Sin usuarios de catálogo todavía
          </p>
          <p className="mt-2 text-[13px] text-text-muted">
            Crea el primer acceso para que un cliente pueda ver el catálogo con precios personalizados.
          </p>
        </div>
      ) : (
        <div className="border border-border shadow-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunken/60">
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
                  Email
                </th>
                <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
                  Tipo precio
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
                  Último acceso
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-sunken/40">
                  <td className="px-4 py-3 font-medium text-primary">
                    {c.full_name || <span className="text-text-dim">—</span>}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{c.email}</td>
                  <td className="px-4 py-3 text-center">
                    {c.is_wholesale ? (
                      <span className="inline-flex items-center gap-1.5 border border-gold/30 bg-gold/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-gold-deep">
                        <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
                        Mayorista
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 border border-border bg-surface-sunken px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim">
                        <ShieldOff className="h-3 w-3" strokeWidth={1.5} />
                        Minorista
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-text-dim">
                    {c.last_sign_in ? formatDate(c.last_sign_in) : "Nunca"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="flex h-7 w-7 items-center justify-center text-text-dim transition-colors hover:text-primary"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.full_name || c.email)}
                        disabled={deleting === c.id}
                        className="flex h-7 w-7 items-center justify-center text-text-dim transition-colors hover:text-danger"
                        title="Eliminar acceso"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
