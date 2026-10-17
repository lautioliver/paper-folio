import Link from "next/link";
import { notFound } from "next/navigation";
import { ChipEstado } from "@/components/panel/ChipEstado";
import { CONTACT_TYPE_LABELS } from "@/lib/contact";
import {
  ETIQUETAS_ESTADO,
  esEstadoConsulta,
} from "@/lib/estados-consulta";
import { requerirRol } from "@/lib/permisos";
import { obtenerConsulta, type EntradaSeguimiento } from "@/lib/seguimiento";
import { ControlesConsulta } from "./controles";
import { rutaDelDetalle } from "./ruta";

const fecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

function textoDe(e: EntradaSeguimiento): string {
  if (e.tipo === "estado") {
    return `Cambió el estado a ${esEstadoConsulta(e.texto) ? ETIQUETAS_ESTADO[e.texto] : e.texto}.`;
  }
  return e.texto;
}

// `false` es un error del envío: igual no afirma que no llegó. Sin `emailEnviado`, la respuesta está reservada
// y se está enviando, venció el timeout (el envío pudo seguir, #66) o el registro del resultado falló.
function envioDe(e: EntradaSeguimiento, email: string): string {
  if (e.emailEnviado === true) return `Enviada por email a ${email}.`;
  const revisar = "Revisá Enviados en Gmail antes de volver a responder.";
  if (e.emailEnviado === false) return `No se pudo confirmar el envío; puede haber llegado. ${revisar}`;
  return `Envío en curso o sin confirmar; puede haber llegado. ${revisar}`;
}

const TITULOS: Record<EntradaSeguimiento["tipo"], string> = {
  estado: "Estado",
  nota: "Nota",
  respuesta: "Respuesta",
};

/**
 * Detalle de una consulta. Primero el rol (antes de saber si el id existe), después la consulta: un id
 * inválido o inexistente responde 404. Abrir una consulta nueva no le cambia el estado.
 */
export async function DetalleConsulta({ id }: { id: string }) {
  await requerirRol(rutaDelDetalle(id), "operador", "admin");
  const c = await obtenerConsulta(id);
  if (!c) notFound();

  return (
    <div className="grid gap-8">
      <div>
        <Link
          href="/panel/consultas"
          className="text-pequeno font-bold underline decoration-2 underline-offset-4"
        >
          ← Todas las consultas
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-h2 font-bold break-words">{c.nombre}</h1>
          <ChipEstado estado={c.estado} />
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-1 text-pequeno sm:grid-cols-[auto_1fr]">
          <dt className="font-bold">Email</dt>
          <dd className="break-all">
            <a href={`mailto:${c.email}`} className="underline">
              {c.email}
            </a>
          </dd>
          <dt className="font-bold">Tipo</dt>
          <dd>{CONTACT_TYPE_LABELS[c.tipo]}</dd>
          <dt className="font-bold">Llegó</dt>
          <dd>
            <time dateTime={c.creadaEn.toISOString()}>
              {fecha.format(c.creadaEn)}
            </time>
          </dd>
          <dt className="font-bold">Aviso interno</dt>
          <dd>{c.emailEnviado ? "Enviado por email" : "No se pudo enviar"}</dd>
        </dl>
      </div>

      <section aria-labelledby="mensaje" className="contorno bg-papel p-4">
        <h2 id="mensaje" className="text-h3 font-bold">
          Mensaje
        </h2>
        <p className="mt-2 whitespace-pre-wrap break-words">{c.mensaje}</p>
      </section>

      <ControlesConsulta id={c.id} estado={c.estado} email={c.email} />

      <section aria-labelledby="seguimiento">
        <h2 id="seguimiento" className="text-h3 font-bold">
          Seguimiento
        </h2>
        {c.seguimiento.length === 0 ? (
          <p className="mt-2 text-pequeno">Todavía no hay movimientos.</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-3">
            {c.seguimiento.map((e, i) => (
              <li key={i} className="contorno bg-superficie p-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-pequeno">
                  <span className="font-bold">{TITULOS[e.tipo]}</span>
                  <span>{e.autorNombre}</span>
                  <time dateTime={e.fecha.toISOString()} className="sm:ml-auto">
                    {fecha.format(e.fecha)}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words">
                  {textoDe(e)}
                </p>
                {e.tipo === "respuesta" && (
                  <p className="mt-1 text-pequeno font-bold">{envioDe(e, c.email)}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
