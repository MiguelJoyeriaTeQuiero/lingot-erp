"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRole } from "@/lib/hooks/useRole";
import {
  companySettingsSchema,
  type CompanySettingsInput,
} from "@/lib/validations/company";
import { updateCompanySettingsAction } from "./actions";
import { RefreshSpotButton } from "./refresh-spot-button";

interface CompanyFormProps {
  defaultValues: Partial<CompanySettingsInput>;
  spotByMetal: { oro: number | null; plata: number | null };
  spotFetchedAt: { oro: string | null; plata: string | null };
}

const empty: CompanySettingsInput = {
  legal_name: null,
  trade_name: null,
  tax_id: null,
  address: null,
  city: null,
  postal_code: null,
  country: "España",
  email: null,
  phone: null,
  website: null,
  iban: null,
  default_igic_rate: 7,
  default_payment_days: 30,
  invoice_footer: null,
  metal_markup_pct: 4,
};

export function CompanyForm({
  defaultValues,
  spotByMetal,
  spotFetchedAt,
}: CompanyFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { role } = useRole();
  const readOnly = role !== null && role !== "admin";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<CompanySettingsInput>({
    resolver: zodResolver(companySettingsSchema),
    mode: "onBlur",
    defaultValues: { ...empty, ...defaultValues } as CompanySettingsInput,
  });

  const onSubmit = async (values: CompanySettingsInput) => {
    const result = await updateCompanySettingsAction(values);
    if (!result.success) {
      toast({
        variant: "error",
        title: "No se ha podido guardar",
        description: result.error,
      });
      return;
    }
    toast({ variant: "success", title: "Configuración actualizada" });
    reset(values);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
      {readOnly && (
        <div className="border-l-2 border-warning bg-warning/10 px-4 py-3 text-sm text-text-muted">
          Tu rol actual es sólo lectura. Los cambios no se podrán guardar.
        </div>
      )}

      {/* Identidad fiscal */}
      <Section
        eyebrow="01"
        title="Identidad fiscal"
        description="Aparecerá como emisor en todos los albaranes y facturas."
      >
        <Grid>
          <Input
            label="Razón social"
            {...register("legal_name")}
            error={errors.legal_name?.message}
            disabled={readOnly}
          />
          <Input
            label="Nombre comercial"
            {...register("trade_name")}
            error={errors.trade_name?.message}
            disabled={readOnly}
            placeholder="LINGOT"
          />
          <Input
            label="CIF / NIF"
            {...register("tax_id")}
            error={errors.tax_id?.message}
            disabled={readOnly}
          />
          <Input
            label="País"
            {...register("country")}
            error={errors.country?.message}
            disabled={readOnly}
          />
        </Grid>
      </Section>

      {/* Sede */}
      <Section
        eyebrow="02"
        title="Sede"
        description="Dirección que figurará en la cabecera del documento."
      >
        <Grid>
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
        </Grid>
      </Section>

      {/* Contacto */}
      <Section
        eyebrow="03"
        title="Contacto"
        description="Vía de comunicación con clientes."
      >
        <Grid>
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
            label="Sitio web"
            {...register("website")}
            error={errors.website?.message}
            disabled={readOnly}
            className="md:col-span-2"
            placeholder="https://"
          />
        </Grid>
      </Section>

      {/* Cobro */}
      <Section
        eyebrow="04"
        title="Cobro y fiscalidad"
        description="Datos bancarios y parámetros por defecto al emitir."
      >
        <Grid>
          <Input
            label="IBAN"
            {...register("iban")}
            error={errors.iban?.message}
            disabled={readOnly}
            className="md:col-span-2 font-mono"
            placeholder="ES00 0000 0000 0000 0000 0000"
          />
          <Input
            label="IGIC por defecto (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            {...register("default_igic_rate")}
            error={errors.default_igic_rate?.message}
            disabled={readOnly}
            help="7% Servicios · 0% Oro · 15% Plata"
          />
          <Input
            label="Días de pago por defecto"
            type="number"
            min="0"
            max="365"
            {...register("default_payment_days")}
            error={errors.default_payment_days?.message}
            disabled={readOnly}
            help="Vencimiento desde la fecha de emisión"
          />
        </Grid>
      </Section>

      {/* Pie de factura */}
      <Section
        eyebrow="05"
        title="Pie editorial"
        description="Texto al pie del documento (legal, cláusulas, agradecimientos)."
      >
        <div className="group/field space-y-2">
          <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-text-dim transition-colors group-focus-within/field:text-gold-deep">
            Pie de factura
          </label>
          <div className="relative">
            <textarea
              {...register("invoice_footer")}
              disabled={readOnly}
              rows={3}
              className="block w-full resize-none border-b border-border bg-transparent px-0 py-2.5 text-[15px] text-primary placeholder:text-text-dim/70 transition-colors duration-300 ease-out-expo focus:border-primary focus:outline-none"
              placeholder="Ej. Factura emitida conforme al régimen general del IGIC."
            />
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-500 ease-out-expo group-focus-within/field:scale-x-100"
            />
          </div>
          {errors.invoice_footer?.message && (
            <p className="text-[11px] tracking-wide text-danger">
              {errors.invoice_footer.message}
            </p>
          )}
        </div>
      </Section>

      {/* Cotización */}
      <Section
        eyebrow="06"
        title="Cotización del metal"
        description="Margen global aplicado sobre el spot. La cotización se refresca automáticamente 4× al día desde goldapi.io."
      >
        <div className="space-y-6">
          <Grid>
            <Input
              label="Margen global sobre spot (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register("metal_markup_pct")}
              error={errors.metal_markup_pct?.message}
              disabled={readOnly}
              help="Se aplica a (peso × ley × spot)"
            />
          </Grid>

          <div className="border border-border bg-surface-raised p-6 shadow-paper">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold-deep">
                  Cotización vigente
                </span>
                <h3 className="mt-1 font-display text-lg font-medium text-primary">
                  Mercado spot · EUR/g
                </h3>
              </div>
              <RefreshSpotButton />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SpotCard
                label="Oro · 24k"
                price={spotByMetal.oro}
                fetchedAt={spotFetchedAt.oro}
              />
              <SpotCard
                label="Plata · .999"
                price={spotByMetal.plata}
                fetchedAt={spotFetchedAt.plata}
              />
            </div>
            <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.24em] text-text-dim">
              Cron: 07:00 · 08:00 · 14:00 · 15:00 UTC
            </div>
          </div>
        </div>
      </Section>

      <div className="flex items-center justify-between border-t border-border pt-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-dim">
          {isDirty ? "Cambios sin guardar" : "Sincronizado"}
        </span>
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={readOnly || isSubmitting || !isDirty}
        >
          Guardar configuración
        </Button>
      </div>
    </form>
  );
}

function SpotCard({
  label,
  price,
  fetchedAt,
}: {
  label: string;
  price: number | null;
  fetchedAt: string | null;
}) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold-deep">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-editorial text-[40px] leading-none tracking-[-0.03em] text-primary tabular">
          {price != null ? price.toFixed(2) : "—"}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-text-dim">
          €/g
        </span>
      </div>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.24em] text-text-dim">
        {fetchedAt
          ? `Actualizado ${new Date(fetchedAt).toLocaleString("es-ES", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "Sin datos"}
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-12 gap-8">
      <div className="col-span-12 md:col-span-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold-deep">
          {eyebrow}
        </span>
        <h2 className="mt-2 font-display text-xl font-medium tracking-tight text-primary">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
            {description}
          </p>
        )}
        <span className="mt-4 block h-px w-12 bg-gold/60" />
      </div>
      <div className="col-span-12 md:col-span-9">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
      {children}
    </div>
  );
}
