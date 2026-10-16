import { z } from "zod";
import { SERVICE_ICONS, type ServiceIcon } from "@/content/profile";
import { Servicio } from "@/models/Servicio";
import { esUrlHttps } from "./contenido-esquemas";
import { asegurarIndicesDe, conectar } from "./db";
import { LARGO_DESCRIPCION, LARGO_TITULO, type CampoServicio } from "./servicios-campos";

export { LARGO_DESCRIPCION, LARGO_TITULO, type CampoServicio } from "./servicios-campos";

// Administración de los servicios desde el panel (#52). Solo para admin: el rol lo exigen las páginas y
// las server actions antes de llamar acá. Toda entrada se valida con Zod.
//
// Crear y editar guardan con `save()` sobre el documento, nunca con `findOneAndUpdate`/`updateOne`: el
// `required` de `icono` en el modelo lee `this.imagen`, y en los validadores de una query `this` es la
// Query (la validación no correría bien).

/** Un servicio como lo ve el panel (todos, publicados o no). */
export type ServicioAdmin = {
  id: string;
  titulo: string;
  descripcion: string;
  icono?: ServiceIcon;
  imagen?: string;
  orden: number;
  publicado: boolean;
};

export type ResultadoServicio =
  | { ok: true; id: string }
  | {
      ok: false;
      error: "invalido" | "duplicado" | "no-encontrado";
      mensaje: string;
      campos?: Partial<Record<CampoServicio, string>>;
    };

/** Lo que manda el formulario. `ilustracion` dice cuál de los dos vale: `icono` o `imagen`. */
export type EntradaServicio = {
  titulo?: unknown;
  descripcion?: unknown;
  ilustracion?: unknown;
  icono?: unknown;
  imagen?: unknown;
  publicado?: unknown;
};

// Solo el formato hexadecimal de 24: `isValidObjectId` acepta cualquier cadena de 12 caracteres.
const ID_VALIDO = /^[0-9a-f]{24}$/i;
const EN_ORDEN = { orden: 1, _id: 1 } as const;

const NO_ENCONTRADO: ResultadoServicio = { ok: false, error: "no-encontrado", mensaje: "El servicio no existe." };
const REVISAR = "Revisá los campos marcados.";

const comunes = {
  titulo: z
    .string()
    .trim()
    .min(1, { error: "Poné un título." })
    .max(LARGO_TITULO, { error: `El título tiene que tener hasta ${LARGO_TITULO} caracteres.` }),
  descripcion: z
    .string()
    .trim()
    .min(1, { error: "Poné una descripción." })
    .max(LARGO_DESCRIPCION, { error: `La descripción tiene que tener hasta ${LARGO_DESCRIPCION} caracteres.` }),
  publicado: z.boolean(),
};

// Se guarda solo la ilustración elegida: el otro campo queda sin valor.
const formularioEsquema = z
  .discriminatedUnion(
    "ilustracion",
    [
      z.object({
        ...comunes,
        ilustracion: z.literal("icono"),
        icono: z.enum(SERVICE_ICONS, { error: "Elegí uno de los íconos." }),
      }),
      z.object({
        ...comunes,
        ilustracion: z.literal("imagen"),
        imagen: z.string().trim().refine(esUrlHttps, { error: "Subí una imagen." }),
      }),
    ],
    { error: "Elegí un ícono o una imagen." },
  )
  .transform((d) => ({
    titulo: d.titulo,
    descripcion: d.descripcion,
    publicado: d.publicado,
    icono: d.ilustracion === "icono" ? d.icono : undefined,
    imagen: d.ilustracion === "imagen" ? d.imagen : undefined,
  }));

type DatosServicio = z.output<typeof formularioEsquema>;
type Rechazo = Extract<ResultadoServicio, { ok: false }>;

const CAMPOS: readonly CampoServicio[] = ["titulo", "descripcion", "icono", "imagen"];

function validarEntrada(entrada: EntradaServicio): { ok: true; datos: DatosServicio } | Rechazo {
  const r = formularioEsquema.safeParse(entrada);
  if (r.success) return { ok: true, datos: r.data };
  const campos: Partial<Record<CampoServicio, string>> = {};
  for (const issue of r.error.issues) {
    // Sin una ilustración válida, el error va en el ícono (el control que se ve primero).
    const campo = issue.path[0] === "ilustracion" ? "icono" : issue.path[0];
    const destino = CAMPOS.find((c) => c === campo);
    if (destino) campos[destino] ??= issue.message;
  }
  return { ok: false, error: "invalido", mensaje: REVISAR, campos };
}

function esDuplicado(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
}

const DUPLICADO: ResultadoServicio = {
  ok: false,
  error: "duplicado",
  mensaje: REVISAR,
  campos: { titulo: "Ya hay un servicio con ese título." },
};

