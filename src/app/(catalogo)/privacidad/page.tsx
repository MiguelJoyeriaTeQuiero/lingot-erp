import type { Metadata } from "next";
import Link from "next/link";
import { LabLegalPage, type LegalSection } from "../lab-legal";
import { LegalTable, TitularList, TitularMail } from "../lab-legal-parts";
import { TITULAR } from "../lab-legal-data";
import { LAB_PATHS } from "../lab-paths";

export const metadata: Metadata = {
  title: "Política de privacidad · Lingot",
  description: "Qué datos personales trata Lingot, para qué, con qué base legal, durante cuánto tiempo y cómo ejercer tus derechos.",
};

/* Lo que se describe aquí es lo que hace el sistema: la cuenta la abre el
   equipo (no hay registro en línea), la reserva guarda pieza, cantidad, precio,
   teléfono y nota y avisa por correo (Resend), los documentos se descargan
   tras comprobar que son del cliente, y la web vive en Vercel y Supabase. */

const SECTIONS: LegalSection[] = [
  {
    id: "responsable",
    title: "Responsable del tratamiento",
    body: (
      <>
        <p>El responsable del tratamiento de tus datos personales es:</p>
        <TitularList />
        <p>
          Para cualquier cuestión sobre privacidad o para ejercer tus derechos, escríbenos a <TitularMail /> con
          el asunto «Protección de datos».
        </p>
        <p>
          Esta política explica cómo tratamos los datos que recogemos a través de {TITULAR.web} y en nuestra
          relación con clientes e interesados: citas, reservas y compraventa y recompra de metales preciosos.
        </p>
      </>
    ),
  },
  {
    id: "datos",
    title: "Qué datos tratamos",
    body: (
      <>
        <p>Tratamos solo los datos necesarios para cada finalidad. Según tu relación con nosotros, pueden ser:</p>
        <ul>
          <li>
            <strong>Identificativos:</strong> nombre y apellidos o razón social, NIF, NIE o CIF y, cuando la ley lo
            exige, los datos y la copia de tu documento de identidad. Si eres una empresa, los de tu persona de
            contacto o representante.
          </li>
          <li><strong>De contacto:</strong> correo electrónico, teléfono y dirección postal.</li>
          <li>
            <strong>De acceso al área privada:</strong> tu correo electrónico y tu contraseña. La contraseña se
            guarda cifrada mediante una función hash, de modo que nadie en {TITULAR.marca} puede verla.
          </li>
          <li>
            <strong>De tus operaciones:</strong> reservas (pieza, cantidad, precio orientativo, fecha, estado y la
            nota que añadas), compras, ventas y recompras, facturas y demás documentos emitidos, los datos
            necesarios para el cobro o el pago y la tarifa que tienes asignada.
          </li>
          <li>
            <strong>Exigidos por la normativa de prevención del blanqueo de capitales,</strong> cuando proceda:
            actividad profesional o empresarial, origen de los fondos y documentación que lo acredite, condición
            de persona con responsabilidad pública y, en el caso de empresas, su titularidad real.
          </li>
          <li>
            <strong>Técnicos:</strong> dirección IP, fecha y hora, página solicitada y tipo de navegador, que el
            servidor registra al servir la web, y las preferencias de idioma y tema que elijas (ver
            la <Link href={LAB_PATHS.cookies}>Política de cookies</Link>).
          </li>
        </ul>
        <p>
          Los obtenemos de ti directamente —en la cita, por teléfono, por correo o a través de la web— o se generan
          durante nuestra relación, como el historial de reservas o las facturas. No tratamos categorías especiales
          de datos, como los de salud o los que revelan ideología. Si nos facilitas datos de otra persona, por
          ejemplo de un empleado de tu empresa, debes haberla informado antes.
        </p>
      </>
    ),
  },
  {
    id: "finalidades",
    title: "Para qué los usamos y con qué base legal",
    body: (
      <>
        <LegalTable
          head={["Finalidad", "Base jurídica"]}
          rows={[
            [
              "Abrir y mantener tu cuenta de cliente y darte acceso al área privada, donde consultas tus reservas y documentos.",
              "Ejecución del contrato (art. 6.1.b RGPD).",
            ],
            [
              "Gestionar tus reservas: registrarlas, avisar al equipo, llamarte para confirmarlas y fijar la cita y, si la pieza no está en existencias, pedirla al proveedor.",
              "Ejecución del contrato o aplicación, a petición tuya, de medidas precontractuales (art. 6.1.b RGPD).",
            ],
            [
              "Formalizar la compraventa o la recompra, entregar o enviar la pieza y atender la garantía y las incidencias.",
              "Ejecución del contrato (art. 6.1.b RGPD).",
            ],
            [
              "Emitir las facturas y cumplir las obligaciones contables y fiscales, incluidas las de los sistemas de facturación verificables (VERI*FACTU) cuando corresponda.",
              "Obligación legal (art. 6.1.c RGPD): normativa tributaria y mercantil.",
            ],
            [
              "Cumplir la normativa de prevención del blanqueo de capitales y de la financiación del terrorismo: identificar a clientes y titulares reales, aplicar la diligencia debida, conservar la documentación y, en su caso, comunicar operaciones a las autoridades.",
              "Obligación legal (art. 6.1.c RGPD): Ley 10/2010, de 28 de abril.",
            ],
            [
              "Atender las consultas que nos hagas por correo o por teléfono y concertar citas.",
              "Medidas precontractuales a petición tuya (art. 6.1.b RGPD) o nuestro interés legítimo en responderte (art. 6.1.f RGPD).",
            ],
            [
              "Proteger la seguridad de la web y del área privada y prevenir el fraude y los accesos indebidos.",
              "Interés legítimo en proteger nuestros sistemas y los datos de los clientes (art. 6.1.f RGPD).",
            ],
            [
              "Formular, ejercer o defender reclamaciones.",
              "Interés legítimo (art. 6.1.f RGPD).",
            ],
            [
              "Enviarte información comercial sobre nuestros productos: solo con tu consentimiento o, si ya eres cliente, sobre productos similares a los que nos compraste.",
              "Consentimiento (art. 6.1.a RGPD) o interés legítimo (art. 6.1.f RGPD y art. 21.2 LSSI). Puedes oponerte en cualquier momento y gratis, desde cada comunicación o escribiéndonos.",
            ],
          ]}
        />
        <p>
          Cuando nos basamos en el interés legítimo, hemos comprobado que no prevalecen sobre él tus intereses ni tus
          derechos. Puedes pedirnos información sobre esa valoración y oponerte al tratamiento.
        </p>
        <h3>¿Tienes que darnos tus datos?</h3>
        <p>
          Los datos identificativos, de contacto y de la operación son necesarios para abrir la cuenta, reservar y
          comprar o vender. Los que exige la Ley 10/2010 son obligatorios por ley: si no se facilitan, no podemos
          realizar la operación. El teléfono y la nota del formulario de reserva son voluntarios.
        </p>
        <h3>Decisiones automatizadas</h3>
        <p>
          No tomamos decisiones basadas únicamente en tratamientos automatizados que produzcan efectos jurídicos
          sobre ti o te afecten de forma significativa. El precio se calcula automáticamente a partir de la
          cotización y se aplica igual a todos los clientes de una misma tarifa; la tarifa que te corresponde la
          asigna nuestro equipo.
        </p>
      </>
    ),
  },
  {
    id: "conservacion",
    title: "Cuánto tiempo los conservamos",
    body: (
      <>
        <p>
          Conservamos tus datos mientras sean necesarios para la finalidad para la que se recogieron. Después los
          mantenemos bloqueados —a disposición solo de jueces, tribunales y administraciones públicas— mientras
          puedan exigirse responsabilidades, y pasado ese tiempo los suprimimos:
        </p>
        <LegalTable
          head={["Datos", "Plazo"]}
          rows={[
            [
              "Cuenta de cliente y área privada",
              "Mientras la cuenta esté activa. Si pides la baja, cerramos el acceso y conservamos los datos de tus operaciones durante los plazos siguientes.",
            ],
            [
              "Reservas y comunicaciones sobre ellas",
              "Mientras dure la relación y, después, hasta cinco años, el plazo general de prescripción de las acciones contractuales (art. 1964 del Código Civil).",
            ],
            [
              "Facturas y documentación contable",
              "Seis años (art. 30 del Código de Comercio), sin perjuicio de los plazos de la normativa tributaria.",
            ],
            [
              "Documentación de prevención del blanqueo de capitales",
              "Diez años desde el fin de la relación de negocio o desde la operación ocasional (art. 25 de la Ley 10/2010).",
            ],
            [
              "Consultas por correo o teléfono que no dan lugar a una relación",
              "El tiempo necesario para responderte y, como máximo, un año.",
            ],
            [
              "Registros técnicos del servidor",
              "El plazo breve que fija nuestro proveedor de alojamiento, salvo que debamos conservarlos para investigar un incidente de seguridad.",
            ],
            [
              "Preferencias de idioma y tema",
              "Se guardan en tu navegador hasta que las borres.",
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: "destinatarios",
    title: "A quién comunicamos tus datos",
    body: (
      <>
        <p>
          No vendemos tus datos ni los cedemos a terceros para sus propios fines comerciales. Solo los comunicamos
          cuando es necesario:
        </p>
        <ul>
          <li>
            <strong>A administraciones y autoridades,</strong> cuando lo exige la ley: la Agencia Tributaria y demás
            administraciones tributarias; el Servicio Ejecutivo de la Comisión de Prevención del Blanqueo de
            Capitales e Infracciones Monetarias (SEPBLAC); y juzgados, tribunales y Fuerzas y Cuerpos de Seguridad.
          </li>
          <li><strong>A entidades bancarias y de pago,</strong> para tramitar cobros y pagos.</li>
          <li>
            <strong>A empresas de transporte,</strong> si eliges recibir la pieza por envío: solo los datos
            necesarios para la entrega.
          </li>
          <li>
            <strong>A asesores profesionales</strong> (gestoría, auditoría o asesoría jurídica), sujetos a deber de
            confidencialidad, cuando hace falta para cumplir nuestras obligaciones o defender nuestros derechos.
          </li>
        </ul>
        <p>
          Además, algunos proveedores tratan datos por cuenta de {TITULAR.marca}, como encargados del tratamiento:
          lo hacen solo siguiendo nuestras instrucciones y con un contrato conforme al artículo 28 del RGPD.
        </p>
        <LegalTable
          head={["Proveedor", "Servicio"]}
          rows={[
            ["Vercel Inc.", "Alojamiento y entrega de la web."],
            ["Supabase, Inc.", "Base de datos y autenticación del área privada."],
            ["Resend", "Envío de los avisos internos por correo electrónico cuando se registra una reserva."],
            ["Proveedor de correo electrónico", "Gestión del correo con el que nos comunicamos contigo."],
          ]}
        />
      </>
    ),
  },
  {
    id: "transferencias",
    title: "Transferencias internacionales",
    body: (
      <p>
        Vercel, Supabase y Resend tienen su sede en Estados Unidos, por lo que algunos datos pueden tratarse fuera
        del Espacio Económico Europeo. Esas transferencias se amparan en la decisión de adecuación de la Comisión
        Europea sobre el Marco de Privacidad de Datos UE-EE. UU., para los proveedores adheridos a él, y en las
        cláusulas contractuales tipo aprobadas por la Comisión (art. 46.2.c RGPD) que incorporan sus contratos de
        encargo. Puedes pedirnos información sobre estas garantías en <TitularMail />.
      </p>
    ),
  },
  {
    id: "derechos",
    title: "Tus derechos",
    body: (
      <>
        <p>Puedes ejercer en cualquier momento, y de forma gratuita, los siguientes derechos:</p>
        <ul>
          <li><strong>Acceso:</strong> saber si tratamos datos tuyos y obtener una copia.</li>
          <li><strong>Rectificación:</strong> corregir los datos inexactos o completar los incompletos.</li>
          <li><strong>Supresión:</strong> pedir que borremos tus datos, por ejemplo cuando ya no sean necesarios.</li>
          <li>
            <strong>Oposición:</strong> oponerte a los tratamientos basados en nuestro interés legítimo y, siempre,
            a recibir comunicaciones comerciales.
          </li>
          <li>
            <strong>Limitación:</strong> pedir que conservemos tus datos solo para reclamaciones, o que dejemos de
            tratarlos mientras resolvemos una impugnación.
          </li>
          <li>
            <strong>Portabilidad:</strong> recibir los datos que nos diste, en un formato estructurado y de uso
            común, o que los enviemos a otro responsable, cuando los tratamos por contrato o consentimiento y por
            medios automatizados.
          </li>
          <li>
            <strong>Retirar tu consentimiento,</strong> cuando sea la base del tratamiento, sin que afecte a lo
            tratado antes.
          </li>
        </ul>
        <p>
          Para ejercerlos, escríbenos a <TitularMail /> o por correo postal a nuestro domicilio, indicando qué
          derecho ejerces. Si tenemos dudas razonables sobre tu identidad, podemos pedirte información adicional
          para confirmarla. Te responderemos en el plazo de un mes, ampliable en dos meses más si la solicitud es
          compleja o hay muchas; en ese caso te lo diremos dentro del primer mes.
        </p>
        <p>
          Algunos derechos tienen límites legales. Por ejemplo, no podemos suprimir los datos que la ley nos obliga a
          conservar, como las facturas o la documentación de prevención del blanqueo de capitales, mientras dure esa
          obligación; y los tratamientos ligados a comunicaciones a las autoridades en esa materia se rigen por el
          artículo 32 de la Ley 10/2010.
        </p>
        <p>
          Si crees que no hemos atendido bien tu solicitud, puedes presentar una reclamación ante la Agencia
          Española de Protección de Datos (C/ Jorge Juan, 6, 28001 Madrid ·{" "}
          <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>). Te agradeceremos
          que antes nos escribas: intentaremos resolverlo.
        </p>
      </>
    ),
  },
  {
    id: "seguridad",
    title: "Seguridad",
    body: (
      <>
        <p>
          Aplicamos medidas técnicas y organizativas adecuadas al riesgo (art. 32 RGPD): la web funciona siempre bajo
          conexión cifrada (HTTPS), las contraseñas se guardan cifradas mediante hash, el acceso a los datos de
          clientes se limita al personal que los necesita para su trabajo y los documentos del área privada solo se
          entregan tras comprobar que pertenecen a la cuenta que los pide.
        </p>
        <p>
          Si se produjera una violación de seguridad que supusiera un alto riesgo para tus derechos, te lo
          comunicaríamos sin dilación, además de notificarla a la Agencia Española de Protección de Datos cuando
          proceda. Por tu parte, no compartas tu contraseña y cierra la sesión si usas un dispositivo compartido.
        </p>
      </>
    ),
  },
  {
    id: "menores",
    title: "Menores de edad",
    body: (
      <p>
        Nuestros servicios se dirigen a personas mayores de edad. No tratamos de forma consciente datos de menores
        de 18 años, y las cuentas se abren después de una primera cita con el cliente.
      </p>
    ),
  },
  {
    id: "cambios",
    title: "Cambios en esta política",
    body: (
      <p>
        Podemos actualizar esta política para adaptarla a cambios legales o en nuestros tratamientos. La versión
        vigente es siempre la publicada aquí, con su fecha, y si el cambio es relevante y eres cliente te lo
        comunicaremos por correo electrónico.
      </p>
    ),
  },
];

export default function PrivacidadPage() {
  return (
    <LabLegalPage
      doc="privacy"
      title="Política de privacidad"
      lead="Qué datos tratamos, para qué, con qué base legal, cuánto tiempo los guardamos y cómo ejercer tus derechos."
      sections={SECTIONS}
    />
  );
}
