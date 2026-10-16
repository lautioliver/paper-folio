import { z } from "zod";
import { Demo } from "@/models/Demo";
import { Proyecto } from "@/models/Proyecto";
import { esUrlHttp, esUrlHttps } from "./contenido-esquemas";
import { conectar } from "./db";
import { LARGO_DESCRIPCION, LARGO_TITULO, type CampoDemo } from "./demos-campos";

export { LARGO_DESCRIPCION, LARGO_TITULO, type CampoDemo } from "./demos-campos";

// Administración de las demos desde el panel (#50). Solo para admin: el rol lo exigen las páginas y las
// server actions antes de llamar acá. Toda entrada se valida con Zod, y el proyecto tiene que existir.
// Quien llama invalida la caché del sitio (`updateTag(TAG_CONTENIDO)`): este módulo no importa next/cache.
//
// El orden es por proyecto: el detalle muestra las demos activas de un proyecto de menor a mayor `orden`.
// Desde el panel la URL tiene que ser `https` (el modelo acepta también `http`, ADR-003 R-8): así toda demo
// nueva o con la URL cambiada se puede embeber en el iframe del detalle.

/** Una demo como la ve el panel (activa o no). `proyecto`: el id del proyecto. */
export type DemoAdmin = {
  id: string;
  proyecto: string;
  titulo: string;
  url: string;
  descripcion: string;
  activa: boolean;
  orden: number;
};

export type ProyectoDeDemo = { id: string; nombre: string };

/** Las demos de un proyecto, en orden. `proyecto: null`: demos cuyo proyecto ya no existe (huérfanas). */
export type GrupoDemos = { proyecto: ProyectoDeDemo | null; demos: DemoAdmin[] };

export type ResultadoDemo =
  | { ok: true; id: string }
  | {
      ok: false;
      error: "invalido" | "no-encontrado";
      mensaje: string;
      campos?: Partial<Record<CampoDemo, string>>;
    };

/** Lo que manda el formulario. */
export type EntradaDemo = {
  proyecto?: unknown;
  titulo?: unknown;
  url?: unknown;
  descripcion?: unknown;
  activa?: unknown;
};

// Solo el formato hexadecimal de 24: `isValidObjectId` acepta cualquier cadena de 12 caracteres.
const ID_VALIDO = /^[0-9a-f]{24}$/i;
const EN_ORDEN = { orden: 1, _id: 1 } as const;

const NO_ENCONTRADO: ResultadoDemo = { ok: false, error: "no-encontrado", mensaje: "La demo no existe." };
const REVISAR = "Revisá los campos marcados.";
const ELEGI_PROYECTO = "Elegí un proyecto.";
const PROYECTO_INEXISTENTE: ResultadoDemo = {
  ok: false,
  error: "invalido",
  mensaje: REVISAR,
  campos: { proyecto: "Ese proyecto no existe (¿lo borraron?). Elegí otro." },
};

const URL_HTTPS = "Tiene que ser una URL https (por ejemplo, https://demo.com).";

/**
 * `urlActual`: al editar, la URL guardada. Una demo `http` anterior al panel (el modelo la acepta) se puede
 * editar sin cambiarle la URL; cambiarla, solo a una `https`. Lo que no sea `http(s)` (escrito por fuera
 * del modelo) no se conserva nunca.
 */
const esquemaEntrada = (urlActual?: string) =>
  z.object({
    // En minúsculas, como lo guarda Mongo: así se compara bien con el proyecto actual de la demo.
    proyecto: z.string({ error: ELEGI_PROYECTO }).trim().toLowerCase().regex(ID_VALIDO, { error: ELEGI_PROYECTO }),
    titulo: z
      .string()
      .trim()
      .min(1, { error: "Poné un título." })
      .max(LARGO_TITULO, { error: `El título tiene que tener hasta ${LARGO_TITULO} caracteres.` }),
    url: z
      .string()
      .trim()
      .refine((url) => esUrlHttps(url) || (url === urlActual && esUrlHttp(url)), { error: URL_HTTPS }),
    descripcion: z
      .string()
      .trim()
      .max(LARGO_DESCRIPCION, { error: `La descripción tiene que tener hasta ${LARGO_DESCRIPCION} caracteres.` }),
    activa: z.boolean(),
  });

