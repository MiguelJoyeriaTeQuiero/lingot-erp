"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import {
  reservationPulseAction,
  type FreshReservation,
} from "@/app/(app)/reservas/actions";

/* ═══════════════════════════════════════════════════════════════════════════
   Avisos de reservas del ERP.

   Cada 30 s se pregunta al servidor por reservas nuevas (sin tocar la base:
   nada de Realtime ni tablas nuevas). Por cada una sale un aviso en pantalla y,
   si el navegador lo permite, una notificación del sistema con un sonido corto.
   El contador de pendientes del menú sale de la misma consulta.

   Con varias pestañas del ERP abiertas, el aviso en pantalla sale en todas,
   pero la notificación del sistema y el sonido solo una vez: la primera
   pestaña que la ve lo apunta en localStorage.

   Los navegadores frenan los temporizadores de las pestañas en segundo plano
   (hasta una vez por minuto), así que con el ERP oculto el aviso puede tardar
   algo más de 30 s.
   ═══════════════════════════════════════════════════════════════════════════ */

const POLL_MS = 30_000;
const SEEN_KEY = "lingot:reservas:avisadas";

/** Evento para refrescar el contador sin esperar al siguiente sondeo. */
export const RESERVATIONS_CHANGED = "lingot:reservas-changed";

export type DesktopPermission = "unsupported" | NotificationPermission;

function readPermission(): DesktopPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Marca la reserva como avisada; devuelve false si otra pestaña ya lo hizo. */
function claim(r: FreshReservation): boolean {
  try {
    const last = localStorage.getItem(SEEN_KEY);
    if (last && Date.parse(last) >= Date.parse(r.created_at)) return false;
    localStorage.setItem(SEEN_KEY, r.created_at);
  } catch {
    /* sin almacenamiento: mejor avisar dos veces que ninguna */
  }
  return true;
}

function describe(r: FreshReservation) {
  const who = r.customer_name || r.customer_email || "Un cliente";
  const total = formatCurrency(Number(r.price_snapshot) * r.quantity);
  return { who, line: `${r.quantity} × ${r.product_name} · ${total}` };
}

export function useReservationWatcher(initial: { pending: number; since: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [pending, setPending] = useState(initial.pending);
  const [permission, setPermission] = useState<DesktopPermission>("unsupported");

  const sinceRef = useRef(initial.since);
  const busyRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  // Tras un router.refresh el layout trae el recuento recién calculado
  useEffect(() => { setPending(initial.pending); }, [initial.pending]);
  useEffect(() => { setPermission(readPermission()); }, []);

  /* Los navegadores no dejan sonar audio hasta el primer gesto del usuario:
     el contexto se crea y desbloquea con el primer clic en el ERP. */
  useEffect(() => {
    const unlock = () => {
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        audioRef.current ??= new Ctx();
        void audioRef.current.resume();
      } catch { /* sin audio */ }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  /** Dos notas cortas y suaves. */
  const chime = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx || ctx.state !== "running") return;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.16;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }, []);

  const announce = useCallback((r: FreshReservation) => {
    const { who, line } = describe(r);

    toast({
      variant: "info",
      title: `Nueva reserva · ${who}`,
      description: line,
      duration: 15_000,
      action: { label: "Ver reservas", onClick: () => router.push("/reservas") },
    });

    if (!claim(r)) return;
    chime();

    if (readPermission() === "granted") {
      try {
        const n = new Notification(`Nueva reserva · ${who}`, {
          body: line,
          // Misma reserva, misma notificación: el sistema no la duplica
          tag: `reserva-${r.id}`,
        });
        n.onclick = () => {
          window.focus();
          router.push("/reservas");
          n.close();
        };
      } catch { /* algunos navegadores móviles solo permiten notificar desde un service worker */ }
    }
  }, [toast, router, chime]);

  const poll = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const pulse = await reservationPulseAction(sinceRef.current);
      if (!pulse) return;
      setPending(pulse.pending);
      if (pulse.fresh.length > 0) {
        sinceRef.current = pulse.fresh[pulse.fresh.length - 1]!.created_at;
        pulse.fresh.forEach(announce);
        // Quien está mirando la lista la ve crecer sin recargar
        if (pathRef.current === "/reservas") router.refresh();
      }
    } catch {
      /* sin red o sesión caducada: se reintenta en el siguiente ciclo */
    } finally {
      busyRef.current = false;
    }
  }, [announce, router]);

  useEffect(() => {
    const id = window.setInterval(poll, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(RESERVATIONS_CHANGED, poll);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(RESERVATIONS_CHANGED, poll);
    };
  }, [poll]);

  /** El permiso solo se puede pedir desde un clic: lo dispara el botón del menú. */
  const enableDesktop = useCallback(async () => {
    if (readPermission() === "unsupported") return;
    try {
      setPermission(await Notification.requestPermission());
    } catch {
      setPermission(readPermission());
    }
  }, []);

  return { pending, permission, enableDesktop };
}
