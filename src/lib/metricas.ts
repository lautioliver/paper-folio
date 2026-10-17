import { z } from "zod";
import { CONTACT_TYPES, type ContactType } from "./contact";

/** Rangos del filtro del tablero (épica #53, decisión 4). */
export const RANGOS_DIAS = [7, 30, 90] as const;
export type RangoDias = (typeof RANGOS_DIAS)[number];
/** Máximo de días de un rango que aceptan las agregaciones. */
export const MAX_DIAS = 90;

export type Rango = { desde: string; hasta: string };
export type FiltroConsultas = Rango & { tipo?: ContactType };
export type PuntoDia = { fecha: string; total: number };
export type PuntoVisitas = { fecha: string; visitas: number; unicos: number };
export type PuntoAccesos = { fecha: string; ingreso: number; detalle: number };
export type TotalTipo = { tipo: ContactType; total: number };
export type Totales = { consultas: number; registros: number; visitas: number; unicos: number; accesos: number };

export const esquemaRango = z.object({ desde: z.string(), hasta: z.string() });
export const esquemaFiltroConsultas = esquemaRango.extend({ tipo: z.enum(CONTACT_TYPES).optional() });

/** El rango de los últimos `dias` días, terminando hoy (día de Salta). */
export function rangoDe(dias: RangoDias, ahora: Date = new Date()): Rango {
  void dias;
  void ahora;
  return { desde: "", hasta: "" };
}

export async function consultasPorTipo(rango: Rango): Promise<TotalTipo[]> {
  void rango;
  return [];
}

export async function consultasPorDia(filtro: FiltroConsultas): Promise<PuntoDia[]> {
  void filtro;
  return [];
}

export async function registrosPorDia(rango: Rango): Promise<PuntoDia[]> {
  void rango;
  return [];
}

export async function visitasPorDia(rango: Rango): Promise<PuntoVisitas[]> {
  void rango;
  return [];
}

export async function accesosPorDia(rango: Rango): Promise<PuntoAccesos[]> {
  void rango;
  return [];
}

export function totales(datos: {
  porTipo: TotalTipo[];
  registros: PuntoDia[];
  visitas: PuntoVisitas[];
  accesos: PuntoAccesos[];
}): Totales {
  void datos;
  return { consultas: 0, registros: 0, visitas: 0, unicos: 0, accesos: 0 };
}
