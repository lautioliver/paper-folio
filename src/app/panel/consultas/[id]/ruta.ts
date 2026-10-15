/** Ruta del detalle de una consulta. El id va codificado: puede venir de la URL o de un POST armado a mano. */
export function rutaDelDetalle(id: string): string {
  return `/panel/consultas/${encodeURIComponent(id)}`;
}
