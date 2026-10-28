export type PosicionSeccion = { id: string; top: number | null };

/**
 * Sección activa de la página: la última (en el orden dado) cuyo borde superior ya pasó la línea de
 * referencia. `top` es null si la sección no está en la página (otra ruta): se ignora.
 */
export function seccionActiva(secciones: PosicionSeccion[], linea: number): string | null {
  let activa: string | null = null;
  for (const { id, top } of secciones) {
    if (top !== null && top <= linea) activa = id;
  }
  return activa;
}