type DatosDemo = z.output<ReturnType<typeof esquemaEntrada>>;
type Rechazo = Extract<ResultadoDemo, { ok: false }>;

const CAMPOS: readonly CampoDemo[] = ["proyecto", "titulo", "url", "descripcion"];

function validarEntrada(entrada: EntradaDemo, urlActual?: string): { ok: true; datos: DatosDemo } | Rechazo {
  const r = esquemaEntrada(urlActual).safeParse(entrada);
  if (r.success) return { ok: true, datos: r.data };
  const campos: Partial<Record<CampoDemo, string>> = {};
  for (const issue of r.error.issues) {
    const destino = CAMPOS.find((c) => c === issue.path[0]);
    if (destino) campos[destino] ??= issue.message;
  }
  // `activa` es un checkbox: si llega mal es un POST armado a mano, sin campo que marcar.
  return { ok: false, error: "invalido", mensaje: REVISAR, campos };
}

type DocLeido = {
  _id: unknown;
  proyecto: unknown;
  titulo: string;
  url: string;
  descripcion?: string | null;
  activa?: boolean | null;
  orden?: number | null;
};

function aAdmin(d: DocLeido): DemoAdmin {
  return {
    id: String(d._id),
    proyecto: String(d.proyecto),
    titulo: d.titulo,
    url: d.url,
    descripcion: d.descripcion ?? "",
    activa: d.activa ?? true,
    orden: d.orden ?? 0,
  };
}

/** El orden que le toca a una demo nueva en el proyecto: después de la última. */
async function siguienteOrden(proyecto: string): Promise<number> {
  const ultima = await Demo.findOne({ proyecto }, { orden: 1 }).sort({ orden: -1 }).lean<{ orden?: number }>();
  return (ultima?.orden ?? -1) + 1;
}

/** Todos los proyectos (publicados o no), en el orden del sitio: las opciones del formulario. */
export async function proyectosParaDemos(): Promise<ProyectoDeDemo[]> {
  await conectar();
  const docs = await Proyecto.find({}, { nombre: 1 }).sort(EN_ORDEN).lean<{ _id: unknown; nombre: string }[]>();
  return docs.map((d) => ({ id: String(d._id), nombre: d.nombre }));
}

/**
 * Todas las demos (activas o no), agrupadas por proyecto en el orden del sitio y, dentro de cada uno, en el
 * orden del detalle. Los proyectos sin demos no aparecen; las demos huérfanas van al final, en un grupo sin
 * proyecto, para poder borrarlas.
 */
export async function listarDemosAdmin(): Promise<GrupoDemos[]> {
  await conectar();
  const [proyectos, docs] = await Promise.all([
    proyectosParaDemos(),
    Demo.find({}).sort(EN_ORDEN).lean<DocLeido[]>(),
  ]);
  const porProyecto = new Map<string, DemoAdmin[]>();
  for (const demo of docs.map(aAdmin)) {
    const lista = porProyecto.get(demo.proyecto) ?? [];
    lista.push(demo);
    porProyecto.set(demo.proyecto, lista);
  }
  const grupos: GrupoDemos[] = proyectos.flatMap((p) => {
    const demos = porProyecto.get(p.id);
    porProyecto.delete(p.id);
    return demos ? [{ proyecto: p, demos }] : [];
  });
  const huerfanas = [...porProyecto.values()].flat();
  if (huerfanas.length > 0) grupos.push({ proyecto: null, demos: huerfanas });
  return grupos;
}

/** Una demo para editarla, o `null` si el id no es válido o no existe. */
export async function obtenerDemoAdmin(id: string): Promise<DemoAdmin | null> {
  if (!ID_VALIDO.test(id)) return null;
  await conectar();
  const doc = await Demo.findById(id).lean<DocLeido>();
  return doc ? aAdmin(doc) : null;
}

