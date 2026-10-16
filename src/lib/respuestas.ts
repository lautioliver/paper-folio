import nodemailer, { type SendMailOptions } from "nodemailer";
import { z } from "zod";
import { Consulta } from "@/models/Consulta";
import { conectar } from "./db";
import { leerGmailConfig } from "./env";
import {
  ESTADOS_PARA_RESPONDER,
  ETIQUETAS_ESTADO,
  estadoLeido,
  LARGO_MAXIMO_RESPUESTA,
} from "./estados-consulta";
import { exigirAutor, ID_VALIDO, registrarRespuesta } from "./seguimiento";

/** Lo mínimo de un transporte de nodemailer que usamos: se inyecta para testear sin Gmail. */
export type TransporteEmail = {
  sendMail(mensaje: SendMailOptions): Promise<unknown>;
  close?(): void;
};

export type ResultadoRespuesta =
  | { ok: true; estadoCambiado: boolean }
  | {
      ok: false;
      error: "invalida" | "no-encontrada" | "estado-invalido" | "envio-fallido";
      mensaje: string;
    };

const TIMEOUT_MS = 10_000;

// Caracteres de control y separadores de línea/párrafo: el nombre es texto libre del visitante y no puede
// abrir una cabecera nueva. El tipo es un enum, pero se limpia igual (el documento se pudo editar a mano).
const CONTROL = /[\p{Cc}\p{Zl}\p{Zp}]+/gu;

const respuestaSchema = z.string().trim().min(1).max(LARGO_MAXIMO_RESPUESTA);
const destinoSchema = z.email();

const NO_ENCONTRADA: ResultadoRespuesta = {
  ok: false,
  error: "no-encontrada",
  mensaje: "La consulta no existe.",
};

const fechaCita = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

/** Falla propia del envío (timeout, destino inválido): su código es seguro de mostrar y de loguear. */
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
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
}

async function enviarConTimeout(t: TransporteEmail, mensaje: SendMailOptions, timeoutMs: number) {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const vencido = new Promise<never>((_, rechazar) => {
    reloj = setTimeout(() => rechazar(new EnvioError("timeout")), timeoutMs);
  });
  const envio = t.sendMail(mensaje);
  envio.catch(() => {}); // si gana el timeout, que el rechazo tardío no quede sin atender
  try {
    await Promise.race([envio, vencido]);
  } catch (e) {
    // Corta la conexión colgada, así el email no sale después de haberlo dado por fallido.
    if (e instanceof EnvioError) t.close?.();
    throw e;
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
 * Responde por email (SMTP de Gmail, épica #36 decisión 4) una consulta en curso y lo registra en el
 * seguimiento (`registrarRespuesta`). El destino sale siempre de la consulta guardada; el cuerpo es texto
 * plano con la respuesta y, debajo, el mensaje original citado. Si el email sale, la consulta pasa a
 * `respondida`; si falla o tarda más de 10 s, queda una entrada con `emailEnviado: false`, el estado no cambia
 * y devuelve el error con su código. Del error solo se loguea el código: nunca la credencial, el destino ni
 * el texto. `transporte` es para los tests; sin él, usa Gmail con `GMAIL_USER` y `GMAIL_APP_PASSWORD`.
 */
export async function responderConsulta(
  id: string,
  texto: unknown,
  autor: string,
  transporte?: TransporteEmail,
  opciones: { timeoutMs?: number } = {},
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
  if (!ESTADOS_PARA_RESPONDER.includes(estado)) {
    return {
      ok: false,
      error: "estado-invalido",
      mensaje: `La consulta está ${ETIQUETAS_ESTADO[estado]}: para responder por email, pasala a En curso.`,
    };
  }

  const nombre = String(c.nombre).replace(CONTROL, " ").trim();
  let codigo: string | null = null;
  try {
    const config = leerGmailConfig();
    const destino = destinoSchema.safeParse(c.email);
    if (!destino.success) throw new EnvioError("destino-invalido");
    await enviarConTimeout(
      transporte ?? transporteGmail(config.GMAIL_USER, config.GMAIL_APP_PASSWORD),
      {
        from: config.GMAIL_USER,
        to: { name: nombre, address: destino.data },
        subject: `Re: tu consulta en Paperfolio (${String(c.tipo).replace(CONTROL, " ")})`,
        text: cuerpo(respuesta.data, { nombre, mensaje: c.mensaje, creadaEn: c.creadaEn }),
      },
      opciones.timeoutMs ?? TIMEOUT_MS,
    );
  } catch (e) {
    codigo = codigoDe(e);
    console.error(`responderConsulta: no se pudo enviar el email (${codigo})`);
  }

  const r = await registrarRespuesta(id, respuesta.data, autor, codigo === null);
  if (!r.ok) return NO_ENCONTRADA;
  if (codigo === null) return { ok: true, estadoCambiado: r.estadoCambiado };
  return {
    ok: false,
    error: "envio-fallido",
    mensaje: `No se pudo enviar el email (${codigo}). La respuesta quedó en el seguimiento como no enviada y la consulta sigue ${ETIQUETAS_ESTADO[estado]}.`,
  };
}
