import { getLatestSpots } from "@/lib/metal-prices";
import { LabAboutPage } from "../lab-about-page";
import { JsonLd, pageLd, pageMeta } from "../lab-seo";

export const dynamic = "force-dynamic";

const TITLE = "Quiénes somos: oro de inversión de Te Quiero Group";
const DESCRIPTION =
  "Lingot pertenece a Te Quiero Group, joyería canaria nacida en Tenerife en 1988: oro y plata de inversión con pureza certificada y precio transparente.";

export const metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: "/nosotros" });

export default async function NosotrosPage() {
  // El segundo principio enseña el spot del oro por gramo, como en la portada
  const spots = await getLatestSpots();
  return (
    <>
      <JsonLd data={pageLd({
        type: "AboutPage", name: TITLE, description: DESCRIPTION, path: "/nosotros",
        crumbs: [{ name: "Quiénes somos", path: "/nosotros" }],
      })} />
      <LabAboutPage spotOro={spots.oro?.price_eur_per_g ?? null} />
    </>
  );
}
