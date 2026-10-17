import mongoose from "mongoose";
import { z } from "zod";
import { Consulta, TIPOS_SEGUIMIENTO } from "@/models/Consulta";
import { Usuario } from "@/models/Usuario";
import type { ContactType } from "./contact";
import { conectar } from "./db";
import {
  ESTADOS_CONSULTA,
  ESTADOS_PARA_RESPONDER,
  ETIQUETAS_ESTADO,
  estadoLeido,
  filtroDeEstados,
  LARGO_MAXIMO_NOTA,
  origenesDe,
  type EstadoConsulta,
} from "./estados-consulta";

export type TipoSeguimiento = (typeof TIPOS_SEGUIMIENTO)[number];

const AUTOR_ELIMINADO = "Usuario eliminado";

export type EntradaSeguimiento = {
  tipo: TipoSeguimiento;
  texto: string;
  autor: string;
  autorNombre: string;
  fecha: Date;
  emailEnviado?: boolean;
};

export type DetalleConsulta = {
  id: string;
  nombre: string;
  email: string;
  tipo: ContactType;
  mensaje: string;
  estado: EstadoConsulta;
  emailEnviado: boolean;
  creadaEn: Date;
  seguimiento: EntradaSeguimiento[];
};

export type ResultadoSeguimiento =
  | { ok: true }
  | {
      ok: false;
      error: "no-encontrada" | "transicion-invalida" | "invalida";
      mensaje: string;
    };

// Solo el formato hexadecimal de 24: `isValidObjectId` de Mongoose acepta cualquier cadena de 12 caracteres.
export const ID_VALIDO = /^[0-9a-f]{24}$/i;
const estadoSchema = z.enum(ESTADOS_CONSULTA);
const notaSchema = z.string().trim().min(1).max(LARGO_MAXIMO_NOTA);

export const NO_ENCONTRADA = {
  ok: false,
  error: "no-encontrada",
  mensaje: "La consulta no existe.",
} as const;

export function exigirAutor(autor: string, funcion: string): void {
  // El autor sale de la sesión (`requerirRol`), nunca del formulario: si no es un id, es un error del llamador.
  if (!ID_VALIDO.test(autor)) throw new Error(`${funcion}: el autor no es un id válido`);
}

/**
 * Datos de una consulta para el detalle del panel, con el historial en orden y el nombre de cada autor.
 * `null` si el id no es válido o no existe. Proyecta campos explícitos: `ipHash` no sale de este módulo.
 * El email del visitante sí, porque el operador lo necesita para responder. Leerla no cambia su estado.
 */
export async function obtenerConsulta(id: string): Promise<DetalleConsulta | null> {
  if (!ID_VALIDO.test(id)) return null;
  await conectar();
  const d = await Consulta.findById(id, {
    nombre: 1,
    email: 1,
    tipo: 1,
    mensaje: 1,
    estado: 1,
    emailEnviado: 1,
    creadaEn: 1,
    seguimiento: 1,
  }).lean();
  if (!d) return null;

  // `lean()` no aplica los defaults: un documento de antes de #39 no trae `seguimiento`.
  const entradas = d.seguimiento ?? [];
  // Un autor que no es un id (solo si se editó la base a mano) haría fallar el `$in`: se muestra como eliminado.
  const ids = [...new Set(entradas.map((e) => String(e.autor)))].filter((a) => ID_VALIDO.test(a));
  const autores = ids.length
    ? await Usuario.find({ _id: { $in: ids } }, { nombre: 1, email: 1 }).lean()
    : [];
  const nombres = new Map(autores.map((u) => [String(u._id), u.nombre || u.email]));

  return {
    id: String(d._id),
    nombre: d.nombre,
    email: d.email,
    tipo: d.tipo,
    mensaje: d.mensaje,
    estado: estadoLeido(d.estado),
    emailEnviado: d.emailEnviado,
    creadaEn: d.creadaEn,
    seguimiento: entradas.map((e) => {
      const autor = String(e.autor);
      const entrada: EntradaSeguimiento = {
        tipo: e.tipo,
        texto: e.texto,
        autor,
        autorNombre: nombres.get(autor) ?? AUTOR_ELIMINADO,
        fecha: e.fecha,
      };
      if (typeof e.emailEnviado === "boolean") entrada.emailEnviado = e.emailEnviado;
      return entrada;
    }),
  };
}

/**
 * Cambia el estado de una consulta si la transición es válida (`TRANSICIONES`, src/lib/estados-consulta.ts) y
 * deja una entrada `estado` en el seguimiento. Es un solo update condicionado al estado de origen: si otro
 * operador lo cambió en el medio, no se pisa, devuelve `transicion-invalida`. Si falla, no cambia nada.
 */
