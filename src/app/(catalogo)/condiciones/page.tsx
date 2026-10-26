import Link from "next/link";
import { LabLegalPage, type LegalSection } from "../lab-legal";
import { Pending, TitularMail } from "../lab-legal-parts";
import { TITULAR } from "../lab-legal-data";
import { LAB_PATHS } from "../lab-paths";
import { pageMeta } from "../lab-seo";

export const metadata = pageMeta({
  title:       "Condiciones de reserva y venta",
  description: "Cómo funcionan las reservas en Lingot y qué condiciones rigen la compraventa de oro y plata: precio, pago, entrega, desistimiento y recompra.",
  path:        "/condiciones",
});

/* El funcionamiento de la reserva sale de la propia web (lab-i18n: «Reservar
   no es comprar», pedido a fábrica si no hay existencias, reserva por
   teléfono) y de los cuatro estados de la tabla `reservations`. Lo que la web
   no dice —formas de pago, plazos o costes de envío— no se fija aquí: se remite
   a la confirmación de cada operación. */

const SECTIONS: LegalSection[] = [
  {
    id: "ambito",
    title: "Ámbito y aceptación",
    body: (
      <>
        <p>
          Estas condiciones regulan las reservas que los clientes hacen en el área privada de {TITULAR.web} y la
          compraventa de lingotes y monedas de oro y plata entre {TITULAR.razonSocial} («{TITULAR.marca}») y sus
          clientes. Puedes consultarlas, guardarlas e imprimirlas en esta página en cualquier momento.
        </p>
        <p>
          Al hacer una reserva declaras haberlas leído y las aceptas en la versión vigente en ese momento. Si al
          confirmar una operación acordamos condiciones particulares, estas prevalecen en lo que contradigan a las
          generales.
        </p>
        <p>
          Si actúas como consumidor, nada de lo aquí dispuesto limita los derechos que te reconoce el texto
          refundido de la Ley General para la Defensa de los Consumidores y Usuarios (Real Decreto Legislativo
          1/2007, «TRLGDCU»).
        </p>
      </>
    ),
  },
  {
    id: "cuenta",
    title: "Clientes y cuenta",
    body: (
      <>
        <p>
          Para reservar en la web necesitas una cuenta de cliente. No hay registro en línea: abrimos la cuenta
          después de una primera cita, en la que te identificamos como exige la normativa de prevención del
          blanqueo de capitales. Si aún no tienes cuenta, también puedes reservar por teléfono en
          el <a href={TITULAR.telefonoHref}>{TITULAR.telefono}</a>.
        </p>
        <p>
          Para contratar debes ser mayor de edad y tener capacidad legal, y los datos que nos facilites deben ser
          veraces y estar actualizados. Según tu perfil, tu cuenta tiene asignada la tarifa de particular o la
          mayorista; la asigna nuestro equipo.
        </p>
      </>
    ),
  },
  {
    id: "reserva",
    title: "Cómo funciona una reserva",
    body: (
      <>
        <p>
          <strong>Reservar no es comprar.</strong> La reserva es una solicitud para apartar una pieza y concertar la
          cita en la que se cierra la operación: no supone ningún pago ni te obliga a comprar.
        </p>
        <ol>
          <li>
            Desde la colección o desde la ficha de una pieza eliges cuántas unidades quieres y, si lo deseas, nos
            dejas un teléfono y una nota.
          </li>
          <li>
            Hasta que pulsas «Reservar» puedes cambiar cualquier dato. Al pulsarlo, la reserva queda registrada y
            aparece al momento en tu área privada con el estado «Pendiente».
          </li>
          <li>
            Te llamamos para confirmarla y fijar la cita. Si la pieza está disponible, la apartamos para ti; si no
            la tenemos en ese momento, la pedimos al proveedor al confirmar la reserva y te llamamos con la fecha.
            La reserva pasa entonces a «Confirmada».
          </li>
          <li>
            La operación se cierra en la cita o en la forma que acordemos, y la reserva pasa a «Entregada» cuando
            recibes la pieza.
          </li>
        </ol>
        <p>
          Tus reservas y los documentos que te emitimos, como las facturas, quedan archivados en tu área privada,
          desde donde puedes consultarlos y descargarlos. El contrato se formaliza en español.
        </p>
        <p>
          Puedes anular sin coste una reserva pendiente avisándonos por correo o por teléfono. Una vez confirmada
          —sobre todo si hemos pedido la pieza expresamente para ti—, su anulación se rige por lo que acordemos al
          confirmarla. Por nuestra parte, podemos no aceptar o cancelar una reserva si la pieza no está disponible,
          si hay un error manifiesto en el precio o si no es posible aplicar las medidas de diligencia debida que
          exige la ley; te lo comunicaremos y no tendrá ningún coste para ti. En esos casos la reserva aparece como
          «Cancelada».
        </p>
      </>
    ),
  },
  {
    id: "precio",
    title: "Precio e impuestos",
    body: (
      <>
        <p>
          El precio se calcula sobre la cotización internacional del oro o de la plata (precio spot), que
          actualizamos cada hora, más una prima que cubre la fabricación, la distribución y la certificación de cada
          pieza. Se expresa en euros e incluye el IGIC cuando es aplicable. En compras de volumen, puntuales o
          recurrentes, la prima se puede negociar.
        </p>
        <p>
          Como la cotización cambia de forma continua, el precio que muestran la web y tu reserva es orientativo. El
          precio definitivo es el que te confirmamos al cerrar la operación, calculado con la cotización de ese
          momento.
        </p>
        <p>
          El oro de inversión que cumple los requisitos legales está exento del impuesto indirecto conforme a su
          régimen especial. La plata, y el oro que no reúne esos requisitos, tributan al tipo vigente. Los gastos de
          envío, si los hay, te los indicamos antes de cerrar la operación.
        </p>
      </>
    ),
  },
  {
    id: "pago",
    title: "Pago",
    body: (
      <>
        <p>
          Las formas de pago disponibles te las indicamos al confirmar la operación, y entregamos la pieza una vez
          recibido el pago completo, salvo que acordemos otra cosa.
        </p>
        <p>
          Por ley, no pueden pagarse en efectivo las operaciones de 1.000 euros o más en las que intervenga un
          empresario o profesional; el límite es de 10.000 euros si quien paga es una persona física sin domicilio
          fiscal en España que no actúa como empresario (artículo 7 de la Ley 7/2012, de 29 de octubre).
        </p>
      </>
    ),
  },
  {
    id: "entrega",
    title: "Entrega y envío",
    body: (
      <>
        <p>
          Puedes recoger la pieza en la cita, en Santa Cruz de Tenerife, o recibirla por envío en cualquier lugar de
          España: trabajamos con empresas de transporte nacionales e internacionales. El coste, el plazo y las
          condiciones del envío se acuerdan antes de cerrar la operación.
        </p>
        <p>
          Canarias está fuera del territorio de aplicación del IVA de la Unión Europea, así que los envíos al resto
          de España o a otros países pueden requerir trámites aduaneros y generar impuestos a la importación en
          destino. Te informaremos de ello antes de cerrar la operación.
        </p>
        <p>
          Si eres consumidor, el riesgo de pérdida o deterioro de la pieza pasa a ti cuando la recibes tú o la
          persona que hayas indicado (art. 66 ter TRLGDCU). Al recibirla, comprueba que el embalaje y los precintos
          estén intactos y avísanos cuanto antes de cualquier incidencia.
        </p>
      </>
    ),
  },
  {
    id: "desistimiento",
    title: "Derecho de desistimiento",
    body: (
      <>
        <p>
          Si compras a distancia como consumidor —sin estar presente en la cita—, la ley excluye el derecho de
          desistimiento para los bienes cuyo precio depende de fluctuaciones del mercado financiero que el vendedor
          no puede controlar (artículo 103.b del TRLGDCU). Es el caso del oro y la plata de inversión, cuyo precio se
          fija sobre la cotización internacional del momento: una vez cerrada la compra, no podrás desistir de ella.
        </p>
        <p>
          Las compras hechas en persona no tienen derecho legal de desistimiento. Nada de esto afecta a tus derechos
          si la pieza no es conforme con lo contratado.
        </p>
      </>
    ),
  },
  {
    id: "garantia",
    title: "Autenticidad y garantía",
    body: (
      <>
        <p>
          Cada pieza que comercializamos lleva su certificado de pureza, y trabajamos únicamente con refinerías y
          distribuidores certificados por la LBMA. Conserva el certificado y el embalaje original: facilitan la
          recompra y la reventa.
        </p>
        <p>
          Si eres consumidor, respondemos de cualquier falta de conformidad que exista al entregarte la pieza y se
          manifieste en los tres años siguientes, conforme al TRLGDCU. Si detectas un problema, escríbenos
          a <TitularMail />.
        </p>
      </>
    ),
  },
  {
    id: "recompra",
    title: "Servicio de recompra",
    body: (
      <>
        <p>
          {TITULAR.marca} ofrece a sus clientes la recompra de sus piezas. El precio se calcula con la cotización
          del metal en el momento de la operación y depende del formato, lingote o moneda. Antes de cerrarla podemos
          verificar la autenticidad de la pieza.
        </p>
        <p>
          Para recomprar debemos identificarte y cumplir las obligaciones legales de registro y de prevención del
          blanqueo de capitales. Ten en cuenta que la ganancia que obtengas al vender puede tributar en tu
          declaración de impuestos.
        </p>
      </>
    ),
  },
  {
    id: "blanqueo",
    title: "Prevención del blanqueo de capitales",
    body: (
      <p>
        Como comerciante profesional de metales preciosos, {TITULAR.marca} es sujeto obligado de la Ley 10/2010, de
        28 de abril, de prevención del blanqueo de capitales y de la financiación del terrorismo. Por eso, antes de
        operar debemos identificarte con un documento oficial y, según el caso, conocer tu actividad, el origen de
        los fondos o, si eres una empresa, su titular real. Si no es posible aplicar estas medidas, la ley nos impide
        realizar la operación. Cómo tratamos esos datos se explica en
        la <Link href={LAB_PATHS.privacy}>Política de privacidad</Link>.
      </p>
    ),
  },
  {
    id: "reclamaciones",
    title: "Atención al cliente y reclamaciones",
    body: (
      <>
        <p>
          Puedes contactarnos en <TitularMail /> o en el <a href={TITULAR.telefonoHref}>{TITULAR.telefono}</a>.
          Atendemos con cita previa en Santa Cruz de Tenerife.
        </p>
        <p>
          Si tienes una queja o reclamación, escríbenos: te responderemos lo antes posible y, en todo caso, en el
          plazo máximo de un mes. Si eres consumidor, también puedes pedir la hoja de reclamaciones oficial y acudir
          a los servicios de consumo del Gobierno de Canarias o de tu comunidad autónoma.
        </p>
        <Pending block>
          indicar si {TITULAR.marca} está adherida al Sistema Arbitral de Consumo o a otra entidad de resolución
          alternativa de litigios (Ley 7/2017) y, en su caso, cuál.
        </Pending>
      </>
    ),
  },
  {
    id: "ley",
    title: "Legislación aplicable y jurisdicción",
    body: (
      <p>
        Estas condiciones se rigen por la legislación española. Si eres consumidor, cualquier conflicto se resolverá
        ante los juzgados y tribunales de tu domicilio; en los demás casos, ante los del domicilio del titular, salvo
        que una norma imperativa establezca otro fuero.
      </p>
    ),
  },
];

export default function CondicionesPage() {
  return (
    <LabLegalPage
      doc="terms"
      title="Condiciones de reserva y venta"
      lead="Cómo funcionan las reservas y qué condiciones rigen la compraventa de oro y plata, del precio a la entrega."
      sections={SECTIONS}
    />
  );
}
