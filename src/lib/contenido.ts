import type { Types } from "mongoose";
import { cacheLife, cacheTag } from "next/cache";
import type { z } from "zod";
import { projects, services } from "@/content/profile";
import { Demo as DemoModelo } from "@/models/Demo";
import { Proyecto as ProyectoModelo } from "@/models/Proyecto";
import { Servicio as ServicioModelo } from "@/models/Servicio";
import {
  demoDesdePerfil,
  demoEsquema,
  proyectoDesdePerfil,
  proyectoEsquema,
  servicioDesdePerfil,
  servicioEsquema,
  SLUG,
  type Demo,
  type Proyecto,
  type Servicio,
} from "./contenido-esquemas";
import { conectar } from "./db";

export type { Demo, Proyecto, Servicio } from "./contenido-esquemas";

/**
 * Tag de caché de todo el contenido (proyectos, demos y servicios). Quien lo edite (el panel, C3 a C5)
 * lo invalida con `updateTag(TAG_CONTENIDO)` en su server action, así el sitio lo muestra en el próximo pedido.
 */
export const TAG_CONTENIDO = "contenido";

// Lectura del contenido con respaldo estático (ADR-003). Las funciones exportadas van con `use cache`:
// la landing y /proyectos siguen prerenderizadas aunque lean de Mongo. Lo leído de la base se cachea por
// horas (y el panel invalida el tag); el respaldo, por minutos, así una base que vuelve se nota enseguida.

type Origen = "base" | "respaldo";
type Leido<T> = { datos: T; origen: Origen };

/** La colección está vacía (no se corrió el seed): se usa el contenido estático, sin avisar. */
const SIN_CONTENIDO = Symbol("sin contenido");

function nombreDe(error: unknown): string {
  return error instanceof Error ? error.name : "error";
}

/**
 * Corre `leer` contra la base. Si la colección está vacía o la base falla, devuelve `respaldo()`.
 * Del error se loguea solo el nombre: el mensaje del driver puede traer la URI.
 */
async function conRespaldo<T>(
  que: string,
  leer: () => Promise<T | typeof SIN_CONTENIDO>,
  respaldo: () => T,
): Promise<Leido<T>> {
  try {
    await conectar();
    const datos = await leer();
    if (datos === SIN_CONTENIDO) return { datos: respaldo(), origen: "respaldo" };
    return { datos, origen: "base" };
  } catch (error) {
    console.warn(`contenido: ${que} sale del respaldo estático (${nombreDe(error)})`);
    return { datos: respaldo(), origen: "respaldo" };
  }
}

/** Valida un documento con su esquema público. Si no se puede mostrar, lo descarta con un aviso. */
function validar<E extends z.ZodType>(que: string, esquema: E, doc: unknown): z.output<E> | null {
  const r = esquema.safeParse(doc);
  if (r.success) return r.data;
  console.warn(`contenido: se descartó un documento inválido de ${que}`);
  return null;
}

function validos<E extends z.ZodType>(que: string, esquema: E, docs: unknown[]): z.output<E>[] {
  return docs.map((doc) => validar(que, esquema, doc)).filter((d): d is z.output<E> => d !== null);
}

const EN_ORDEN = { orden: 1, _id: 1 } as const;
const CAMPOS_DEMO = { titulo: 1, url: 1, descripcion: 1 } as const;

/** Ids (como texto) de los proyectos que tienen al menos una demo activa y válida. */
async function conDemoActiva(ids: Types.ObjectId[]): Promise<Set<string>> {
  const demos = await DemoModelo.find({ proyecto: { $in: ids }, activa: true }, { proyecto: 1, ...CAMPOS_DEMO }).lean();
  return new Set(demos.filter((d) => demoEsquema.safeParse(d).success).map((d) => String(d.proyecto)));
}

