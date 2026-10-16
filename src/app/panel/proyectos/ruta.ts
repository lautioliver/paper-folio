export const RUTA_PROYECTOS_PANEL = "/panel/proyectos";
export const RUTA_NUEVO_PROYECTO = `${RUTA_PROYECTOS_PANEL}/nuevo`;

/** Ruta de edición de un proyecto. El id va codificado: puede venir de la URL o de un POST armado a mano. */
export function rutaEditarProyecto(id: string): string {
  return `${RUTA_PROYECTOS_PANEL}/${encodeURIComponent(id)}`;
}
