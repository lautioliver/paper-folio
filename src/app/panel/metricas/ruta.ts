import type { ContactType } from "@/lib/contact";
import type { RangoDias } from "@/lib/metricas";

export const RUTA_METRICAS = "/panel/metricas";
export const DIAS_POR_DEFECTO: RangoDias = 30;

export type FiltrosMetricas = { dias: RangoDias; tipo?: ContactType };

/** Rango y tipo de la URL. Lo que no sirve cae en el rango por defecto y sin tipo. */
export function filtrosDe(entrada: { rango?: unknown; tipo?: unknown }): FiltrosMetricas {
  void entrada;
  return { dias: 7 };
}

/** URL del tablero con el rango y el tipo (lo que está por defecto no va). */
export function rutaMetricas(filtros: Partial<FiltrosMetricas> = {}): string {
  void filtros;
  return "";
}