function leerProyectos(): Promise<Leido<Proyecto[]>> {
  return conRespaldo(
    "proyectos",
    async () => {
      const docs = await ProyectoModelo.find({ publicado: true }).sort(EN_ORDEN).lean();
      if (docs.length === 0 && !(await ProyectoModelo.exists({}))) return SIN_CONTENIDO;
      const conDemo = await conDemoActiva(docs.map((d) => d._id));
      return docs.flatMap((doc) => {
        const proyecto = validar("proyectos", proyectoEsquema, doc);
        return proyecto ? [{ ...proyecto, tieneDemo: conDemo.has(String(doc._id)) }] : [];
      });
    },
    () => projects.map(proyectoDesdePerfil),
  );
}

export type Detalle = { proyecto: Proyecto; demos: Demo[] };

function perfilDe(slug: string) {
  return projects.find((project) => project.slug === slug);
}

/**
 * El proyecto publicado con ese slug y sus demos activas, en una sola lectura: los dos salen de la base
 * o los dos del respaldo, nunca mezclados. `null` si no está publicado (o no pasa la validación).
 */
function leerDetalle(slug: string): Promise<Leido<Detalle | null>> {
  return conRespaldo(
    "el detalle",
    async () => {
      const doc = await ProyectoModelo.findOne({ slug, publicado: true }).lean();
      if (!doc) return (await ProyectoModelo.exists({})) ? null : SIN_CONTENIDO;
      const proyecto = validar("proyectos", proyectoEsquema, doc);
      if (!proyecto) return null;
      const docsDemos = await DemoModelo.find({ proyecto: doc._id, activa: true }, CAMPOS_DEMO).sort(EN_ORDEN).lean();
      const demos = validos("demos", demoEsquema, docsDemos);
      return { proyecto: { ...proyecto, tieneDemo: demos.length > 0 }, demos };
    },
    () => {
      const project = perfilDe(slug);
      return project ? { proyecto: proyectoDesdePerfil(project), demos: [demoDesdePerfil(project)] } : null;
    },
  );
}

function leerServicios(): Promise<Leido<Servicio[]>> {
  return conRespaldo(
    "servicios",
    async () => {
      const docs = await ServicioModelo.find({ publicado: true }).sort(EN_ORDEN).lean();
      if (docs.length === 0 && !(await ServicioModelo.exists({}))) return SIN_CONTENIDO;
      return validos("servicios", servicioEsquema, docs);
    },
    () => services.map(servicioDesdePerfil),
  );
}

/** Proyectos publicados, en orden. */
export async function listarProyectos(): Promise<Proyecto[]> {
  "use cache";
  cacheTag(TAG_CONTENIDO);
  const { datos, origen } = await leerProyectos();
  if (origen === "base") cacheLife("hours");
  else cacheLife("minutes");
  return datos;
}

/** El proyecto publicado con ese slug y sus demos activas, o `null` (el detalle da 404). */
export async function detalleProyecto(slug: string): Promise<Detalle | null> {
  "use cache";
  cacheTag(TAG_CONTENIDO);
  if (!SLUG.test(slug)) {
    cacheLife("hours");
    return null;
  }
  const { datos, origen } = await leerDetalle(slug);
  if (origen === "base") cacheLife("hours");
  else cacheLife("minutes");
  return datos;
}

/** El proyecto publicado con ese slug, o `null`. */
export async function buscarProyecto(slug: string): Promise<Proyecto | null> {
  return (await detalleProyecto(slug))?.proyecto ?? null;
}

/** Demos activas del proyecto publicado con ese slug, en orden. Vacío si el proyecto no está publicado. */
export async function demosDe(slug: string): Promise<Demo[]> {
  return (await detalleProyecto(slug))?.demos ?? [];
}

/** Servicios publicados, en orden. */
export async function listarServicios(): Promise<Servicio[]> {
  "use cache";
  cacheTag(TAG_CONTENIDO);
  const { datos, origen } = await leerServicios();
  if (origen === "base") cacheLife("hours");
  else cacheLife("minutes");
  return datos;
}