export async function cambiarEstado(
  id: string,
  estado: unknown,
  autor: string,
): Promise<ResultadoSeguimiento> {
  exigirAutor(autor, "cambiarEstado");
  const hacia = estadoSchema.safeParse(estado);
  if (!hacia.success) return { ok: false, error: "invalida", mensaje: "El estado no es válido." };
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADA;

  await conectar();
  const r = await Consulta.updateOne(
    // `filtroDeEstados` incluye un estado desconocido o ausente entre los orígenes de `nueva` (`estadoLeido`).
    { _id: id, estado: filtroDeEstados(origenesDe(hacia.data)) },
    {
      $set: { estado: hacia.data },
      $push: { seguimiento: { tipo: "estado", texto: hacia.data, autor, fecha: new Date() } },
    },
    { runValidators: true },
  );
  if (r.matchedCount === 1) return { ok: true };

  const actual = await Consulta.findById(id, { estado: 1 }).lean();
  if (!actual) return NO_ENCONTRADA;
  const desde = estadoLeido(actual.estado);
  return {
    ok: false,
    error: "transicion-invalida",
    mensaje:
      desde === hacia.data
        ? `La consulta ya está ${ETIQUETAS_ESTADO[desde]}.`
        : `No se puede pasar de ${ETIQUETAS_ESTADO[desde]} a ${ETIQUETAS_ESTADO[hacia.data]}.`,
  };
}

/**
 * Agrega una nota (1 a `LARGO_MAXIMO_NOTA` caracteres, sin los espacios de los bordes y con los saltos de
 * línea normalizados a LF) al seguimiento.
 */
export async function agregarNota(
  id: string,
  texto: unknown,
  autor: string,
): Promise<ResultadoSeguimiento> {
  exigirAutor(autor, "agregarNota");
  // El navegador manda los saltos de línea como CRLF, pero el `maxLength` del textarea los cuenta como uno.
  const nota = notaSchema.safeParse(
    typeof texto === "string" ? texto.replace(/\r\n?/g, "\n") : texto,
  );
  if (!nota.success) {
    return {
      ok: false,
      error: "invalida",
      mensaje: `La nota tiene que tener entre 1 y ${LARGO_MAXIMO_NOTA} caracteres.`,
    };
  }
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADA;

  await conectar();
  const r = await Consulta.updateOne(
    { _id: id },
    { $push: { seguimiento: { tipo: "nota", texto: nota.data, autor, fecha: new Date() } } },
    { runValidators: true },
  );
  return r.matchedCount === 1 ? { ok: true } : NO_ENCONTRADA;
}

/**
 * Una respuesta pendiente (reservada y sin `emailEnviado`) más vieja que esto se da por abandonada (el
 * proceso se cayó a mitad del envío, o no llegó a registrar un envío que venció por timeout): ya no bloquea
 * otra respuesta. Es mucho más que el timeout del envío y que los timeouts propios de nodemailer.
 */
export const RESERVA_VENCE_MS = 2 * 60_000;

export type ResultadoReserva =
  | { ok: true; fecha: Date }
  | { ok: false; error: "no-encontrada" | "estado-invalido" | "en-envio"; mensaje: string };

/** Condición sobre `seguimiento`: hay una respuesta pendiente sin vencer. */
function pendienteVigente() {
  return {
    $elemMatch: {
      tipo: "respuesta",
      emailEnviado: { $exists: false },
      fecha: { $gt: new Date(Date.now() - RESERVA_VENCE_MS) },
    },
  };
}

/**
 * Reserva el envío de una respuesta por email antes de mandarla (la usa `responderConsulta`,
 * src/lib/respuestas.ts): en un solo update condicionado a que la consulta esté en un estado desde el que se
 * responde (`ESTADOS_PARA_RESPONDER`) y a que no haya otra respuesta pendiente, agrega la entrada `respuesta`
 * sin `emailEnviado` (pendiente). Así dos pestañas u operadores no mandan dos emails: el segundo no matchea
 * y recibe `en-envio`. Si el envío vence por timeout o sale pero falla el registro, la entrada queda
 * pendiente ("sin confirmar") y sigue bloqueando hasta vencer.
 * `fecha` identifica la entrada para `completarRespuesta`. `texto` ya viene validado.
 */
