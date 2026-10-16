import { mongo } from "mongoose";
import { z } from "zod";
import { Demo } from "@/models/Demo";
import { Proyecto } from "@/models/Proyecto";
import { asegurarIndicesDe, conectar } from "./db";
import { erroresPorCampo, proyectoEntradaEsquema, type ProyectoEntrada } from "./proyecto-entrada";

// Escritura de los proyectos desde el panel (#51). Solo `admin`: el rol lo exigen las server actions
// (`requerirRol`), no este módulo. Toda entrada se valida con `proyectoEntradaEsquema` antes de tocar la base.
// Quien llama invalida la caché del sitio (`updateTag(TAG_CONTENIDO)`): este módulo no importa next/cache.

export type ResultadoProyecto =
  /** `aviso`: se escribió, pero quedó algo para contarle al admin (un borrado a medias). */
  | { ok: true; id?: string; aviso?: string }
  | {
      ok: false;
      error: "invalida" | "no-encontrado" | "desactualizada";
      mensaje: string;
      campos?: Record<string, string>;
    };

export type ProyectoEnLista = {
  id: string;
  slug: string;
  nombre: string;
  orden: number;
  publicado: boolean;
  /** Demos del proyecto (activas o no): se borran con él. */
  demos: number;
};

/** `version` cambia con cada guardado: la `key` del formulario de edición. */
export type ProyectoEditable = ProyectoEntrada & { id: string; version: string };

// Solo el formato hexadecimal de 24: `isValidObjectId` de Mongoose acepta cualquier cadena de 12 caracteres.
const ID_VALIDO = /^[0-9a-f]{24}$/i;
const EN_ORDEN = { orden: 1, _id: 1 } as const;

const NO_ENCONTRADO: ResultadoProyecto = { ok: false, error: "no-encontrado", mensaje: "El proyecto no existe." };
const SLUG_DUPLICADO: ResultadoProyecto = {
  ok: false,
  error: "invalida",
  mensaje: "Revisá los campos marcados.",
  campos: { slug: "Ya hay un proyecto con ese slug." },
};

function esSlugDuplicado(error: unknown): boolean {
  return error instanceof mongo.MongoServerError && error.code === 11000;
}

async function prepararEscritura(): Promise<void> {
  await conectar();
  // El índice único de `slug` es el que frena un duplicado (también entre dos admins a la vez).
  await asegurarIndicesDe(Proyecto);
}

function validar(datos: unknown): { ok: true; datos: ProyectoEntrada } | Extract<ResultadoProyecto, { ok: false }> {
  const r = proyectoEntradaEsquema.safeParse(datos);
  if (r.success) return { ok: true, datos: r.data };
  return { ok: false, error: "invalida", mensaje: "Revisá los campos marcados.", campos: erroresPorCampo(r.error.issues) };
}

/** Todos los proyectos (publicados o no), en orden, con la cantidad de demos de cada uno. */
export async function listarProyectosAdmin(): Promise<ProyectoEnLista[]> {
  await conectar();
  const [docs, conteos] = await Promise.all([
    Proyecto.find({}, { slug: 1, nombre: 1, orden: 1, publicado: 1 }).sort(EN_ORDEN).lean(),
    Demo.aggregate<{ _id: unknown; total: number }>([{ $group: { _id: "$proyecto", total: { $sum: 1 } } }]),
  ]);
  const demos = new Map(conteos.map((c) => [String(c._id), c.total]));
  return docs.map((d) => ({
    id: String(d._id),
    slug: d.slug,
    nombre: d.nombre,
    orden: d.orden ?? 0,
    publicado: d.publicado ?? false,
    demos: demos.get(String(d._id)) ?? 0,
  }));
}

/** Los datos de un proyecto para el formulario de edición, o `null` si el id no es válido o no existe. */
export async function obtenerProyectoAdmin(id: string): Promise<ProyectoEditable | null> {
  if (!ID_VALIDO.test(id)) return null;
  await conectar();
  const d = await Proyecto.findById(id).lean();
  if (!d) return null;
  // `lean()` no aplica defaults: un documento cargado a mano puede no traer las listas.
  return {
    id: String(d._id),
    slug: d.slug,
    nombre: d.nombre,
    inicial: d.inicial,
    categoria: d.categoria,
    descripcion: d.descripcion,
    stack: d.stack ?? [],
    repoUrl: d.repoUrl,
    acento: d.acento,
    caso: {
      problema: d.caso?.problema ?? "",
      solucion: d.caso?.solucion ?? "",
      funcionalidades: d.caso?.funcionalidades ?? [],
      stack: d.caso?.stack ?? [],
    },
    imagen: d.imagen ?? undefined,
    publicado: d.publicado ?? false,
    version: "",
  };
}

