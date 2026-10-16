export const RUTA_PROYECTOS = "/proyectos";

/** Ruta del detalle (protegido) de un proyecto. */
export function rutaDetalle(slug: string): string {
  return `${RUTA_PROYECTOS}/${encodeURIComponent(slug)}`;
}

/** Ruta del detalle posicionada en la demo: pasa por el ingreso si no hay sesión. */
export function rutaDemo(slug: string): string {
  return `${rutaDetalle(slug)}#demo`;
}