export async function reservarRespuesta(
  id: string,
  texto: string,
  autor: string,
): Promise<ResultadoReserva> {
  exigirAutor(autor, "reservarRespuesta");
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADA;
  await conectar();
  const fecha = new Date();
  const r = await Consulta.updateOne(
    {
      _id: id,
      estado: filtroDeEstados(ESTADOS_PARA_RESPONDER),
      seguimiento: { $not: pendienteVigente() },
    },
    { $push: { seguimiento: { tipo: "respuesta", texto, autor, fecha } } },
    { runValidators: true },
  );
  if (r.matchedCount === 1) return { ok: true, fecha };

  const actual = await Consulta.findById(id, { estado: 1 }).lean();
  if (!actual) return NO_ENCONTRADA;
  const estado = estadoLeido(actual.estado);
  if (!ESTADOS_PARA_RESPONDER.includes(estado)) return estadoNoRespondible(estado);
  // La pendiente puede ser un envío en vuelo, uno que venció por timeout o uno que salió y no se pudo
  // registrar: no se afirma cuál.
  return {
    ok: false,
    error: "en-envio",
    mensaje:
      "Hay otra respuesta a esta consulta enviándose o sin confirmar. Mirá el seguimiento y revisá Enviados en Gmail antes de volver a responder.",
  };
}

/** Error de una consulta que no está en un estado desde el que se responde (`ESTADOS_PARA_RESPONDER`). */
export function estadoNoRespondible(estado: EstadoConsulta) {
  return {
    ok: false,
    error: "estado-invalido",
    mensaje: `La consulta está ${ETIQUETAS_ESTADO[estado]}: para responder por email, pasala a En curso.`,
  } as const;
}

/**
 * `completada`: la entrada reservada quedó marcada. `sin-entrada`: la consulta existe pero la entrada ya no
 * está pendiente (completada o borrada). `sin-consulta`: la consulta ya no existe.
 */
export type ResultadoCompletar = {
  resultado: "completada" | "sin-entrada" | "sin-consulta";
  estadoCambiado: boolean;
};

/**
 * Completa la respuesta que reservó `reservarRespuesta` (la de ese `autor` y esa `fecha`). Si el email salió
 * y la consulta sigue en un estado desde el que se responde, en un solo update marca `emailEnviado: true`,
 * agrega la entrada `estado` y la pasa a `respondida`. Si no salió, o si otro operador le cambió el estado
 * mientras se enviaba, solo marca `emailEnviado` (el email que salió queda registrado igual).
 */
export async function completarRespuesta(
  id: string,
  autor: string,
  fecha: Date,
  emailEnviado: boolean,
): Promise<ResultadoCompletar> {
  exigirAutor(autor, "completarRespuesta");
  if (!ID_VALIDO.test(id)) return { resultado: "sin-consulta", estadoCambiado: false };
  await conectar();
  const autorId = new mongoose.Types.ObjectId(autor);
  const pendiente = { tipo: "respuesta", autor: autorId, fecha, emailEnviado: { $exists: false } };

  if (emailEnviado) {
    // Pipeline: marcar la entrada y agregar otra al mismo array en un solo update (con `$set` posicional y
    // `$push` juntos, Mongo rechaza el conflicto). En un pipeline no hay casteo: el autor va como ObjectId.
    const r = await Consulta.updateOne(
      {
        _id: id,
        estado: filtroDeEstados(ESTADOS_PARA_RESPONDER),
        seguimiento: { $elemMatch: pendiente },
      },
      [
        {
          $set: {
            estado: "respondida",
            seguimiento: {
              $concatArrays: [
                {
                  $map: {
                    input: "$seguimiento",
                    as: "e",
                    in: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$$e.tipo", "respuesta"] },
                            { $eq: ["$$e.autor", autorId] },
                            { $eq: ["$$e.fecha", fecha] },
                            { $eq: [{ $type: "$$e.emailEnviado" }, "missing"] },
                          ],
                        },
                        { $mergeObjects: ["$$e", { emailEnviado: true }] },
                        "$$e",
                      ],
                    },
                  },
                },
                [{ tipo: "estado", texto: "respondida", autor: autorId, fecha: new Date() }],
              ],
            },
          },
        },
      ],
      { updatePipeline: true },
    );
    if (r.matchedCount === 1) return { resultado: "completada", estadoCambiado: true };
  }

  // El filtro exige la entrada: con `arrayFilters` solo, `matchedCount` cuenta el documento aunque no haya
  // ningún elemento que marcar.
  const r = await Consulta.updateOne(
    { _id: id, seguimiento: { $elemMatch: pendiente } },
    { $set: { "seguimiento.$[e].emailEnviado": emailEnviado } },
    {
      arrayFilters: [
        {
          "e.tipo": "respuesta",
          "e.autor": autorId,
          "e.fecha": fecha,
          "e.emailEnviado": { $exists: false },
        },
      ],
    },
  );
  if (r.matchedCount === 1) return { resultado: "completada", estadoCambiado: false };
  const existe = await Consulta.exists({ _id: id });
  return { resultado: existe ? "sin-entrada" : "sin-consulta", estadoCambiado: false };
}
