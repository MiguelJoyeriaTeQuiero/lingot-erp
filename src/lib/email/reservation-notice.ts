type ReservationNotice = {
  customerName: string | null;
  customerEmail: string | null;
  phone: string | null;
  productName: string;
  productSku: string | null;
  quantity: number;
  priceSnapshot: number;
  note: string | null;
  createdAt: Date;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

/**
 * Avisa por email al responsable de Lingot de una nueva reserva del catálogo.
 * Nunca lanza: si falta configuración o Resend falla, solo lo registra en el log.
 */
export async function sendReservationNotice(r: ReservationNotice): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESERVATION_EMAIL_FROM;
  const to = process.env.RESERVATION_EMAIL_TO?.split(",").map((s) => s.trim()).filter(Boolean);

  if (!apiKey || !from || !to?.length) {
    console.warn("[reservas] Aviso por email no enviado: falta RESEND_API_KEY, RESERVATION_EMAIL_FROM o RESERVATION_EMAIL_TO");
    return;
  }

  const cliente = r.customerName || r.customerEmail || "Un cliente";
  const fecha = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Atlantic/Canary",
  }).format(r.createdAt);
  const total = r.priceSnapshot * r.quantity;
  const erpUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/reservas`;

  const rows: [string, string | null][] = [
    ["Cliente", r.customerName],
    ["Email", r.customerEmail],
    ["Teléfono", r.phone],
    ["Producto", r.productName],
    ["SKU", r.productSku],
    ["Cantidad", String(r.quantity)],
    ["Precio unitario", eur(r.priceSnapshot)],
    ["Total estimado", eur(total)],
    ["Fecha", fecha],
    ["Nota", r.note],
  ];

  const html = `
<div style="font-family:Helvetica,Arial,sans-serif;color:#0a3746;max-width:560px">
  <h2 style="margin:0 0 8px;font-weight:600">Nueva reserva en el catálogo</h2>
  <p style="margin:0 0 20px">${escapeHtml(cliente)} ha reservado <strong>${escapeHtml(r.productName)}</strong> el ${escapeHtml(fecha)}.</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    ${rows
      .filter(([, v]) => v)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#5b7480;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:6px 0">${escapeHtml(v!)}</td></tr>`,
      )
      .join("")}
  </table>
  <p style="margin:24px 0 0"><a href="${escapeHtml(erpUrl)}" style="color:#0a3746;border-bottom:1px solid #c8a164;text-decoration:none">Ver reservas en el ERP</a></p>
</div>`;

  const text = [
    `${cliente} ha reservado ${r.productName} el ${fecha}.`,
    "",
    ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    `Ver reservas: ${erpUrl}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        reply_to: r.customerEmail ?? undefined,
        subject: `Nueva reserva: ${r.productName} · ${cliente}`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error("[reservas] Resend respondió", res.status, await res.text());
    }
  } catch (err) {
    console.error("[reservas] Error enviando aviso por email", err);
  }
}
