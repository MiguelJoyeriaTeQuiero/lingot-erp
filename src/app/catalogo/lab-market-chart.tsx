"use client";

import { useMemo, useRef, useState } from "react";
import { Segment } from "./lab-segment";
import { useLabLang } from "./lab-lang";

/* ═══════════════════════════════════════════════════════════════════════════
   Gráfico del mercado — con los datos reales de metal_prices.

   El oro va a ~121 €/g y la plata a ~1,79 €/g: dos órdenes de magnitud. En un
   eje lineal compartido la plata sería una raya plana pegada al suelo. Por eso
   se dibuja la VARIACIÓN PORCENTUAL desde el inicio del periodo — las dos
   series arrancan en 0 % y se ve quién se ha movido más, que es la comparación
   que de verdad se puede hacer entre dos metales.

   El precio absoluto no desaparece: vive en la leyenda, y al pasar el cursor
   muestra el de esa fecha.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LabPunto { t: string; p: number }
export type LabSerie = LabPunto[];

interface Props {
  history: { oro: LabSerie; plata: LabSerie };
}

const W = 1000;
const H = 300;
const PAD_Y = 26;

export function LabMarketChart({ history }: Props) {
  const { t, money, date } = useLabLang();
  const RANGOS = [
    { v: 30,  t: t("ch.d30") },
    { v: 90,  t: t("ch.d90") },
    { v: 999, t: t("ch.all") },
  ];
  const [dias, setDias] = useState<number>(90);
  const [i, setI] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const datos = useMemo(() => {
    const corta = (s: LabSerie) => (dias >= 999 ? s : s.slice(-dias));
    const oro = corta(history.oro);
    const plata = corta(history.plata);

    // Las dos series comparten eje X: nos quedamos con las fechas que ambas tienen
    const fechas = oro.map((d) => d.t).filter((t) => plata.some((d) => d.t === t));
    const pick = (s: LabSerie) => fechas.map((t) => s.find((d) => d.t === t)!.p);

    const po = pick(oro);
    const pp = pick(plata);
    if (po.length < 2) return null;

    const varPct = (arr: number[]) => arr.map((v) => ((v - arr[0]!) / arr[0]!) * 100);
    const vo = varPct(po);
    const vp = varPct(pp);

    const todos = [...vo, ...vp];
    const min = Math.min(...todos);
    const max = Math.max(...todos);
    const span = Math.max(0.6, max - min);

    const x = (n: number) => (n / (fechas.length - 1)) * W;
    const y = (v: number) => PAD_Y + (1 - (v - min) / span) * (H - PAD_Y * 2);
    const linea = (vs: number[]) => vs.map((v, n) => `${n ? "L" : "M"}${x(n).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

    return {
      fechas, po, pp, vo, vp, min, max, x, y,
      pathOro:   linea(vo),
      pathPlata: linea(vp),
      areaOro:   `${linea(vo)} L${W},${H} L0,${H} Z`,
    };
  }, [history, dias]);

  if (!datos) {
    return (
      <p className="lab-body" style={{ fontSize: 14 }}>
        {t("ch.empty")}
      </p>
    );
  }

  const n = i ?? datos.fechas.length - 1;
  const activo = i !== null;

  const fecha = date(datos.fechas[n]!, { day: "2-digit", month: "long", year: "numeric" });

  /** Coordenada del puntero → índice del día más cercano. */
  const ultimo = datos.fechas.length - 1;
  function mover(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const rel = (e.clientX - r.left) / r.width;
    setI(Math.max(0, Math.min(ultimo, Math.round(rel * ultimo))));
  }

  const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)} %`;

  return (
    <div className="lab-chart">
      <div className="lab-chart-top">
        <Segment<number>
          label={t("ch.period")}
          value={dias}
          onChange={setDias}
          options={RANGOS}
        />

        <div className="lab-chart-legend">
          <div className="lab-chart-leg" data-metal="oro">
            <span className="lab-label">{t("ch.gold")}</span>
            <span className="lab-num lab-chart-precio">{money(datos.po[n]!)} / g</span>
            <span className="lab-chart-var" data-up={datos.vo[n]! >= 0}>{pct(datos.vo[n]!)}</span>
          </div>
          <div className="lab-chart-leg" data-metal="plata">
            <span className="lab-label">{t("ch.silver")}</span>
            <span className="lab-num lab-chart-precio">{money(datos.pp[n]!)} / g</span>
            <span className="lab-chart-var" data-up={datos.vp[n]! >= 0}>{pct(datos.vp[n]!)}</span>
          </div>
        </div>
      </div>

      <div className="lab-chart-stage">
        <svg
          ref={svgRef}
          className="lab-chart-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          onPointerMove={mover}
          onPointerLeave={() => setI(null)}
          role="img"
          aria-label={t("ch.aria", { n: datos.fechas.length })}
        >
          <defs>
            <linearGradient id="lab-area-oro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#e0bc78" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#e0bc78" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Cero: la referencia desde la que se mide todo */}
          <line className="lab-chart-cero" x1="0" x2={W}
                y1={datos.y(0)} y2={datos.y(0)} />

          <path className="lab-chart-area"  d={datos.areaOro} fill="url(#lab-area-oro)" />
          <path className="lab-chart-linea" data-metal="plata" d={datos.pathPlata} />
          <path className="lab-chart-linea" data-metal="oro"   d={datos.pathOro} />

          {activo && (
            <g className="lab-chart-guia">
              <line x1={datos.x(n)} x2={datos.x(n)} y1="0" y2={H} />
              <circle cx={datos.x(n)} cy={datos.y(datos.vp[n]!)} r="5" data-metal="plata" />
              <circle cx={datos.x(n)} cy={datos.y(datos.vo[n]!)} r="5" data-metal="oro" />
            </g>
          )}
        </svg>

        <span className="lab-chart-cero-tag" style={{ top: `${(datos.y(0) / H) * 100}%` }}>0 %</span>
      </div>

      <div className="lab-chart-eje">
        <span className="lab-label">
          {date(datos.fechas[0]!, { day: "2-digit", month: "short" })}
        </span>
        <span className="lab-label lab-chart-fecha" data-on={activo}>{fecha}</span>
        <span className="lab-label">
          {date(datos.fechas[datos.fechas.length - 1]!, { day: "2-digit", month: "short" })}
        </span>
      </div>
    </div>
  );
}
