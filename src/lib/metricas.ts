import type { PipelineStage } from "mongoose";
import { z } from "zod";
import { AccesoDiario, TIPOS_ACCESO, type TipoAcceso } from "@/models/AccesoDiario";
import { Consulta } from "@/models/Consulta";
import { Usuario } from "@/models/Usuario";
import { VisitaDiaria } from "@/models/VisitaDiaria";
import { VisitanteDiario } from "@/models/VisitanteDiario";
import { CONTACT_TYPES, type ContactType } from "./contact";
import { conectar } from "./db";
import { diasEntre, fechaDeMetrica, inicioDelDia, sumarDias, ZONA_METRICAS } from "./fecha-metricas";

// Lectura de las métricas del tablero (/panel/metricas, épica #53, decisiones 4 y 5). Cada agregación recibe un
// rango de días de Salta (`YYYY-MM-DD`, inclusive) validado con Zod: un objeto con operadores de Mongo, un formato
// raro o un rango de más de `MAX_DIAS` tira antes de tocar la base. Las series devuelven un punto por día del rango,
// con 0 en los días sin datos. Los permisos no se chequean acá: la página llama a `requerirRol(…, "admin")` antes.

/** Rangos del filtro del tablero (épica #53, decisión 4). */
export const RANGOS_DIAS = [7, 30, 90] as const;
export type RangoDias = (typeof RANGOS_DIAS)[number];
/** Máximo de días de un rango que aceptan las agregaciones. */
export const MAX_DIAS = 90;

export type Rango = { desde: string; hasta: string };
export type FiltroConsultas = Rango & { tipo?: ContactType };
export type PuntoDia = { fecha: string; total: number };
export type PuntoVisitas = { fecha: string; visitas: number; unicos: number };
export type PuntoAccesos = { fecha: string } & Record<TipoAcceso, number>;
export type TotalTipo = { tipo: ContactType; total: number };
export type Totales = { consultas: number; registros: number; visitas: number; unicos: number; accesos: number };

// Un día real del calendario: `2026-02-30` no pasa (Date lo correría al 2 de marzo).
const dia = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && sumarDias(d, 0) === d, "No es un día válido.");

const campos = { desde: dia, hasta: dia };
const rangoValido = (r: Rango) => r.desde <= r.hasta && sumarDias(r.desde, MAX_DIAS - 1) >= r.hasta;
const MENSAJE_RANGO = `El rango va de desde a hasta, con ${MAX_DIAS} días como máximo.`;

/** Rango de las agregaciones. `strictObject`: una clave de más (`$where`) también se rechaza. */
export const esquemaRango = z.strictObject(campos).refine(rangoValido, MENSAJE_RANGO);
export const esquemaFiltroConsultas = z
  .strictObject({ ...campos, tipo: z.enum(CONTACT_TYPES).optional() })
  .refine(rangoValido, MENSAJE_RANGO);

/** El rango de los últimos `dias` días, terminando hoy (día de Salta). */
export function rangoDe(dias: RangoDias, ahora: Date = new Date()): Rango {
  const hasta = fechaDeMetrica(ahora);
  return { desde: sumarDias(hasta, -(dias - 1)), hasta };
}

/** `$match` de un campo `Date` por los días de Salta del rango: [inicio de `desde`, inicio del día siguiente a `hasta`). */
function entreFechas(rango: Rango): { $gte: Date; $lt: Date } {
  return { $gte: inicioDelDia(rango.desde), $lt: inicioDelDia(sumarDias(rango.hasta, 1)) };
}

/** Agrupa por el día de Salta de un campo `Date`. */
function porDiaDe(campo: "creadaEn" | "creadoEn"): PipelineStage.Group {
  return {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: `$${campo}`, timezone: ZONA_METRICAS } },
      total: { $sum: 1 },
    },
  };
}

type Grupo<K> = { _id: K; total: number };

/** Un punto por día del rango, con 0 donde la agregación no trajo nada. */
function rellenar(rango: Rango, grupos: Grupo<string>[]): PuntoDia[] {
  const porFecha = new Map(grupos.map((g) => [g._id, g.total]));
  return diasEntre(rango.desde, rango.hasta).map((fecha) => ({ fecha, total: porFecha.get(fecha) ?? 0 }));
}