type DocLeido = {
  _id: unknown;
  titulo: string;
  descripcion: string;
  icono?: ServiceIcon | null;
  imagen?: string | null;
  orden?: number | null;
  publicado?: boolean | null;
};

function aAdmin(d: DocLeido): ServicioAdmin {
  return {
    id: String(d._id),
    titulo: d.titulo,
    descripcion: d.descripcion,
    icono: d.icono ?? undefined,
    imagen: d.imagen ?? undefined,
    orden: d.orden ?? 0,
    publicado: d.publicado ?? false,
  };
}

/** Prepara la base para escribir: el índice único de `titulo` tiene que existir antes del primer alta. */
async function prepararEscritura(): Promise<void> {
  await conectar();
  await asegurarIndicesDe(Servicio);
}

/** Todos los servicios, en el orden de la landing. */
export async function listarServiciosAdmin(): Promise<ServicioAdmin[]> {
  await conectar();
  const docs = await Servicio.find({}).sort(EN_ORDEN).lean<DocLeido[]>();
  return docs.map(aAdmin);
}

/** Un servicio para editarlo, o `null` si el id no es válido o no existe. */
export async function obtenerServicioAdmin(id: string): Promise<ServicioAdmin | null> {
  if (!ID_VALIDO.test(id)) return null;
  await conectar();
  const doc = await Servicio.findById(id).lean<DocLeido>();
  return doc ? aAdmin(doc) : null;
}

/** Crea un servicio al final del orden. */
export async function crearServicio(entrada: EntradaServicio): Promise<ResultadoServicio> {
  const v = validarEntrada(entrada);
  if (!v.ok) return v;
  await prepararEscritura();
  const ultimo = await Servicio.findOne({}, { orden: 1 }).sort({ orden: -1 }).lean<{ orden?: number }>();
  try {
    const doc = await new Servicio({ ...v.datos, orden: (ultimo?.orden ?? -1) + 1 }).save();
    return { ok: true, id: String(doc._id) };
  } catch (error) {
    if (esDuplicado(error)) return DUPLICADO;
    throw error;
  }
}

/** Edita el título, la descripción, la ilustración y si está publicado. El orden no cambia. */
export async function editarServicio(id: string, entrada: EntradaServicio): Promise<ResultadoServicio> {
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADO;
  const v = validarEntrada(entrada);
  if (!v.ok) return v;
  await prepararEscritura();
  const doc = await Servicio.findById(id);
  if (!doc) return NO_ENCONTRADO;
  // `undefined` saca el campo del documento: queda solo la ilustración elegida.
  doc.set(v.datos);
  try {
    await doc.save();
    return { ok: true, id };
  } catch (error) {
    if (esDuplicado(error)) return DUPLICADO;
    throw error;
  }
}

export async function borrarServicio(id: string): Promise<ResultadoServicio> {
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADO;
  await conectar();
  const r = await Servicio.deleteOne({ _id: id });
  return r.deletedCount === 1 ? { ok: true, id } : NO_ENCONTRADO;
}

/** Publica o despublica. Un servicio despublicado no aparece en la landing. */
export async function publicarServicio(id: string, publicado: unknown): Promise<ResultadoServicio> {
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADO;
  const valor = z.boolean().safeParse(publicado);
  if (!valor.success) return { ok: false, error: "invalido", mensaje: "Valor de publicado inválido." };
  await conectar();
  // Un solo campo booleano: no pasa por el validador de `icono` (que no anda en una query).
  const r = await Servicio.updateOne({ _id: id }, { $set: { publicado: valor.data } });
  return r.matchedCount === 1 ? { ok: true, id } : NO_ENCONTRADO;
}

const direccionEsquema = z.enum(["subir", "bajar"]);

/**
 * Sube o baja un servicio un lugar. Renumera todos (0, 1, 2…) en el orden resultante: así un orden
 * repetido (todos en 0, por ejemplo) no deja el intercambio sin efecto. En los extremos no hace nada.
 */
export async function moverServicio(id: string, direccion: unknown): Promise<ResultadoServicio> {
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADO;
  const dir = direccionEsquema.safeParse(direccion);
  if (!dir.success) return { ok: false, error: "invalido", mensaje: "Dirección inválida." };
  await conectar();
  const docs = await Servicio.find({}, { orden: 1 }).sort(EN_ORDEN).lean<{ _id: unknown; orden?: number }[]>();
  const i = docs.findIndex((d) => String(d._id) === id);
  if (i === -1) return NO_ENCONTRADO;
  const j = dir.data === "subir" ? i - 1 : i + 1;
  if (j < 0 || j >= docs.length) return { ok: true, id };
  [docs[i], docs[j]] = [docs[j], docs[i]];
  const cambios = docs.flatMap((d, orden) =>
    d.orden === orden ? [] : [{ updateOne: { filter: { _id: d._id }, update: { $set: { orden } } } }],
  );
  if (cambios.length > 0) await Servicio.bulkWrite(cambios);
  return { ok: true, id };
}
