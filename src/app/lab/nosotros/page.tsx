import type { Metadata } from "next";
import { getLatestSpots } from "@/lib/metal-prices";
import { LabAboutPage } from "../lab-about-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quiénes somos · Lingot — Metales Preciosos",
  description:
    "Conoce a Lingot: especialistas en metales preciosos de alta pureza. Nuestra filosofía, valores y compromiso con la calidad verificable.",
};

export default async function LabNosotrosPage() {
  // El segundo principio enseña el spot del oro por gramo, como en la portada
  const spots = await getLatestSpots();
  return <LabAboutPage spotOro={spots.oro?.price_eur_per_g ?? null} />;
}