/** Consultas del rango por tipo, en el orden de `CONTACT_TYPES` y con 0 en los tipos sin consultas (barras). */
export async function consultasPorTipo(entrada: Rango): Promise<TotalTipo[]> {
  const rango = esquemaRango.parse(entrada);
  await conectar();
  // El `$match` por `creadaEn` usa el índice `{ creadaEn: -1, _id: -1 }` de la bandeja.
  const grupos = await Consulta.aggregate<Grupo<ContactType>>([
    { $match: { creadaEn: entreFechas(rango) } },
    { $group: { _id: "$tipo", total: { $sum: 1 } } },
  ]);
  const porTipo = new Map(grupos.map((g) => [g._id, g.total]));
  return CONTACT_TYPES.map((tipo) => ({ tipo, total: porTipo.get(tipo) ?? 0 }));
}

/** Consultas por día del rango, de un tipo o de todos (línea). */
export async function consultasPorDia(entrada: FiltroConsultas): Promise<PuntoDia[]> {
  const { tipo, ...rango } = esquemaFiltroConsultas.parse(entrada);
  await conectar();
  const grupos = await Consulta.aggregate<Grupo<string>>([
    { $match: { creadaEn: entreFechas(rango), ...(tipo ? { tipo } : {}) } },
    porDiaDe("creadaEn"),
  ]);
  return rellenar(rango, grupos);
}

/** Usuarios nuevos (primer ingreso, `creadoEn`) por día del rango (línea). */
export async function registrosPorDia(entrada: Rango): Promise<PuntoDia[]> {
  const rango = esquemaRango.parse(entrada);
  await conectar();
  // Sin índice por `creadoEn` (sumarlo es un cambio de schema): con los usuarios de un portfolio, recorrer alcanza.
  const grupos = await Usuario.aggregate<Grupo<string>>([
    { $match: { creadoEn: entreFechas(rango) } },
    porDiaDe("creadoEn"),
  ]);
  return rellenar(rango, grupos);
}

/**
 * Visitas (todas las rutas sumadas) y visitantes únicos por día del rango (línea doble). `fecha` ya es el día de
 * Salta como texto, así que el `$match` compara strings, con el índice único `{ fecha, … }` de cada colección.
 */
export async function visitasPorDia(entrada: Rango): Promise<PuntoVisitas[]> {
  const rango = esquemaRango.parse(entrada);
  await conectar();
  const match = { $match: { fecha: { $gte: rango.desde, $lte: rango.hasta } } };
  const [visitas, unicos] = await Promise.all([
    VisitaDiaria.aggregate<Grupo<string>>([match, { $group: { _id: "$fecha", total: { $sum: "$total" } } }]),
    VisitanteDiario.aggregate<Grupo<string>>([match, { $group: { _id: "$fecha", total: { $sum: 1 } } }]),
  ]);
  const serieUnicos = rellenar(rango, unicos);
  return rellenar(rango, visitas).map(({ fecha, total }, i) => ({ fecha, visitas: total, unicos: serieUnicos[i].total }));
}

/** Accesos de usuarios registrados por día y tipo del rango (barras apiladas), con el índice `{ fecha, tipo }`. */
export async function accesosPorDia(entrada: Rango): Promise<PuntoAccesos[]> {
  const rango = esquemaRango.parse(entrada);
  await conectar();
  const docs = await AccesoDiario.find(
    { fecha: { $gte: rango.desde, $lte: rango.hasta } },
    { _id: 0, fecha: 1, tipo: 1, total: 1 },
  ).lean<{ fecha: string; tipo: TipoAcceso; total: number }[]>();
  const valor = (fecha: string, tipo: TipoAcceso) =>
    docs.find((d) => d.fecha === fecha && d.tipo === tipo)?.total ?? 0;
  return diasEntre(rango.desde, rango.hasta).map((fecha) => ({
    fecha,
    ...(Object.fromEntries(TIPOS_ACCESO.map((tipo) => [tipo, valor(fecha, tipo)])) as Record<TipoAcceso, number>),
  }));
}

const suma = (valores: number[]) => valores.reduce((a, b) => a + b, 0);

/**
 * Totales del rango para las tarjetas, sumados de las series ya leídas (sin otra consulta). `unicos` es la suma de
 * los únicos de cada día: el hash del visitante cambia por día, así que no hay únicos del rango entero.
 */
export function totales(datos: {
  porTipo: TotalTipo[];
  registros: PuntoDia[];
  visitas: PuntoVisitas[];
  accesos: PuntoAccesos[];
}): Totales {
  return {
    consultas: suma(datos.porTipo.map((t) => t.total)),
    registros: suma(datos.registros.map((p) => p.total)),
    visitas: suma(datos.visitas.map((p) => p.visitas)),
    unicos: suma(datos.visitas.map((p) => p.unicos)),
    accesos: suma(datos.accesos.map((p) => suma(TIPOS_ACCESO.map((t) => p[t])))),
  };
}
