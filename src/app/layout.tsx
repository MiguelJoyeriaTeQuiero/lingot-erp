import type { Metadata } from "next";
import { Lato, Montserrat } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

// Son las fuentes del ERP. Sin precarga: este layout envuelve también el
// catálogo, que usa Open Sauce, y precargar diez archivos que la web pública no
// pinta retrasa su primera carga (y con ella el posicionamiento).
const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});

// Fuera de Google por defecto: el ERP y el login no se indexan. El layout del
// catálogo lo reabre para la web pública.
export const metadata: Metadata = {
  title: "Lingot — Gestión",
  description: "Plataforma de facturación y gestión de Lingot (Te Quiero Group).",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${lato.variable} ${montserrat.variable}`}
    >
      <body className="min-h-screen bg-surface text-text antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
