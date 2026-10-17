import nodemailer, { type SendMailOptions } from "nodemailer-10";
import { z } from "zod";
import { Consulta } from "@/models/Consulta";
import { CONTACT_TYPE_LABELS, type ContactType } from "./contact";
import { conectar } from "./db";
import { leerGmailConfig } from "./env";
import {
  ESTADOS_PARA_RESPONDER,
  ETIQUETAS_ESTADO,
  estadoLeido,
  LARGO_MAXIMO_RESPUESTA,
} from "./estados-consulta";
import {
  completarRespuesta,
  estadoNoRespondible,
  exigirAutor,
  ID_VALIDO,
  NO_ENCONTRADA,
  RESERVA_VENCE_MS,
  reservarRespuesta,
  type ResultadoCompletar,
} from "./seguimiento";

/** Lo mínimo de un transporte de nodemailer que usamos: se inyecta para testear sin Gmail. */
export type TransporteEmail = {
  sendMail(mensaje: SendMailOptions): Promise<unknown>;
};

export type ResultadoRespuesta =
  | { ok: true; estadoCambiado: boolean }
  | {
      ok: false;
      error:
        | "invalida"
        | "no-encontrada"
        | "estado-invalido"
        | "en-envio"
        | "envio-fallido"
        | "registro-fallido";
      mensaje: string;
    };

// Tiempo máximo que espera el operador. nodemailer no se puede cancelar: sus propios timeouts (más cortos, y
// el de socket es de inactividad) cortan la mayoría de los cuelgues antes; si igual gana este, el envío
// sigue en curso y puede llegar, así que el mensaje lo avisa.
const TIMEOUT_MS = 10_000;

// Caracteres de control y separadores de línea/párrafo: el nombre es texto libre del visitante y no puede
// abrir una cabecera nueva. El tipo es un enum, pero se limpia igual (el documento se pudo editar a mano).
const CONTROL = /[\p{Cc}\p{Zl}\p{Zp}]+/gu;

const respuestaSchema = z.string().trim().min(1).max(LARGO_MAXIMO_RESPUESTA);
const destinoSchema = z.email();

const fechaCita = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

/** Falla propia (timeout, destino inválido): su código es seguro de mostrar y de loguear. */
class EnvioError extends Error {
  name = "EnvioError";
  constructor(readonly codigo: string) {
    super(codigo);
  }
}

/** Código o nombre de un error del transporte, nunca su mensaje (puede traer el destino o la credencial). */
function codigoDe(e: unknown): string {
  if (e instanceof EnvioError) return e.codigo;
  if (e instanceof Error && e.name === "EnvInvalidoError") return "configuracion";
  if (e && typeof e === "object") {
    const { code, name } = e as { code?: unknown; name?: unknown };
    for (const valor of [code, name]) {
      if (typeof valor === "string" && /^[\w-]{1,40}$/.test(valor)) return valor;
    }
  }
  return "Error";
}

function transporteGmail(user: string, pass: string): TransporteEmail {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    connectionTimeout: 4_000,
    greetingTimeout: 3_000,
    socketTimeout: 5_000,
  });
}

/** Espera `envio` hasta `timeoutMs`; si vence, rechaza con `timeout`, pero el envío sigue en curso. */
async function esperarConTimeout(envio: Promise<unknown>, timeoutMs: number) {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const vencido = new Promise<never>((_, rechazar) => {
    reloj = setTimeout(() => rechazar(new EnvioError("timeout")), timeoutMs);
  });
  try {
    await Promise.race([envio, vencido]);
  } finally {
    clearTimeout(reloj);
  }
}

function cuerpo(respuesta: string, c: { nombre: string; mensaje: string; creadaEn: Date }): string {
  const cita = c.mensaje
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => (l ? `> ${l}` : ">"))
    .join("\n");
  return `${respuesta}\n\nEl ${fechaCita.format(c.creadaEn)}, ${c.nombre} escribió:\n${cita}\n`;
}

