import { z } from "zod";
import { Consulta } from "@/models/Consulta";
import { Usuario } from "@/models/Usuario";
import type { ContactType } from "./contact";
import { conectar } from "./db";
import {
  ESTADOS_CONSULTA,
  ETIQUETAS_ESTADO,
  estadoLeido,
  filtroDeEstados,
  LARGO_MAXIMO_NOTA,
  origenesDe,
  type EstadoConsulta,
} from "./estados-consulta";

export type TipoSeguimiento = "nota" | "respuesta" | "estado";

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

const NO_ENCONTRADA: ResultadoSeguimiento = {
  ok: false,
  error: "no-encontrada",
  mensaje: "La consulta no existe.",
};

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
  const ids = [...new Set(entradas.map((e) => String(e.autor)))];
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

export type ResultadoRegistro = { ok: true; estadoCambiado: boolean } | { ok: false; error: "no-encontrada"; mensaje: string };

/** STUB */
export async function registrarRespuesta(
  _id: string,
  _texto: string,
  _autor: string,
  _emailEnviado: boolean,
): Promise<ResultadoRegistro> {
  return { ok: true, estadoCambiado: false };
}
