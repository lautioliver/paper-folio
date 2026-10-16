export const RUTA_SERVICIOS = "/panel/servicios";
export const RUTA_NUEVO_SERVICIO = `${RUTA_SERVICIOS}/nuevo`;

/** Ruta de edición de un servicio. */
export function rutaEdicion(id: string): string {
  return `${RUTA_SERVICIOS}/${encodeURIComponent(id)}`;
}
