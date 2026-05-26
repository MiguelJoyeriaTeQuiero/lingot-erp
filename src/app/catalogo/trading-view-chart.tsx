"use client";

import { useEffect, useRef } from "react";

export function TradingViewChart() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "FX_IDC:XAUEUR",
      interval: "D",
      timezone: "Europe/Madrid",
      theme: "light",
      style: "1",
      locale: "es",
      allow_symbol_change: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      backgroundColor: "rgba(249, 244, 236, 0)",
      gridColor: "rgba(10, 31, 43, 0.06)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
    });

    container.appendChild(script);

    return () => {
      if (container.contains(script)) container.removeChild(script);
    };
  }, []);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height: "100%", width: "100%" }}
    >
      <div
        className="tradingview-widget-container__widget"
        style={{ height: "calc(100% - 32px)", width: "100%" }}
      />
    </div>
  );
}