/** Crea una demo al final de las de su proyecto. El proyecto tiene que existir. */
export async function crearDemo(entrada: EntradaDemo): Promise<ResultadoDemo> {
  const v = validarEntrada(entrada);
  if (!v.ok) return v;
  await conectar();
  const [existe, orden] = await Promise.all([Proyecto.exists({ _id: v.datos.proyecto }), siguienteOrden(v.datos.proyecto)]);
  if (!existe) return PROYECTO_INEXISTENTE;
  const doc = await new Demo({ ...v.datos, orden }).save();
  return { ok: true, id: String(doc._id) };
}

/**
 * Edita todos los campos. Si cambia de proyecto (que tiene que existir), va al final de las del nuevo; si
 * no, conserva su lugar.
 */
export async function editarDemo(id: string, entrada: EntradaDemo): Promise<ResultadoDemo> {
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADO;
  await conectar();
  const doc = await Demo.findById(id);
  if (!doc) return NO_ENCONTRADO;
  const v = validarEntrada(entrada, doc.url);
  if (!v.ok) return v;
  if (!(await Proyecto.exists({ _id: v.datos.proyecto }))) return PROYECTO_INEXISTENTE;
  const cambiaDeProyecto = String(doc.proyecto) !== v.datos.proyecto;
  doc.set(v.datos);
  if (cambiaDeProyecto) doc.orden = await siguienteOrden(v.datos.proyecto);
  await doc.save();
  return { ok: true, id };
}

export async function borrarDemo(id: string): Promise<ResultadoDemo> {
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADO;
  await conectar();
  const r = await Demo.deleteOne({ _id: id });
  return r.deletedCount === 1 ? { ok: true, id } : NO_ENCONTRADO;
}

/** Activa o desactiva. Una demo inactiva no aparece en el detalle del proyecto. */
export async function activarDemo(id: string, activa: unknown): Promise<ResultadoDemo> {
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADO;
  const valor = z.boolean().safeParse(activa);
  if (!valor.success) return { ok: false, error: "invalido", mensaje: "Valor de activa inválido." };
  await conectar();
  const r = await Demo.updateOne({ _id: id }, { $set: { activa: valor.data } });
  return r.matchedCount === 1 ? { ok: true, id } : NO_ENCONTRADO;
}

const direccionEsquema = z.enum(["subir", "bajar"]);

/**
 * Sube o baja una demo un lugar entre las de su proyecto. Renumera las del proyecto (0, 1, 2…) en el orden
 * resultante: así un orden repetido (todas en 0, por ejemplo) no deja el intercambio sin efecto. En los
 * extremos no hace nada.
 */
export async function moverDemo(id: string, direccion: unknown): Promise<ResultadoDemo> {
  if (!ID_VALIDO.test(id)) return NO_ENCONTRADO;
  const dir = direccionEsquema.safeParse(direccion);
  if (!dir.success) return { ok: false, error: "invalido", mensaje: "Dirección inválida." };
  await conectar();
  const demo = await Demo.findById(id, { proyecto: 1 }).lean();
  if (!demo) return NO_ENCONTRADO;
  const propio = String(demo._id); // en minúsculas: `id` puede venir en mayúsculas
  const docs = await Demo.find({ proyecto: demo.proyecto }, { orden: 1 })
    .sort(EN_ORDEN)
    .lean<{ _id: unknown; orden?: number }[]>();
  const i = docs.findIndex((d) => String(d._id) === propio);
  if (i === -1) return NO_ENCONTRADO;
  const j = dir.data === "subir" ? i - 1 : i + 1;
  if (j < 0 || j >= docs.length) return { ok: true, id };
  [docs[i], docs[j]] = [docs[j], docs[i]];
  const cambios = docs.flatMap((d, orden) =>
    d.orden === orden ? [] : [{ updateOne: { filter: { _id: d._id }, update: { $set: { orden } } } }],
  );
  if (cambios.length > 0) await Demo.bulkWrite(cambios);
  return { ok: true, id };
}