/** Crea un proyecto al final del orden. Un slug repetido da error en el campo `slug`. */
export async function crearProyecto(datos: unknown): Promise<ResultadoProyecto> {
  const v = validar(datos);
  if (!v.ok) return v;
  await prepararEscritura();
  const ultimo = await Proyecto.findOne({}, { orden: 1 }).sort({ orden: -1 }).lean();
  try {
    const doc = await Proyecto.create({ ...v.datos, orden: (ultimo?.orden ?? -1) + 1 });
    return { ok: true, id: String(doc._id) };
  } catch (error) {
    if (esSlugDuplicado(error)) return SLUG_DUPLICADO;
    throw error;
  }
}

/** Reemplaza los datos de un proyecto (no su orden). Si no viene `imagen`, se la quita. */
export async function actualizarProyecto(id: string, datos: unknown): Promise<ResultadoProyecto> {
  const v = validar(datos);
  if (!v.ok) return v;
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADO;
  await prepararEscritura();
  const { imagen, ...resto } = v.datos;
  try {
    const r = await Proyecto.updateOne(
      { _id: id },
      imagen === undefined ? { $set: resto, $unset: { imagen: 1 } } : { $set: { ...resto, imagen } },
      { runValidators: true },
    );
    return r.matchedCount === 1 ? { ok: true, id } : NO_ENCONTRADO;
  } catch (error) {
    if (esSlugDuplicado(error)) return SLUG_DUPLICADO;
    throw error;
  }
}

/**
 * Borra el proyecto y todas sus demos (activas o no): una demo sin proyecto no se puede mostrar ni editar.
 * Primero el proyecto: si borrar las demos falla, quedan huérfanas pero invisibles (el sitio las busca por
 * proyecto), nunca un proyecto sin las demos que tenía; devuelve `ok` (se escribió: quien llama invalida el
 * sitio) con un `aviso`. La imagen de Blob no se borra.
 */
export async function borrarProyecto(id: string): Promise<ResultadoProyecto> {
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADO;
  await conectar();
  const r = await Proyecto.deleteOne({ _id: id });
  if (r.deletedCount !== 1) return NO_ENCONTRADO;
  try {
    await Demo.deleteMany({ proyecto: id });
  } catch (error) {
    // Solo el nombre: el mensaje del driver puede traer la URI.
    console.error("proyectos: se borró el proyecto pero no sus demos", error instanceof Error ? error.name : "error");
    return {
      ok: true,
      aviso: "Se borró el proyecto, pero quedaron demos sin borrar (no se ven en el sitio). Avisale a quien mantiene la base.",
    };
  }
  return { ok: true };
}

/** Publica o despublica un proyecto. */
export async function publicarProyecto(id: string, publicado: boolean): Promise<ResultadoProyecto> {
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADO;
  await conectar();
  const r = await Proyecto.updateOne({ _id: id }, { $set: { publicado: publicado === true } });
  return r.matchedCount === 1 ? { ok: true } : NO_ENCONTRADO;
}

const idsEsquema = z.array(z.string().regex(ID_VALIDO)).min(1);

const DESACTUALIZADA: ResultadoProyecto = {
  ok: false,
  error: "desactualizada",
  mensaje: "La lista cambió mientras la ordenabas. Recargá la página y probá de nuevo.",
};

/**
 * Guarda el orden: `ids` son todos los proyectos, cada uno una vez, en el orden nuevo. Si no coincide con
 * los que hay (se creó o se borró uno en el medio), no cambia nada.
 */
export async function reordenar(ids: unknown): Promise<ResultadoProyecto> {
  const r = idsEsquema.safeParse(ids);
  if (!r.success) return DESACTUALIZADA;
  const pedidos = r.data.map((id) => id.toLowerCase());
  await conectar();
  const actuales = new Set((await Proyecto.find({}, { _id: 1 }).lean()).map((d) => String(d._id)));
  const unicos = new Set(pedidos);
  if (unicos.size !== pedidos.length || unicos.size !== actuales.size || pedidos.some((id) => !actuales.has(id))) {
    return DESACTUALIZADA;
  }
  await Proyecto.bulkWrite(
    pedidos.map((id, orden) => ({ updateOne: { filter: { _id: id }, update: { $set: { orden } } } })),
  );
  return { ok: true };
}
