import { z } from "zod";

export type DatosVisita = { ruta: string; visitanteId: string; userAgent: string; esAdmin: boolean };
export type ResultadoVisita = "contada" | "descartada";

export const esquemaVisita = z.object({ ruta: z.string() });

export function esBot(_userAgent: string): boolean {
  return false;
}

export function normalizarRuta(ruta: string): string {
  return ruta;
}

export function fechaDeVisita(_ahora: Date): string {
  return "";
}

export async function registrarVisita(_datos: DatosVisita, _ahora: Date = new Date()): Promise<ResultadoVisita> {
  return "descartada";
}
