export type PosicionSeccion = { id: string; top: number | null };

/**
 * Sección activa de la página: la que tiene el borde superior más abajo entre las que ya pasaron la línea
 * de referencia. Se decide por la posición, no por el orden de la lista (el del menú no es el de la página).
 * `top` es null si la sección no está en la página (otra ruta): se ignora.
 */
export function seccionActiva(secciones: PosicionSeccion[], linea: number): string | null {
  let activa: string | null = null;
  let mejor = -Infinity;
  for (const { id, top } of secciones) {
    if (top !== null && top <= linea && top >= mejor) {
      activa = id;
      mejor = top;
    }
  }
  return activa;
}
