import { z } from "zod";

// STUB (tests en rojo): la validación real llega con la implementación.

export const LIMITES = {
  slug: 80,
  nombre: 80,
  categoria: 60,
  descripcion: 300,
  caso: 1500,
  item: 40,
  stackMin: 1,
  stackMax: 10,
  listaCaso: 20,
} as const;

export const proyectoEntradaEsquema = z.any();
export type ProyectoEntrada = z.output<typeof proyectoEntradaEsquema>;

export function sugerirSlug(nombre: string): string {
  return nombre;
}

export type ValoresFormulario = Record<string, string | boolean>;

export function datosDeFormulario(formData: FormData): Record<string, unknown> {
  void formData;
  return {};
}

export function erroresPorCampo(issues: readonly { path: readonly PropertyKey[] }[]): Record<string, string> {
  void issues;
  return {};
}