/**
 * Responde por email (SMTP de Gmail, ADR-001 R-4) una consulta en curso y lo registra en el seguimiento.
 * Antes de enviar reserva la respuesta (`reservarRespuesta`: una entrada pendiente, así un segundo intento
 * simultáneo recibe `en-envio` y no sale otro email) y al terminar la completa (`completarRespuesta`). El
 * destino sale siempre de la consulta guardada; el cuerpo es texto plano con la respuesta y, debajo, el
 * mensaje original citado. Si el email sale, la consulta pasa a `respondida`; si falla, la entrada queda con
 * `emailEnviado: false`, el estado no cambia y devuelve el error con su código. Si tarda más de 10 s
 * (`timeout`), el envío puede seguir y llegar: la entrada queda pendiente (sin confirmar) y la reserva bloquea
 * otro envío; cuando el envío termina, la completa una tarea que se le pasa a `opciones.seguir` (la acción
 * usa `after`, así sigue después de responder). Si el email sale pero falla el registro, devuelve
 * `registro-fallido` y la entrada queda pendiente. Del error solo se loguea el código: nunca la credencial, el destino ni el texto.
 * `transporte` es para los tests; sin él, usa Gmail con `GMAIL_USER` y `GMAIL_APP_PASSWORD`.
 */
export async function responderConsulta(
  id: string,
  texto: unknown,
  autor: string,
  transporte?: TransporteEmail,
  opciones: { timeoutMs?: number; seguir?: (tarea: Promise<void>) => void } = {},
): Promise<ResultadoRespuesta> {
  exigirAutor(autor, "responderConsulta");
  // El navegador manda los saltos de línea como CRLF, pero el `maxLength` del textarea los cuenta como uno.
  const respuesta = respuestaSchema.safeParse(
    typeof texto === "string" ? texto.replace(/\r\n?/g, "\n") : texto,
  );
  if (!respuesta.success) {
    return {
      ok: false,
      error: "invalida",
      mensaje: `La respuesta tiene que tener entre 1 y ${LARGO_MAXIMO_RESPUESTA} caracteres.`,
    };
  }
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADA;

  await conectar();
  const c = await Consulta.findById(id, {
    nombre: 1,
    email: 1,
    tipo: 1,
    mensaje: 1,
    estado: 1,
    creadaEn: 1,
  }).lean();
  if (!c) return NO_ENCONTRADA;
  const estado = estadoLeido(c.estado);
  // `reservarRespuesta` lo vuelve a chequear de forma atómica; acá va antes para que un error de
  // configuración no tape que la consulta no se puede responder.
  if (!ESTADOS_PARA_RESPONDER.includes(estado)) return estadoNoRespondible(estado);

  // Sin configuración o sin un destino válido no se intenta nada: no se registra (reintentar no sirve hasta
  // arreglarlo, y cada clic sumaría una entrada).
  let config: ReturnType<typeof leerGmailConfig>;
  let destino: string;
  try {
    config = leerGmailConfig();
    const d = destinoSchema.safeParse(c.email);
    if (!d.success) throw new EnvioError("destino-invalido");
    destino = d.data;
  } catch (e) {
    const codigo = codigoDe(e);
    console.error(`responderConsulta: no se intentó enviar el email (${codigo})`);
    return {
      ok: false,
      error: "envio-fallido",
      mensaje: `No se pudo enviar el email (${codigo}). No se intentó: revisá la configuración o el email de la consulta.`,
    };
  }

  const reserva = await reservarRespuesta(id, respuesta.data, autor);
  if (!reserva.ok) return reserva;

  const nombre = String(c.nombre).replace(CONTROL, " ").trim();
  const tipo = CONTACT_TYPE_LABELS[c.tipo as ContactType] ?? String(c.tipo).replace(CONTROL, " ");
  const timeoutMs = opciones.timeoutMs ?? TIMEOUT_MS;
  let envio: Promise<unknown> | undefined;
  let codigo: string | null = null;
  let vencio = false; // ganó el timeout propio: el envío sigue en curso
  try {
    const t = transporte ?? transporteGmail(config.GMAIL_USER, config.GMAIL_APP_PASSWORD);
    envio = t.sendMail({
      from: config.GMAIL_USER,
      to: { name: nombre, address: destino },
      subject: `Re: tu consulta en Paperfolio (${tipo})`,
      text: cuerpo(respuesta.data, { nombre, mensaje: c.mensaje, creadaEn: c.creadaEn }),
    });
    envio.catch(() => {}); // si gana el timeout, que el rechazo tardío no quede sin atender
    await esperarConTimeout(envio, timeoutMs);
  } catch (e) {
    codigo = codigoDe(e);
    // Por la instancia, no por el código: un error del transporte también puede llamarse `timeout`.
    vencio = e instanceof EnvioError && e.codigo === "timeout";
    console.error(
      vencio
        ? "responderConsulta: Gmail no confirmó el envío a tiempo (timeout); se registra cuando termine"
        : `responderConsulta: no se pudo enviar el email (${codigo})`,
    );
  }

  // Tras un timeout el envío sigue en curso y puede salir: la entrada queda pendiente, así la reserva bloquea
  // otro envío (#66), y se completa cuando el envío termina. Si el proceso no llega a completarla (se cayó,
  // o la plataforma lo congeló), queda sin confirmar y la reserva vence a los `RESERVA_VENCE_MS`.
  if (vencio && envio) {
    const tarea = envio
      .then(
        () => true,
        (e: unknown) => {
          console.error(`responderConsulta: el envío falló después del timeout (${codigoDe(e)})`);
          return false;
        },
      )
      .then(async (enviado) => {
        const r = await completarRespuesta(id, autor, reserva.fecha, enviado);
        if (r.resultado !== "completada") {
          const que = enviado ? "salió" : "falló";
          console.error(`responderConsulta: el envío tardío ${que} y no quedó registrado (${r.resultado})`);
        }
      })
      .then(
        () => {},
        (e: unknown) =>
          console.error(`responderConsulta: no se pudo registrar el envío tardío (${codigoDe(e)})`),
      );
    opciones.seguir?.(tarea);
    return {
      ok: false,
      error: "envio-fallido",
      mensaje: `Gmail no confirmó el envío en ${Math.round(timeoutMs / 1000)} s: el email puede haber llegado. Revisá Enviados en Gmail antes de volver a responder. En el seguimiento queda sin confirmar hasta que Gmail responda, y por hasta ${Math.round(RESERVA_VENCE_MS / 60_000)} minutos no se puede mandar otra respuesta.`,
    };
  }

  let r: ResultadoCompletar;
  try {
    r = await completarRespuesta(id, autor, reserva.fecha, codigo === null);
  } catch (e) {
    console.error(`responderConsulta: no se pudo registrar el resultado del envío (${codigoDe(e)})`);
    return {
      ok: false,
      error: "registro-fallido",
      mensaje:
        codigo === null
          ? "El email se envió, pero no se pudo registrar: en el seguimiento queda como sin confirmar. No lo vuelvas a mandar."
          : `No se pudo enviar el email (${codigo}) ni registrarlo: en el seguimiento queda como sin confirmar.`,
    };
  }
  if (r.resultado === "sin-consulta") {
    return codigo === null
      ? { ...NO_ENCONTRADA, mensaje: "El email se envió, pero la consulta ya no existe: no quedó registrado." }
      : NO_ENCONTRADA;
  }
  if (r.resultado === "sin-entrada") {
    return {
      ok: false,
      error: "registro-fallido",
      mensaje:
        codigo === null
          ? "El email se envió, pero su entrada ya no estaba en el seguimiento: no quedó registrado. No lo vuelvas a mandar."
          : `No se pudo enviar el email (${codigo}) y su entrada ya no estaba en el seguimiento.`,
    };
  }
  if (codigo === null) return { ok: true, estadoCambiado: r.estadoCambiado };
  return {
    ok: false,
    error: "envio-fallido",
    mensaje: `No se pudo enviar el email (${codigo}). En el seguimiento queda como no confirmada y la consulta sigue ${ETIQUETAS_ESTADO[estado]}.`,
  };
}
