"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRole } from "@/lib/hooks/useRole";
import { clientSchema, type ClientInput } from "@/lib/validations/client";
import {
  createClientAction,
  updateClientAction,
  toggleClientActive,
} from "./actions";

interface ClientFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<ClientInput>;
  clientId?: string;
}

const emptyDefaults: ClientInput = {
  type: "particular",
  name: "",
  tax_id: "",
  email: null,
  phone: null,
  address: null,
  city: null,
  postal_code: null,
  price_tier: "A",
  notes: null,
  active: true,
  contact_name: null,
};

export function ClientForm({ mode, defaultValues, clientId }: ClientFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { role } = useRole();
  const readOnly = mode === "edit" && role !== null && role !== "admin";

  const [togglePending, setTogglePending] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    mode: "onBlur",
    defaultValues: {
      ...emptyDefaults,
      ...defaultValues,
    } as ClientInput,
  });

  const type = watch("type");

  const onSubmit = async (values: ClientInput) => {
    const result =
      mode === "create"
        ? await createClientAction(values)
        : await updateClientAction(clientId!, values);

    if (!result.success) {
      toast({
        variant: "error",
        title: "No se ha podido guardar",
        description: result.error,
      });
      return;
    }

    toast({
      variant: "success",
      title: mode === "create" ? "Cliente creado" : "Cambios guardados",
    });

    if (mode === "create" && result.id) {
      router.push(`/clientes/${result.id}`);
    } else {
      router.refresh();
    }
  };

  const handleToggleActive = async () => {
    if (!clientId) return;
    const current = watch("active");
    const next = !current;
    const confirmMsg = next
      ? "¿Activar este cliente?"
      : "¿Desactivar este cliente?";
    if (!window.confirm(confirmMsg)) return;

    setTogglePending(true);
    const result = await toggleClientActive(clientId, next);
    setTogglePending(false);

    if (!result.success) {
      toast({
        variant: "error",
        title: "No se ha podido actualizar",
        description: result.error,
      });
      return;
    }

    toast({
      variant: "success",
      title: next ? "Cliente activado" : "Cliente desactivado",
    });
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {readOnly && (
        <div className="rounded-md border border-border bg-surface-raised px-4 py-3 text-sm text-text-muted">
          Tu rol actual es sólo lectura. Los cambios no se podrán guardar.
        </div>
      )}

      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
          Tipo de cliente
        </label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div className="flex gap-2">
              {(["particular", "empresa"] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => field.onChange(t)}
                  disabled={readOnly}
                  className={
                    "flex-1 rounded-md border px-3 py-2 text-sm transition-colors " +
                    (field.value === t
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border bg-surface-raised text-text-muted hover:text-text")
                  }
                >
                  {t === "particular" ? "Particular" : "Empresa"}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label={type === "empresa" ? "Razón social" : "Nombre completo"}
          {...register("name")}
          error={errors.name?.message}
          disabled={readOnly}
        />
        <Input
          label={type === "empresa" ? "CIF / NIF" : "NIF / NIE"}
          {...register("tax_id")}
          error={(errors as { tax_id?: { message?: string } }).tax_id?.message}
          disabled={readOnly}
        />

        {type === "empresa" && (
          <Input
            label="Persona de contacto"
            {...register("contact_name")}
            error={
              (errors as { contact_name?: { message?: string } }).contact_name
                ?.message
            }
            disabled={readOnly}
          />
        )}

        <Input
          label="Email"
          type="email"
          {...register("email")}
          error={errors.email?.message}
          disabled={readOnly}
        />
        <Input
          label="Teléfono"
          {...register("phone")}
          error={errors.phone?.message}
          disabled={readOnly}
        />

        <Input
          label="Dirección"
          {...register("address")}
          error={errors.address?.message}
          disabled={readOnly}
          className="md:col-span-2"
        />
        <Input
          label="Ciudad"
          {...register("city")}
          error={errors.city?.message}
          disabled={readOnly}
        />
        <Input
          label="Código postal"
          {...register("postal_code")}
          error={errors.postal_code?.message}
          disabled={readOnly}
        />

        <Select
          label="Tarifa"
          {...register("price_tier")}
          error={errors.price_tier?.message}
          disabled={readOnly}
        >
          <option value="A">Tarifa A</option>
          <option value="B">Tarifa B</option>
          <option value="C">Tarifa C</option>
          <option value="especial">Tarifa Especial</option>
        </Select>

        {mode === "edit" && (
          <label className="flex items-center gap-2 pt-6 text-sm text-text-muted">
            <input
              type="checkbox"
              {...register("active")}
              disabled={readOnly}
              className="h-4 w-4 rounded border-border bg-surface-raised accent-gold"
            />
            Cliente activo
          </label>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
          Notas
        </label>
        <textarea
          {...register("notes")}
          disabled={readOnly}
          rows={3}
          className="block w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/60"
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
        <div>
          {mode === "edit" && clientId && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleToggleActive}
              loading={togglePending}
              disabled={readOnly || togglePending}
            >
              {watch("active") ? "Desactivar cliente" : "Activar cliente"}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {mode === "edit" && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/clientes")}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={
              readOnly || isSubmitting || (mode === "edit" && !isDirty)
            }
          >
            {mode === "create" ? "Crear cliente" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </form>
  );
}
