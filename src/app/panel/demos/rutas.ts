export const RUTA_DEMOS = "/panel/demos";
export const RUTA_NUEVA_DEMO = `${RUTA_DEMOS}/nueva`;

/** Ruta de edición de una demo. El id va codificado: puede venir de la URL o de un POST armado a mano. */
export function rutaEdicion(id: string): string {
  return `${RUTA_DEMOS}/${encodeURIComponent(id)}`;
}
