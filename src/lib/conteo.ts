/** Valor entero que muestra un contador animado: va de 0 a `objetivo` según `progreso` (0 a 1). */
export function valorEnProgreso(objetivo: number, progreso: number): number {
  const p = Math.min(1, Math.max(0, progreso));
  return Math.round(objetivo * p);
}
