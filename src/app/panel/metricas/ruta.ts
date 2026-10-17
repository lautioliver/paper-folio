import { z } from "zod";
import { CONTACT_TYPES, type ContactType } from "@/lib/contact";
import { RANGOS_DIAS, type RangoDias } from "@/lib/metricas";

export const RUTA_METRICAS = "/panel/metricas";
export const DIAS_POR_DEFECTO: RangoDias = 30;

export type FiltrosMetricas = { dias: RangoDias; tipo?: ContactType };

// `?rango=` solo acepta "7", "30" o "90" tal cual (sin `coerce`: "7.0" o un arreglo no pasan).
const rango = z
  .enum(RANGOS_DIAS.map(String) as [string, ...string[]])
  .transform((r) => Number(r) as RangoDias);
const tipo = z.enum(CONTACT_TYPES);

/** Rango y tipo de la URL. Lo que no sirve cae en el rango por defecto y sin tipo: nada llega crudo a la base. */
export function filtrosDe(entrada: { rango?: unknown; tipo?: unknown }): FiltrosMetricas {
  const dias = rango.catch(DIAS_POR_DEFECTO).parse(entrada.rango);
  const t = tipo.safeParse(entrada.tipo);
  return t.success ? { dias, tipo: t.data } : { dias };
}

/** URL del tablero con el rango y el tipo (lo que está por defecto no va). */
export function rutaMetricas(filtros: Partial<FiltrosMetricas> = {}): string {
  const params = new URLSearchParams();
  if (filtros.dias && filtros.dias !== DIAS_POR_DEFECTO) params.set("rango", String(filtros.dias));
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  const query = params.toString();
  return query ? `${RUTA_METRICAS}?${query}` : RUTA_METRICAS;
}
