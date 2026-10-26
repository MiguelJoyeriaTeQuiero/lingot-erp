import type { Metadata } from "next";
import Link from "next/link";
import { LabLegalPage, type LegalSection } from "../lab-legal";
import { TitularList, TitularMail } from "../lab-legal-parts";
import { TITULAR } from "../lab-legal-data";
import { LAB_PATHS } from "../lab-paths";

export const metadata: Metadata = {
  title: "Aviso legal · Lingot",
  description: "Titular de lingot.vip, condiciones de uso de la web, propiedad intelectual y responsabilidad.",
};

const SECTIONS: LegalSection[] = [
  {
    id: "titular",
    title: "Datos identificativos",
    body: (
      <>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de servicios de la sociedad de la
          información y de comercio electrónico (LSSI), te informamos de que este sitio web pertenece a:
        </p>
        <TitularList />
        <p>
          {TITULAR.marca} es la marca con la que {TITULAR.razonSocial}, empresa de {TITULAR.grupo}, comercializa
          oro y plata de inversión.
        </p>
      </>
    ),
  },
  {
    id: "objeto",
    title: "Objeto y ámbito",
    body: (
      <>
        <p>Este aviso regula el acceso y el uso de {TITULAR.web} y de todas sus páginas (la «web»), que sirve para:</p>
        <ul>
          <li>informar sobre los lingotes y monedas de oro y plata que comercializa {TITULAR.marca} y sobre su precio;</li>
          <li>publicar artículos informativos sobre el mercado de los metales preciosos (sección Análisis);</li>
          <li>dar a los clientes con cuenta acceso a un área privada en la que reservar piezas y consultar sus reservas y documentos.</li>
        </ul>
        <p>
          Navegar por la web supone aceptar este aviso. Las reservas y la compraventa se rigen además por
          las <Link href={LAB_PATHS.terms}>Condiciones de reserva y venta</Link>, y el tratamiento de tus datos por
          la <Link href={LAB_PATHS.privacy}>Política de privacidad</Link> y
          la <Link href={LAB_PATHS.cookies}>Política de cookies</Link>.
        </p>
      </>
    ),
  },
  {
    id: "uso",
    title: "Condiciones de uso",
    body: (
      <>
        <p>
          Puedes navegar por la web libremente y sin registrarte. El área privada está reservada a clientes: no hay
          registro en línea, sino que {TITULAR.marca} abre la cuenta después de una primera cita.
        </p>
        <p>
          Te comprometes a usar la web de forma lícita, de buena fe y conforme a este aviso. En particular, no debes
          dañarla, sobrecargarla ni impedir su funcionamiento normal; intentar acceder a zonas restringidas o a datos
          de otros usuarios; ni introducir virus u otros programas o elementos que puedan causar daños.
        </p>
        <p>
          Tus credenciales de acceso son personales e intransferibles. Guárdalas con diligencia y avísanos de
          inmediato si crees que otra persona las conoce. Podemos suspender el acceso al área privada si detectamos
          un uso indebido o un riesgo para la seguridad.
        </p>
      </>
    ),
  },
  {
    id: "precios",
    title: "Precios e información de producto",
    body: (
      <>
        <p>
          Los precios se calculan automáticamente sobre la cotización internacional del oro y de la plata (precio
          spot), que se actualiza cada hora, más la prima de cada pieza, e incluyen el IGIC cuando es aplicable.
        </p>
        <p>
          La cotización cambia de forma continua, así que los precios publicados son orientativos y no constituyen
          una oferta vinculante. El precio de cada operación es el que se confirma al cerrarla, como explican
          las <Link href={LAB_PATHS.terms}>Condiciones de reserva y venta</Link>.
        </p>
        <p>
          Las fotografías y las representaciones en 3D son ilustrativas: las características que cuentan son las de
          la ficha y las del certificado de cada pieza. Cuidamos que la información sea exacta, pero puede haber
          errores de transcripción o de cálculo, o desfases en la cotización; si afectan a una pieza que hayas
          reservado, te lo diremos antes de cerrar la operación.
        </p>
      </>
    ),
  },
  {
    id: "asesoramiento",
    title: "La información no es asesoramiento",
    body: (
      <>
        <p>
          Los contenidos de la web —los artículos de Análisis, los gráficos de cotización y las preguntas
          frecuentes incluidos— son información general. No son asesoramiento financiero, fiscal ni de inversión,
          ni una recomendación personalizada de compra o venta.
        </p>
        <p>
          {TITULAR.marca} vende y compra metales preciosos físicos; no presta servicios de inversión de los que
          regula la normativa del mercado de valores.
        </p>
        <p>
          El precio de los metales preciosos sube y baja, y las rentabilidades pasadas no garantizan las futuras.
          Antes de invertir valora tu situación y, si lo necesitas, consulta con un asesor independiente. La
          información fiscal de la web es general y puede no ajustarse a tu caso.
        </p>
      </>
    ),
  },
  {
    id: "propiedad",
    title: "Propiedad intelectual e industrial",
    body: (
      <>
        <p>
          Los textos, el diseño, el código, los gráficos, los modelos y animaciones en 3D, las fotografías propias
          y la marca y los logotipos de {TITULAR.marca} pertenecen al titular o a terceros que han autorizado su uso,
          y están protegidos por la normativa de propiedad intelectual e industrial.
        </p>
        <p>
          Puedes consultarlos y, para uso personal y privado, imprimirlos o guardarlos. No está permitido
          reproducirlos, distribuirlos, comunicarlos públicamente ni transformarlos con fines comerciales sin
          autorización por escrito.
        </p>
        <p>
          Las marcas de refinerías, cecas y fabricantes que aparecen en los nombres de los productos pertenecen a
          sus titulares y se mencionan solo para identificar la pieza. Algunas imágenes de la sección Análisis
          proceden del banco de imágenes Unsplash y se usan conforme a su licencia.
        </p>
      </>
    ),
  },
  {
    id: "responsabilidad",
    title: "Responsabilidad",
    body: (
      <>
        <p>
          Trabajamos para que la web esté disponible y funcione bien, pero no podemos garantizar que no haya
          interrupciones o errores técnicos. Podemos suspender el acceso temporalmente por mantenimiento,
          actualizaciones o causas ajenas a nuestro control.
        </p>
        <p>En la medida en que la ley lo permite, {TITULAR.marca} no responde de los daños derivados de:</p>
        <ul>
          <li>interrupciones o fallos de la web que no le sean imputables;</li>
          <li>un uso de la web contrario a este aviso;</li>
          <li>decisiones de inversión tomadas a partir de la información general publicada;</li>
          <li>virus u otros elementos dañinos introducidos por terceros pese a las medidas de seguridad adoptadas.</li>
        </ul>
        <p>Nada de lo dispuesto en este aviso limita los derechos que la ley reconoce a los consumidores.</p>
      </>
    ),
  },
  {
    id: "enlaces",
    title: "Enlaces",
    body: (
      <>
        <p>
          La web enlaza a algunas páginas de terceros, como la de la Agencia Española de Protección de Datos o la
          ayuda de los navegadores. No controlamos esos sitios ni respondemos de sus contenidos, y el enlace no
          implica ninguna relación ni recomendación. Si un enlace lleva a un contenido ilícito, avísanos
          en <TitularMail /> y lo retiraremos.
        </p>
        <p>
          Si quieres enlazar a {TITULAR.web}, hazlo a la portada o a una página concreta, sin reproducir sus
          contenidos, sin enmarcarlos y sin dar a entender una relación con {TITULAR.marca} que no exista.
        </p>
      </>
    ),
  },
  {
    id: "datos",
    title: "Protección de datos y cookies",
    body: (
      <p>
        Cómo tratamos tus datos personales se explica en la <Link href={LAB_PATHS.privacy}>Política de
        privacidad</Link>, y qué cookies y tecnologías similares usa la web, en
        la <Link href={LAB_PATHS.cookies}>Política de cookies</Link>.
      </p>
    ),
  },
  {
    id: "ley",
    title: "Legislación aplicable y jurisdicción",
    body: (
      <>
        <p>Este aviso se rige por la legislación española.</p>
        <p>
          Si eres consumidor, cualquier conflicto se resolverá ante los juzgados y tribunales de tu domicilio. En
          los demás casos, las partes se someten a los del domicilio del titular, salvo que una norma imperativa
          establezca otro fuero.
        </p>
        <p>
          Podemos modificar este aviso para adaptarlo a cambios legales o del servicio. La versión vigente es la
          publicada en esta página, con la fecha de actualización que figura al principio. Para cualquier consulta,
          escríbenos a <TitularMail />.
        </p>
      </>
    ),
  },
];

export default function AvisoLegalPage() {
  return (
    <LabLegalPage
      doc="notice"
      title="Aviso legal"
      lead="Quién está detrás de esta web y en qué condiciones puedes usarla."
      sections={SECTIONS}
    />
  );
}
